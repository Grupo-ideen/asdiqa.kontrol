-- Script de migración para agregar las columnas necesarias a la base de datos existente.
-- Ejecuta este script en la consola SQL de Supabase o en tu cliente PostgreSQL para actualizar el esquema.

-- 1. Agregar columna 'tipo' a la tabla 'obras'
ALTER TABLE obras 
ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'metro' CHECK (tipo IN ('metro', 'tarea'));

-- 2. Agregar columna 'puntos' a la tabla 'partidas'
ALTER TABLE partidas 
ADD COLUMN IF NOT EXISTS puntos NUMERIC(12, 2) NOT NULL DEFAULT 0.00;

-- 3. Agregar columna 'puntos_objetivo_dia' a la tabla 'config'
ALTER TABLE config 
ADD COLUMN IF NOT EXISTS puntos_objetivo_dia NUMERIC(12, 2) NOT NULL DEFAULT 10.00;
