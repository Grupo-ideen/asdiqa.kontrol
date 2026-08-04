import { ParteTrabajo, ParteLinea, Gasto, AppConfig, Recurso, CategoriaTarea } from './types';

/**
 * Resuelve el precio por punto aplicable a una tarea según su categoría (cable u obra civil).
 * Si la categoría no tiene precio propio configurado, cae al precio_punto legacy y, en su
 * defecto, a 0. Esto mantiene la compatibilidad con obras creadas antes de la clasificación.
 */
export function precioPuntoCategoria(config: AppConfig, categoria?: CategoriaTarea): number {
  const legacy = config.precio_punto ?? 0;
  if (categoria === 'obra_civil') {
    return config.precio_punto_obra_civil ?? legacy;
  }
  // 'cable' o sin clasificar se tratan como cable por defecto
  return config.precio_punto_cable ?? legacy;
}

/** Totales económicos de una línea de parte en obras por tarea. */
export interface TareaLineaTotals {
  /** Puntos conseguidos por la línea (cantidad × puntos de la tarea). */
  puntos: number;
  /** Ingreso generado (puntos × precio por punto de su categoría). */
  revenue: number;
  /** Coste directo imputado (cantidad × coste de la tarea). */
  coste: number;
}

/**
 * Calcula puntos, ingreso y coste directo de una línea en obras por tarea, donde
 * `metros_ejecutados` almacena la cantidad de tareas realizadas.
 *
 * El coste de tarea es opcional: las tareas sin coste configurado imputan 0 y el margen
 * se comporta como antes de introducir el coste directo.
 */
export function tareaLineaTotals(linea: ParteLinea, config: AppConfig): TareaLineaTotals {
  const cantidad = linea.metros_ejecutados;
  // Compatibilidad: las tareas anteriores a la columna `puntos` guardaban sus puntos en `precio_unitario`.
  const puntosPorTarea = linea.partida_puntos || linea.partida_precio_unitario || 0;
  const puntos = cantidad * puntosPorTarea;

  return {
    puntos,
    revenue: puntos * precioPuntoCategoria(config, linea.partida_categoria),
    coste: cantidad * (linea.partida_coste_unitario ?? 0)
  };
}

// ==========================================
// PRORRATEO DE GASTOS PERIÓDICOS
// ==========================================

/** Número de días naturales del mes indicado (formato 'YYYY-MM'). */
function diasDelMes(yyyyMm: string): number {
  const [y, m] = yyyyMm.split('-').map(Number);
  // El día 0 del mes siguiente es el último día de este mes.
  return new Date(y, m, 0).getDate();
}

/** Día de la semana (0=domingo … 6=sábado) de una fecha 'YYYY-MM-DD', sin sesgo de zona horaria. */
function diaSemana(fecha: string): number {
  const [y, m, d] = fecha.split('-').map(Number);
  return new Date(y, m - 1, d).getDay();
}

/** ¿Es día laborable (lunes a viernes)? */
function esLaborable(fecha: string): boolean {
  const dow = diaSemana(fecha);
  return dow >= 1 && dow <= 5;
}

/** Número de días laborables (L-V) del mes indicado (formato 'YYYY-MM'). */
function diasLaborablesDelMes(yyyyMm: string): number {
  let laborables = 0;
  for (let d = 1; d <= diasDelMes(yyyyMm); d++) {
    if (esLaborable(`${yyyyMm}-${String(d).padStart(2, '0')}`)) laborables++;
  }
  return laborables;
}

/**
 * ¿La fecha ('YYYY-MM-DD') cae dentro de la ventana de vigencia del gasto?
 * Un gasto sin `fecha_fin` se considera en curso (vigente desde su fecha en adelante).
 */
function gastoVigente(g: Gasto, fecha: string): boolean {
  if (fecha < g.fecha) return false;
  if (g.fecha_fin && fecha > g.fecha_fin) return false;
  return true;
}

/**
 * Coste de un gasto mensual imputado a un parte concreto, mediante una tasa diaria estable.
 *
 * La tasa es fija para el mes: importe / días laborables (L-V) del mes. Cada parte laborable
 * dentro de la vigencia [fecha, fecha_fin] recibe esa tasa; los fines de semana no imputan
 * sueldo. Así un mes laborable completo suma el importe íntegro, media vigencia imputa la
 * mitad, y —a diferencia de repartir entre los partes ya registrados— el valor diario NO
 * depende de cuántos partes existan: es idéntico el día 1 que el día 20, sin disparos al
 * cambiar de mes.
 */
export function costeMensualGastoEnParte(g: Gasto, parte: ParteTrabajo): number {
  if (!gastoVigente(g, parte.fecha)) return 0;
  if (!esLaborable(parte.fecha)) return 0;
  const laborables = diasLaborablesDelMes(parte.fecha.substring(0, 7));
  if (laborables === 0) return 0;
  return g.importe / laborables;
}

export interface PerformanceMetrics {
  revenue: number;
  /** Coste directo de las tareas ejecutadas. Siempre 0 en obras por metro. */
  taskExpenses: number;
  /** Gastos manuales imputados + prorrateo de los recursos de la brigada. */
  imputedExpenses: number;
  /** Gasto total del parte: taskExpenses + imputedExpenses. */
  expenses: number;
  margin: number;
  compliancePct: number;
  status: 'rojo' | 'verde' | 'azul';
  statusLabel: string;
}

/**
 * Calcula las métricas de rendimiento para un Parte de Trabajo individual, imputando también los costes diarios de recursos asignados.
 */
export function calculateParteMetrics(
  parte: ParteTrabajo,
  gastos: Gasto[],
  config: AppConfig,
  recursos: Recurso[],
  tipoObra?: 'metro' | 'tarea'
): PerformanceMetrics {
  const umbralVerde = config.umbral_verde;
  const umbralAzul = config.umbral_azul;
  const marginMinimo = config.margen_minimo;
  const isTarea = tipoObra === 'tarea';

  let totalRevenue = 0;
  let totalPuntosAchieved = 0;
  // Coste directo de las tareas ejecutadas, imputado por cada unidad realizada.
  let taskExpenses = 0;

  parte.lineas?.forEach(linea => {
    if (isTarea) {
      const { puntos, revenue, coste } = tareaLineaTotals(linea, config);
      totalPuntosAchieved += puntos;
      totalRevenue += revenue;
      taskExpenses += coste;
    } else {
      // Beneficio (Ingreso) generado por la línea: metros * precio unitario
      const precioUnitario = linea.partida_precio_unitario ?? 0;
      totalRevenue += linea.metros_ejecutados * precioUnitario;
    }
  });

  // Cumplimiento medio de las partidas del parte (o global de la jornada)
  let averageCompliance = 0;
  if (isTarea) {
    const objetivoGlobalDia = parte.num_personas * (config.puntos_objetivo_dia ?? 10.00);
    averageCompliance = objetivoGlobalDia > 0 ? (totalPuntosAchieved / objetivoGlobalDia) * 100 : 0;
  } else {
    // Suma de metros de todas las partidas del parte
    const totalMetrosParte = parte.lineas?.reduce((sum, l) => sum + l.metros_ejecutados, 0) ?? 0;
    // Rendimiento objetivo medio de las partidas del parte
    const rendMedioParte = parte.lineas && parte.lineas.length > 0
      ? (parte.lineas.reduce((sum, l) => sum + (l.partida_rendimiento_objetivo || config.rendimiento_default), 0) / parte.lineas.length)
      : config.rendimiento_default;
    const objetivoGlobalDia = parte.num_personas * rendMedioParte;
    averageCompliance = objetivoGlobalDia > 0 ? (totalMetrosParte / objetivoGlobalDia) * 100 : 0;
  }

  // Gastos manuales de la brigada imputados a este parte según su tipo de coste.
  // Único: se imputa íntegro el día exacto del gasto.
  const unicos = gastos.filter(
    g => g.fecha === parte.fecha && g.brigada_id === parte.brigada_id && (!g.tipo_coste || g.tipo_coste === 'unico')
  );
  // Mensual y diario: solo si el parte cae dentro de la vigencia [fecha, fecha_fin] del gasto.
  const mensuales = gastos.filter(
    g => g.brigada_id === parte.brigada_id && g.tipo_coste === 'mensual' && gastoVigente(g, parte.fecha)
  );
  const diarios = gastos.filter(
    g => g.brigada_id === parte.brigada_id && g.tipo_coste === 'diario' && gastoVigente(g, parte.fecha)
  );

  const totalUnicos = unicos.reduce((sum, g) => sum + g.importe, 0);
  // El mensual se imputa como tasa diaria estable (importe / días laborables del mes).
  const totalMensuales = mensuales.reduce((sum, g) => sum + costeMensualGastoEnParte(g, parte), 0);
  const totalDiarios = diarios.reduce((sum, g) => sum + g.importe, 0);

  const manualExpenses = totalUnicos + totalMensuales + totalDiarios;

  // 2. Costes de recursos imputados
  const recursosBrigada = recursos.filter(r => r.brigada_id === parte.brigada_id);
  const resourceDailyExpenses = recursosBrigada.reduce((sum, r) => {
    const monthlyCost = Number(r.sueldo || 0) + Number(r.seguridad_social || 0) + Number(r.alojamiento || 0) + Number(r.otros_costes || 0);
    return sum + (monthlyCost / 20); // Fijo 20 días laborables
  }, 0);

  const imputedExpenses = manualExpenses + resourceDailyExpenses;
  const totalExpenses = imputedExpenses + taskExpenses;

  // Margen económico
  const margin = totalRevenue - totalExpenses;

  // Lógica del semáforo (la misma para metro y tarea)
  let status: 'rojo' | 'verde' | 'azul' = 'rojo';
  let statusLabel = 'Rojo';

  if (averageCompliance < umbralVerde || margin <= marginMinimo) {
    status = 'rojo';
    statusLabel = 'Deficiente (Rojo)';
  } else if (averageCompliance >= umbralVerde && averageCompliance < umbralAzul) {
    status = 'verde';
    statusLabel = 'Estable (Verde)';
  } else if (averageCompliance >= umbralAzul) {
    status = 'azul';
    statusLabel = 'Sobresaliente (Azul)';
  }

  return {
    revenue: totalRevenue,
    taskExpenses,
    imputedExpenses,
    expenses: totalExpenses,
    margin,
    compliancePct: averageCompliance,
    status,
    statusLabel
  };
}

/**
 * Calcula las métricas acumuladas de una brigada para un periodo
 */
export interface BrigadePeriodMetrics {
  brigadaId: string;
  brigadaNombre: string;
  jefeNombre: string;
  numPartes: number;
  metrosAcumulados: number;
  revenue: number;
  /** Coste directo de las tareas ejecutadas en el periodo. Siempre 0 en obras por metro. */
  taskExpenses: number;
  /** Gastos manuales imputados + prorrateo de los recursos de la brigada. */
  imputedExpenses: number;
  /** Gasto total del periodo: taskExpenses + imputedExpenses. */
  expenses: number;
  margin: number;
  averageCompliance: number;
  status: 'rojo' | 'verde' | 'azul';
}

export function calculateBrigadePeriodMetrics(
  brigadaId: string,
  brigadaNombre: string,
  jefeNombre: string,
  partes: ParteTrabajo[],
  gastos: Gasto[],
  config: AppConfig,
  recursos: Recurso[],
  fechaInicio?: string,
  fechaFin?: string,
  tipoObra?: 'metro' | 'tarea'
): BrigadePeriodMetrics {
  const isTarea = tipoObra === 'tarea';

  // Todos los partes de la brigada (sin filtrar por periodo): denominador estable para
  // repartir el coste mensual entre los días del mes, aunque el periodo abarque solo parte de él.
  const partesBrigada = partes.filter(p => p.brigada_id === brigadaId);

  // Filtrar partes de esta brigada en el periodo de fechas
  const partesFiltrados = partesBrigada.filter(p => {
    if (fechaInicio && p.fecha < fechaInicio) return false;
    if (fechaFin && p.fecha > fechaFin) return false;
    return true;
  });

  let totalRevenue = 0;
  let imputedExpenses = 0;

  // 1. Sumar gastos manuales de tipo único dentro del rango del periodo
  const unicosPeriodo = gastos.filter(
    g => g.brigada_id === brigadaId &&
         (!g.tipo_coste || g.tipo_coste === 'unico') &&
         (!fechaInicio || g.fecha >= fechaInicio) &&
         (!fechaFin || g.fecha <= fechaFin)
  );
  imputedExpenses = unicosPeriodo.reduce((sum, g) => sum + g.importe, 0);

  // 2. Costes de recursos base mensuales
  const recursosBrigada = recursos.filter(r => r.brigada_id === brigadaId);
  const resourceBaseCost = recursosBrigada.reduce((sum, r) => {
    const monthlyCost = Number(r.sueldo || 0) + Number(r.seguridad_social || 0) + Number(r.alojamiento || 0) + Number(r.otros_costes || 0);
    return sum + monthlyCost;
  }, 0);

  // 3. Imputar costes periódicos por cada jornada trabajada (cada parte de trabajo del periodo)
  const mensualesBrigada = gastos.filter(g => g.brigada_id === brigadaId && g.tipo_coste === 'mensual');
  const diariosBrigada = gastos.filter(g => g.brigada_id === brigadaId && g.tipo_coste === 'diario');

  partesFiltrados.forEach(p => {
    // Prorrateo de recursos del mes (fijo 20 días laborables)
    imputedExpenses += (resourceBaseCost / 20);

    // Gastos mensuales: tasa diaria estable (importe / días laborables del mes) por jornada vigente.
    mensualesBrigada.forEach(g => {
      imputedExpenses += costeMensualGastoEnParte(g, p);
    });

    // Gastos diarios: coste fijo por jornada dentro de su ventana de vigencia.
    diariosBrigada.forEach(g => {
      if (gastoVigente(g, p.fecha)) imputedExpenses += g.importe;
    });
  });

  let totalMetros = 0;
  let complianceSum = 0;
  let countPartes = 0;
  let totalPuntosAchieved = 0;
  let totalPuntosTarget = 0;
  // Coste directo de las tareas ejecutadas, imputado por cada unidad realizada.
  let taskExpenses = 0;

  partesFiltrados.forEach(p => {
    let dayPuntos = 0;
    let dayMetros = 0;
    if (p.lineas) {
      p.lineas.forEach(l => {
        totalMetros += l.metros_ejecutados;
        if (isTarea) {
          const { puntos, revenue, coste } = tareaLineaTotals(l, config);
          dayPuntos += puntos;
          totalRevenue += revenue;
          taskExpenses += coste;
        } else {
          const precioUnitario = l.partida_precio_unitario ?? 0;
          totalRevenue += l.metros_ejecutados * precioUnitario;
          dayMetros += l.metros_ejecutados;
        }
      });
    }
    if (isTarea) {
      totalPuntosAchieved += dayPuntos;
      totalPuntosTarget += p.num_personas * (config.puntos_objetivo_dia ?? 10.00);
    } else {
      const rendMedio = p.lineas && p.lineas.length > 0
        ? (p.lineas.reduce((sum, l) => sum + (l.partida_rendimiento_objetivo || config.rendimiento_default), 0) / p.lineas.length)
        : config.rendimiento_default;
      const objetivoDia = p.num_personas * rendMedio;
      const compliance = objetivoDia > 0 ? (dayMetros / objetivoDia) * 100 : 0;
      complianceSum += compliance;
      countPartes++;
    }
  });

  const averageCompliance = isTarea
    ? (totalPuntosTarget > 0 ? (totalPuntosAchieved / totalPuntosTarget) * 100 : 0)
    : (countPartes > 0 ? complianceSum / countPartes : 0);

  const totalExpenses = imputedExpenses + taskExpenses;
  const margin = totalRevenue - totalExpenses;

  // Lógica del semáforo global
  let status: 'rojo' | 'verde' | 'azul' = 'rojo';
  if (averageCompliance < config.umbral_verde || margin <= config.margen_minimo) {
    status = 'rojo';
  } else if (averageCompliance >= config.umbral_verde && averageCompliance < config.umbral_azul) {
    status = 'verde';
  } else if (averageCompliance >= config.umbral_azul) {
    status = 'azul';
  }

  return {
    brigadaId,
    brigadaNombre,
    jefeNombre,
    numPartes: partesFiltrados.length,
    metrosAcumulados: totalMetros,
    revenue: totalRevenue,
    taskExpenses,
    imputedExpenses,
    expenses: totalExpenses,
    margin,
    averageCompliance,
    status
  };
}

