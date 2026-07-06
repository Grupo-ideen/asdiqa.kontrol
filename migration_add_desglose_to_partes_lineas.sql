-- Migración para añadir el campo desglose a la tabla partes_lineas
ALTER TABLE partes_lineas ADD COLUMN IF NOT EXISTS desglose TEXT;
