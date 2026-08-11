-- Sincronización de esquema: TODAS las migraciones de esta tanda de cambios, en un solo script.
--
-- Es seguro y aditivo: solo añade columnas/tablas nuevas (con valor por defecto) y amplía la
-- precisión de los puntos. NO borra ni modifica ningún dato existente. Es idempotente: se puede
-- ejecutar varias veces sin efecto ni error (las que ya estén aplicadas se omiten).
--
-- Probado sobre una base con datos: partidas, config y gastos quedan idénticos.

-- 1. Coste directo por tarea (obras por puntos)
ALTER TABLE partidas ADD COLUMN IF NOT EXISTS coste_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00
  CHECK (coste_unitario >= 0);

-- 2. Puntos con hasta 4 decimales (amplía escala; conserva los valores, 2,55 -> 2,5500)
ALTER TABLE partidas ALTER COLUMN puntos TYPE NUMERIC(12, 4);
ALTER TABLE config ALTER COLUMN puntos_objetivo_dia TYPE NUMERIC(12, 4);

-- 3. Fin de vigencia en gastos periódicos
ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_fin DATE;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'gastos_fecha_fin_coherente') THEN
    ALTER TABLE gastos ADD CONSTRAINT gastos_fecha_fin_coherente
      CHECK (fecha_fin IS NULL OR fecha_fin >= fecha);
  END IF;
END $$;

-- 4. Presupuesto de puntos por obra (cable / obra civil)
ALTER TABLE config ADD COLUMN IF NOT EXISTS puntos_totales_cable NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;
ALTER TABLE config ADD COLUMN IF NOT EXISTS puntos_totales_obra_civil NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;

-- 5. Historial de precios de partida por fecha (obras por metro)
CREATE TABLE IF NOT EXISTS partida_precios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_unitario >= 0),
    fecha_desde DATE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (partida_id, fecha_desde)
);
CREATE INDEX IF NOT EXISTS idx_partida_precios_partida ON partida_precios(partida_id);
