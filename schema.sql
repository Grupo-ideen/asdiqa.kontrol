-- Esquema de base de datos para Control de Rendimiento de Obra (Kontrol)

-- Habilitar UUID si no está habilitado
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 0. Tabla de Obras (Proyectos)
CREATE TABLE IF NOT EXISTS obras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT UNIQUE NOT NULL,
    descripcion TEXT,
    tipo TEXT NOT NULL DEFAULT 'metro' CHECK (tipo IN ('metro', 'tarea')),
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- NOTA DE MIGRACIÓN: Si la base de datos ya está creada, ejecutar la siguiente sentencia para actualizarla:
-- ALTER TABLE obras ADD COLUMN IF NOT EXISTS tipo TEXT NOT NULL DEFAULT 'metro' CHECK (tipo IN ('metro', 'tarea'));

-- 1. Tabla de Usuarios y Roles
CREATE TABLE IF NOT EXISTS usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    rol TEXT NOT NULL CHECK (rol IN ('admin', 'jefe_equipo', 'lector')),
    password TEXT NOT NULL DEFAULT '123456',
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 1b. Tabla de Relación Usuarios - Obras (Para Lectores)
CREATE TABLE IF NOT EXISTS usuarios_obras (
    usuario_id UUID REFERENCES usuarios(id) ON DELETE CASCADE,
    obra_id UUID REFERENCES obras(id) ON DELETE CASCADE,
    PRIMARY KEY (usuario_id, obra_id)
);

-- 2. Tabla de Partidas de Presupuesto
CREATE TABLE IF NOT EXISTS partidas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo TEXT NOT NULL,
    descripcion TEXT NOT NULL,
    unidad TEXT NOT NULL, -- m, ud, m2, etc.
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    medicion_contrato NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    rendimiento_objetivo NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- metros/persona/día
    puntos NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (codigo, obra_id)
);

-- 3. Tabla de Brigadas / Equipos
CREATE TABLE IF NOT EXISTS brigadas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    jefe_equipo_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    num_personas_habitual INTEGER NOT NULL DEFAULT 1 CHECK (num_personas_habitual > 0),
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (nombre, obra_id)
);

-- 4. Tabla de Partes de Trabajo (Cabecera diaria)
CREATE TABLE IF NOT EXISTS partes_trabajo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    brigada_id UUID NOT NULL REFERENCES brigadas(id) ON DELETE CASCADE,
    num_personas INTEGER NOT NULL DEFAULT 1 CHECK (num_personas > 0),
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    observaciones TEXT,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    actualizado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabla de Líneas de Partes de Trabajo (Detalle de partidas trabajadas)
CREATE TABLE IF NOT EXISTS partes_lineas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    parte_id UUID NOT NULL REFERENCES partes_trabajo(id) ON DELETE CASCADE,
    partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    metros_ejecutados NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (metros_ejecutados >= 0),
    UNIQUE (parte_id, partida_id)
);

-- 6. Tabla de Gastos
CREATE TABLE IF NOT EXISTS gastos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    fecha DATE NOT NULL DEFAULT CURRENT_DATE,
    categoria TEXT NOT NULL CHECK (categoria IN ('Material', 'Trabajador', 'Opcional', 'Varios')),
    concepto TEXT NOT NULL,
    importe NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (importe >= 0),
    tipo_coste TEXT NOT NULL DEFAULT 'unico' CHECK (tipo_coste IN ('unico', 'mensual', 'diario')),
    brigada_id UUID NOT NULL REFERENCES brigadas(id) ON DELETE CASCADE,
    partida_id UUID REFERENCES partidas(id) ON DELETE SET NULL,
    proveedor TEXT,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    creado_por UUID REFERENCES usuarios(id) ON DELETE SET NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. Tabla de Configuración (Una por obra)
CREATE TABLE IF NOT EXISTS config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    obra_id UUID UNIQUE NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    rendimiento_default NUMERIC(12, 2) NOT NULL DEFAULT 100.00,
    umbral_verde NUMERIC(5, 2) NOT NULL DEFAULT 100.00, -- porcentaje mínimo de rendimiento (ej: 100%)
    umbral_azul NUMERIC(5, 2) NOT NULL DEFAULT 110.00, -- porcentaje para superación (ej: 110%)
    margen_minimo NUMERIC(12, 2) NOT NULL DEFAULT 0.00, -- margen en euros
    puntos_objetivo_dia NUMERIC(12, 2) NOT NULL DEFAULT 27.00
);

-- Crear índices para optimizar búsquedas frecuentes
CREATE INDEX IF NOT EXISTS idx_partes_fecha ON partes_trabajo(fecha);
CREATE INDEX IF NOT EXISTS idx_partes_brigada ON partes_trabajo(brigada_id);
CREATE INDEX IF NOT EXISTS idx_partes_obra ON partes_trabajo(obra_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON gastos(fecha);
CREATE INDEX IF NOT EXISTS idx_gastos_brigada ON gastos(brigada_id);
CREATE INDEX IF NOT EXISTS idx_gastos_obra ON gastos(obra_id);
CREATE INDEX IF NOT EXISTS idx_partidas_codigo ON partidas(codigo);
CREATE INDEX IF NOT EXISTS idx_partidas_obra ON partidas(obra_id);

-- 8. Tabla de Recursos (Trabajadores y Maquinaria con costes mensuales automáticos)
CREATE TABLE IF NOT EXISTS recursos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre TEXT NOT NULL,
    tipo TEXT NOT NULL CHECK (tipo IN ('trabajador', 'maquinaria', 'alojamiento', 'otros')),
    sueldo NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (sueldo >= 0),
    seguridad_social NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (seguridad_social >= 0),
    alojamiento NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (alojamiento >= 0),
    otros_costes NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (otros_costes >= 0),
    brigada_id UUID REFERENCES brigadas(id) ON DELETE SET NULL,
    obra_id UUID NOT NULL REFERENCES obras(id) ON DELETE CASCADE,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_recursos_brigada ON recursos(brigada_id);
CREATE INDEX IF NOT EXISTS idx_recursos_obra ON recursos(obra_id);

