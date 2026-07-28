-- Migración: fin de vigencia y prorrateo real de los gastos periódicos
--
-- Hasta ahora un gasto mensual (p. ej. el sueldo de 3000 €/mes de un encargado) se imputaba
-- indefinidamente en todos los meses siguientes, dividido entre 20 días fijos. No había forma
-- de decir cuándo dejaba de aplicarse, así que un trabajador que estuvo medio mes seguía
-- generando gasto para siempre.
--
-- Con `fecha_fin` el gasto solo se imputa dentro de [fecha, fecha_fin]. Los gastos mensuales
-- se prorratean por días naturales activos en cada mes (importe × días activos / días del mes),
-- de modo que "medio mes = medio sueldo". Si `fecha_fin` es NULL el gasto sigue en curso, que
-- es el comportamiento anterior y el valor por defecto: la columna es NULLABLE, así que los
-- gastos existentes no cambian de importe.
--
-- Añadir una columna NULLABLE sin default no reescribe la tabla (Postgres solo actualiza el
-- catálogo), por lo que es seguro en caliente.

ALTER TABLE gastos ADD COLUMN IF NOT EXISTS fecha_fin DATE;

-- La fecha fin, si existe, no puede ser anterior al inicio.
-- Guarda de idempotencia: ADD CONSTRAINT falla si ya existe, así que solo se crea una vez.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'gastos_fecha_fin_coherente'
  ) THEN
    ALTER TABLE gastos ADD CONSTRAINT gastos_fecha_fin_coherente
      CHECK (fecha_fin IS NULL OR fecha_fin >= fecha);
  END IF;
END $$;
