-- Migración: permitir hasta 4 decimales en los puntos
-- Las columnas de puntos eran NUMERIC(12, 2), por lo que Postgres redondeaba a 2 decimales
-- al guardar: una tarea de 2,5555 puntos se almacenaba como 2,56. Al ampliar la escala a 4
-- decimales el valor introducido se conserva tal cual.
--
-- Ampliar la escala no pierde datos: los valores existentes se rellenan con ceros a la
-- derecha (2,56 pasa a ser 2,5600) y su importe no cambia. Lo ya redondeado por la escala
-- anterior no se recupera: una tarea guardada como 2,56 sigue siendo 2,56 y hay que volver
-- a introducir su valor exacto si se quiere el detalle de 4 decimales.
--
-- Aviso: cambiar la escala de un NUMERIC reescribe la tabla y toma un ACCESS EXCLUSIVE lock
-- (Postgres no puede optimizarlo, porque cada dato cambia de representación). En estas dos
-- tablas es cuestión de milisegundos, pero conviene ejecutarlo fuera de hora punta.
--
-- Los precios (€/punto, coste por tarea, importes) se mantienen en 2 decimales: son dinero.

ALTER TABLE partidas ALTER COLUMN puntos TYPE NUMERIC(12, 4);
ALTER TABLE config ALTER COLUMN puntos_objetivo_dia TYPE NUMERIC(12, 4);
