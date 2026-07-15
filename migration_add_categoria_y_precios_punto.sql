-- Migración: clasificación de tareas (cable / obra civil) y precios por punto diferenciados
-- Obras por tarea: cada tarea se clasifica como 'cable' u 'obra_civil' y cada categoría
-- tiene su propio precio por punto configurable junto a los umbrales.

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS categoria TEXT NOT NULL DEFAULT 'cable'
  CHECK (categoria IN ('cable', 'obra_civil'));

ALTER TABLE config ADD COLUMN IF NOT EXISTS precio_punto_cable NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE config ADD COLUMN IF NOT EXISTS precio_punto_obra_civil NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- Compatibilidad: heredar el precio_punto legacy para las configuraciones existentes.
UPDATE config SET precio_punto_cable = precio_punto WHERE precio_punto_cable = 0.00 AND precio_punto <> 0.00;
UPDATE config SET precio_punto_obra_civil = precio_punto WHERE precio_punto_obra_civil = 0.00 AND precio_punto <> 0.00;
