-- Material y operarios que llegan de Asdiqa Mats (2026-11-26).
--
-- Requiere migration_mats_partes.sql. Cuando la oficina valida partes en Mats, el día de la
-- brigada llega ahora también con:
--   · el material gastado, como gastos de categoría 'Material' y tipo 'unico' de ese día y esa
--     brigada (uno por material, al precio con el que se validó). Kontrol ya suma esos gastos al
--     parte del día, así que su margen sale con el material sin tocar los cálculos.
--   · los operarios que fueron, que pone la oficina al validar (si no los hay, el habitual).
-- Esos gastos llevan origen = 'mats' y son de solo lectura aquí: se corrigen en Mats.
--
-- Es aditivo e idempotente: añade dos columnas con valor por defecto y sustituye la función
-- mats_guardar_parte. No borra ni modifica ningún dato existente. Se puede ejecutar varias veces.

-- 1. De dónde viene el gasto y, si viene de Mats, la clave de su día (actuación:brigada:fecha).
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'kontrol';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_origen_valido'
  ) THEN
    ALTER TABLE gastos
      ADD CONSTRAINT gastos_origen_valido CHECK (origen IN ('kontrol', 'mats'));
  END IF;
END $$;

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS mats_clave TEXT;
CREATE INDEX IF NOT EXISTS idx_gastos_mats_clave ON gastos (mats_clave);

-- 2. Guarda el día de una brigada en una sola transacción: sus gastos de material sustituidos,
--    y la cabecera del parte por mats_clave con sus líneas sustituidas. Sin líneas no hay parte
--    (un día con solo material deja sus gastos); sin líneas ni gastos, el día desaparece.
--
--    p = {
--      "clave": "<actuacionId>:<brigadaId>:<fecha>",
--      "fecha": "2026-11-25",
--      "obra_id": "<uuid de la obra>",
--      "brigada_id": "<uuid de la brigada de esa obra>",
--      "observaciones": "texto o null",
--      "num_personas": 3,              -- o null: el habitual de la brigada
--      "lineas": [{ "partida_id": "<uuid de una partida de esa obra>", "cantidad": "12.5" }],
--      "gastos": [{ "concepto": "CAB16 · Cable FO 16f · 120 m", "importe": "40.00" }]
--    }
CREATE OR REPLACE FUNCTION mats_guardar_parte(p jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_clave TEXT := p->>'clave';
  v_obra UUID := (p->>'obra_id')::uuid;
  v_brigada UUID := (p->>'brigada_id')::uuid;
  v_fecha DATE := (p->>'fecha')::date;
  v_lineas JSONB := COALESCE(p->'lineas', '[]'::jsonb);
  v_gastos JSONB := COALESCE(p->'gastos', '[]'::jsonb);
  v_personas INTEGER := (p->>'num_personas')::integer;
  v_habitual INTEGER;
  v_ajenas INTEGER;
  v_parte UUID;
BEGIN
  IF v_clave IS NULL OR v_clave = '' THEN
    RAISE EXCEPTION 'Falta la clave del parte de Mats';
  END IF;

  DELETE FROM gastos WHERE mats_clave = v_clave;

  IF jsonb_array_length(v_lineas) = 0 AND jsonb_array_length(v_gastos) = 0 THEN
    DELETE FROM partes_trabajo WHERE mats_clave = v_clave;
    RETURN NULL;
  END IF;

  SELECT num_personas_habitual INTO v_habitual
  FROM brigadas WHERE id = v_brigada AND obra_id = v_obra;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La brigada % no es de la obra %', v_brigada, v_obra;
  END IF;
  IF v_personas IS NOT NULL AND v_personas <= 0 THEN
    RAISE EXCEPTION 'El nº de operarios debe ser mayor que 0';
  END IF;

  INSERT INTO gastos (fecha, categoria, concepto, importe, tipo_coste, brigada_id, obra_id, origen, mats_clave)
  SELECT v_fecha, 'Material', g->>'concepto', (g->>'importe')::numeric, 'unico', v_brigada, v_obra, 'mats', v_clave
  FROM jsonb_array_elements(v_gastos) AS g;

  IF jsonb_array_length(v_lineas) = 0 THEN
    DELETE FROM partes_trabajo WHERE mats_clave = v_clave;
    RETURN NULL;
  END IF;

  SELECT count(*) INTO v_ajenas
  FROM jsonb_array_elements(v_lineas) AS l
  WHERE NOT EXISTS (
    SELECT 1 FROM partidas pa WHERE pa.id = (l->>'partida_id')::uuid AND pa.obra_id = v_obra
  );
  IF v_ajenas > 0 THEN
    RAISE EXCEPTION 'Hay % partida(s) que no son de la obra %', v_ajenas, v_obra;
  END IF;

  INSERT INTO partes_trabajo (fecha, brigada_id, num_personas, observaciones, obra_id, origen, mats_clave)
  VALUES (v_fecha, v_brigada, COALESCE(v_personas, v_habitual), p->>'observaciones', v_obra, 'mats', v_clave)
  ON CONFLICT (mats_clave) DO UPDATE SET
    fecha = EXCLUDED.fecha,
    brigada_id = EXCLUDED.brigada_id,
    num_personas = EXCLUDED.num_personas,
    observaciones = EXCLUDED.observaciones,
    obra_id = EXCLUDED.obra_id,
    actualizado_en = CURRENT_TIMESTAMP
  RETURNING id INTO v_parte;

  DELETE FROM partes_lineas WHERE parte_id = v_parte;
  INSERT INTO partes_lineas (parte_id, partida_id, metros_ejecutados)
  SELECT v_parte, (l->>'partida_id')::uuid, (l->>'cantidad')::numeric
  FROM jsonb_array_elements(v_lineas) AS l;

  RETURN v_parte;
END;
$$;

-- 3. Solo el servidor de Mats (clave service_role) puede llamarla; la clave pública de la web no.
REVOKE ALL ON FUNCTION mats_guardar_parte(jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION mats_guardar_parte(jsonb) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION mats_guardar_parte(jsonb) TO service_role;
