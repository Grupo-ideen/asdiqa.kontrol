-- Partes que llegan de Asdiqa Mats (2026-11-25).
--
-- Cuando la oficina valida un parte en Mats, Mats crea o actualiza aquí el parte de ese día de la
-- brigada (uno por brigada y día, con la suma de todos sus partes validados). Esos partes llevan
-- origen = 'mats' y en Kontrol son de solo lectura: se corrigen en Mats y se reenvían solos.
--
-- Es aditivo e idempotente: añade dos columnas con valor por defecto y una función. No borra ni
-- modifica ningún dato existente. Se puede ejecutar varias veces.

-- 1. De dónde viene el parte y, si viene de Mats, su clave (actuación:brigada:fecha en Mats).
ALTER TABLE partes_trabajo ADD COLUMN IF NOT EXISTS origen TEXT NOT NULL DEFAULT 'kontrol';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partes_trabajo_origen_valido'
  ) THEN
    ALTER TABLE partes_trabajo
      ADD CONSTRAINT partes_trabajo_origen_valido CHECK (origen IN ('kontrol', 'mats'));
  END IF;
END $$;

ALTER TABLE partes_trabajo ADD COLUMN IF NOT EXISTS mats_clave TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS partes_trabajo_mats_clave_key ON partes_trabajo (mats_clave);

-- 2. Guarda el parte del día de una brigada en una sola transacción: cabecera por mats_clave y
--    sus líneas sustituidas. Sin líneas, borra el parte (en Mats ya no queda nada validado ese día).
--
--    p = {
--      "clave": "<actuacionId>:<brigadaId>:<fecha>",
--      "fecha": "2026-11-25",
--      "obra_id": "<uuid de la obra>",
--      "brigada_id": "<uuid de la brigada de esa obra>",
--      "observaciones": "texto o null",
--      "lineas": [{ "partida_id": "<uuid de una partida de esa obra>", "cantidad": 12.5 }]
--    }
--
--    El nº de personas es el habitual de la brigada al crear el parte.
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
  v_personas INTEGER;
  v_ajenas INTEGER;
  v_parte UUID;
BEGIN
  IF v_clave IS NULL OR v_clave = '' THEN
    RAISE EXCEPTION 'Falta la clave del parte de Mats';
  END IF;

  IF jsonb_array_length(v_lineas) = 0 THEN
    DELETE FROM partes_trabajo WHERE mats_clave = v_clave;
    RETURN NULL;
  END IF;

  SELECT num_personas_habitual INTO v_personas
  FROM brigadas WHERE id = v_brigada AND obra_id = v_obra;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'La brigada % no es de la obra %', v_brigada, v_obra;
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
  VALUES (v_fecha, v_brigada, v_personas, p->>'observaciones', v_obra, 'mats', v_clave)
  ON CONFLICT (mats_clave) DO UPDATE SET
    fecha = EXCLUDED.fecha,
    brigada_id = EXCLUDED.brigada_id,
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
