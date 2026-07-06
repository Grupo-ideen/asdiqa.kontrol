-- Migración para añadir el campo precio_punto a la tabla de configuración
ALTER TABLE config ADD COLUMN IF NOT EXISTS precio_punto NUMERIC(12, 2) NOT NULL DEFAULT 0.00;
