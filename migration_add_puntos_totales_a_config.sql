-- Migración: presupuesto de puntos por categoría en obras por tarea
--
-- Cada obra por tarea puede definir cuántos puntos vale en total, separados por categoría
-- (cable y obra civil). Con ese presupuesto el dashboard muestra el avance de la obra:
-- puntos conseguidos frente al total, porcentaje cumplido y dinero ganado (puntos × precio
-- por punto). El valor por defecto 0 significa "sin presupuesto definido".
--
-- Columnas NULLABLE? No: NOT NULL con DEFAULT 0. En Postgres añadir una columna NOT NULL con
-- un DEFAULT constante no reescribe la tabla (usa el default en el catálogo), así que es
-- seguro en caliente. Precisión 4 decimales para casar con la de los puntos.

ALTER TABLE config ADD COLUMN IF NOT EXISTS puntos_totales_cable NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;
ALTER TABLE config ADD COLUMN IF NOT EXISTS puntos_totales_obra_civil NUMERIC(12, 4) NOT NULL DEFAULT 0.0000;
