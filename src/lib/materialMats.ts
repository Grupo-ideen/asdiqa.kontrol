// Material gastado en los partes de Asdiqa Mats, que llega aquí como gastos de solo lectura.

import { Gasto, ParteTrabajo } from './types';

/** Separador con el que Mats compone el concepto: "CÓDIGO · descripción · cantidad unidad". */
const SEPARADOR_CONCEPTO = ' · ';

export interface MaterialGastado {
  gasto: Gasto;
  codigo: string | null;
  descripcion: string;
  cantidad: string | null;
}

/** Un día de material de una brigada: los gastos de Mats que comparten fecha y brigada. */
export interface DiaMaterial {
  clave: string;
  fecha: string;
  brigadaId: string;
  brigadaNombre: string;
  materiales: MaterialGastado[];
  total: number;
}

export function esMaterialDeMats(g: Gasto): boolean {
  return g.origen === 'mats';
}

/**
 * Separa el concepto que compone Mats en sus tres partes. Si no tiene esa forma (p. ej. un
 * concepto antiguo), se muestra entero como descripción.
 */
export function desglosarMaterial(gasto: Gasto): MaterialGastado {
  const partes = gasto.concepto.split(SEPARADOR_CONCEPTO);
  if (partes.length < 3) {
    return { gasto, codigo: null, descripcion: gasto.concepto, cantidad: null };
  }
  return {
    gasto,
    codigo: partes[0],
    descripcion: partes.slice(1, -1).join(SEPARADOR_CONCEPTO),
    cantidad: partes[partes.length - 1]
  };
}

/**
 * Material de Mats imputado a un parte: los gastos de su fecha y su brigada, con el mismo
 * criterio con el que `calculateParteMetrics` los suma al coste del parte.
 */
export function materialDelParte(parte: ParteTrabajo, gastos: Gasto[]): MaterialGastado[] {
  return gastos
    .filter(g => esMaterialDeMats(g) && g.fecha === parte.fecha && g.brigada_id === parte.brigada_id)
    .map(desglosarMaterial);
}

/** Agrupa los gastos de Mats por día y brigada, conservando el orden en que llegan. */
export function agruparMaterialPorDia(gastos: Gasto[]): DiaMaterial[] {
  const dias = new Map<string, DiaMaterial>();
  for (const gasto of gastos.filter(esMaterialDeMats)) {
    const clave = `${gasto.fecha}:${gasto.brigada_id}`;
    const dia = dias.get(clave) ?? {
      clave,
      fecha: gasto.fecha,
      brigadaId: gasto.brigada_id,
      brigadaNombre: gasto.brigada_nombre ?? 'Desconocida',
      materiales: [],
      total: 0
    };
    dia.materiales.push(desglosarMaterial(gasto));
    dia.total += gasto.importe;
    dias.set(clave, dia);
  }
  return [...dias.values()];
}

export function formatEuros(importe: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(importe);
}
