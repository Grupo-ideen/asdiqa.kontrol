-- Migración: coste directo por tarea en obras por puntos
-- Obras por tarea: cada tarea puede tener, opcionalmente, un coste en euros que se imputa
-- como gasto cada vez que la tarea se realiza. El coste se multiplica por la cantidad
-- ejecutada, igual que los puntos. Ejemplo: una tarea de 5 pts a 20 €/pt con coste 50 €
-- realizada 3 veces genera 300 € de ingresos y 150 € de gastos.
-- El valor por defecto 0.00 mantiene el comportamiento actual: sin coste de tarea.

ALTER TABLE partidas ADD COLUMN IF NOT EXISTS coste_unitario NUMERIC(12, 2) NOT NULL DEFAULT 0.00
  CHECK (coste_unitario >= 0);
