// Formato y precisión de los puntos de las obras por tarea.

/**
 * Decimales admitidos en los puntos de una tarea.
 *
 * Debe coincidir con la precisión de `partidas.puntos` y `config.puntos_objetivo_dia`
 * en base de datos (NUMERIC(12, 4)): si aquí se admiten más decimales de los que
 * almacena Postgres, el valor guardado no coincidiría con el introducido.
 */
export const PUNTOS_DECIMALES = 4;

/**
 * Redondea unos puntos a la precisión admitida.
 *
 * Se aplica al guardar para que el valor persistido sea el mismo con Supabase (que
 * redondea al tipo NUMERIC de la columna) y con el modo local de localStorage (que
 * guardaría el número tal cual).
 */
export function roundPuntos(valor: number): number {
  if (!Number.isFinite(valor)) return 0;
  return Number(valor.toFixed(PUNTOS_DECIMALES));
}

/**
 * Formatea unos puntos para mostrarlos, sin ceros de relleno a la derecha:
 * 5 → "5", 2.5 → "2,5", 0.0625 → "0,0625".
 */
export function formatPuntos(valor: number): string {
  return valor.toLocaleString('es-ES', {
    minimumFractionDigits: 0,
    maximumFractionDigits: PUNTOS_DECIMALES
  });
}
