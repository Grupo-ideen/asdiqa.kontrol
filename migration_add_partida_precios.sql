-- Migración: historial de precios por fecha en las partidas (obras por metro)
--
-- Permite cambiar el precio unitario de una partida a partir de una fecha sin alterar los
-- partes ya registrados en días anteriores. Cada parte calcula sus ingresos con el precio
-- vigente en su fecha: el `precio_unitario` de la partida rige desde el inicio, y cada fila de
-- partida_precios lo sustituye a partir de su `fecha_desde`.
--
-- Es una tabla nueva y aditiva: no toca ninguna columna ni dato existente. Sin filas de
-- historial, el comportamiento es idéntico al actual (se usa siempre el precio de la partida).

CREATE TABLE IF NOT EXISTS partida_precios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partida_id UUID NOT NULL REFERENCES partidas(id) ON DELETE CASCADE,
    precio_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (precio_unitario >= 0),
    fecha_desde DATE NOT NULL,
    creado_en TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (partida_id, fecha_desde) -- un único precio por fecha de inicio
);

CREATE INDEX IF NOT EXISTS idx_partida_precios_partida ON partida_precios(partida_id);
