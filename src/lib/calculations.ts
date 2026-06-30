import { ParteTrabajo, Gasto, AppConfig, Recurso } from './types';

export interface PerformanceMetrics {
  revenue: number;
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
  let complianceSum = 0;
  let totalPuntosAchieved = 0;
  const numLineas = parte.lineas?.length || 0;

  if (numLineas > 0 && parte.lineas) {
    parte.lineas.forEach(linea => {
      if (isTarea) {
        // En obras de tareas, 'metros_ejecutados' almacena la cantidad realizada.
        const puntosTarea = (linea as any).partida_puntos ?? 0;
        totalPuntosAchieved += linea.metros_ejecutados * puntosTarea;
      } else {
        // 1. Beneficio (Ingreso) generado por la línea: metros * precio unitario
        const precioUnitario = linea.partida_precio_unitario ?? 0;
        const revenue = linea.metros_ejecutados * precioUnitario;
        totalRevenue += revenue;

        // 2. Rendimiento objetivo de la línea: num_personas * rendimiento_objetivo_partida
        const rendObjetivoPartida = linea.partida_rendimiento_objetivo ?? config.rendimiento_default;
        const objetivoDia = parte.num_personas * rendObjetivoPartida;

        // 3. % Cumplimiento de la línea
        const compliance = objetivoDia > 0 ? (linea.metros_ejecutados / objetivoDia) * 100 : 0;
        complianceSum += compliance;
      }
    });
  }

  // Cumplimiento medio de las partidas del parte
  let averageCompliance = 0;
  if (isTarea) {
    const objetivoGlobalDia = parte.num_personas * (config.puntos_objetivo_dia ?? 10.00);
    averageCompliance = objetivoGlobalDia > 0 ? (totalPuntosAchieved / objetivoGlobalDia) * 100 : 0;
  } else {
    averageCompliance = numLineas > 0 ? complianceSum / numLineas : 0;
  }

  // Gastos imputados a la brigada en la fecha del parte
  const yyyyMm = parte.fecha.substring(0, 7);

  // Filtrar gastos manuales de la brigada correspondientes al mes según su tipo de coste
  const unicos = gastos.filter(
    g => g.fecha === parte.fecha && g.brigada_id === parte.brigada_id && (!g.tipo_coste || g.tipo_coste === 'unico')
  );
  const mensuales = gastos.filter(
    g => g.brigada_id === parte.brigada_id && g.fecha.startsWith(yyyyMm) && g.tipo_coste === 'mensual'
  );
  const diarios = gastos.filter(
    g => g.brigada_id === parte.brigada_id && g.fecha.startsWith(yyyyMm) && g.tipo_coste === 'diario'
  );

  const totalUnicos = unicos.reduce((sum, g) => sum + g.importe, 0);
  const totalMensuales = mensuales.reduce((sum, g) => sum + (g.importe / 20), 0); // Fijo 20 días laborables
  const totalDiarios = diarios.reduce((sum, g) => sum + g.importe, 0);

  const manualExpenses = totalUnicos + totalMensuales + totalDiarios;

  // 2. Costes de recursos imputados
  const recursosBrigada = recursos.filter(r => r.brigada_id === parte.brigada_id);
  const resourceDailyExpenses = recursosBrigada.reduce((sum, r) => {
    const monthlyCost = Number(r.sueldo || 0) + Number(r.seguridad_social || 0) + Number(r.alojamiento || 0) + Number(r.otros_costes || 0);
    return sum + (monthlyCost / 20); // Fijo 20 días laborables
  }, 0);

  const totalExpenses = isTarea ? 0 : (manualExpenses + resourceDailyExpenses);

  // Margen económico
  const margin = isTarea ? 0 : (totalRevenue - totalExpenses);

  // Lógica del semáforo
  let status: 'rojo' | 'verde' | 'azul' = 'rojo';
  let statusLabel = 'Rojo';

  if (isTarea) {
    // Si es por tareas, el semáforo depende exclusivamente del cumplimiento de puntos (no importa el dinero/gastos)
    if (averageCompliance < umbralVerde) {
      status = 'rojo';
      statusLabel = 'Deficiente (Rojo)';
    } else if (averageCompliance >= umbralVerde && averageCompliance < umbralAzul) {
      status = 'verde';
      statusLabel = 'Estable (Verde)';
    } else if (averageCompliance >= umbralAzul) {
      status = 'azul';
      statusLabel = 'Sobresaliente (Azul)';
    }
  } else {
    // Metro type logic
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
  }

  return {
    revenue: totalRevenue,
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

  // Filtrar partes de esta brigada en el periodo de fechas
  const partesFiltrados = partes.filter(p => {
    if (p.brigada_id !== brigadaId) return false;
    if (fechaInicio && p.fecha < fechaInicio) return false;
    if (fechaFin && p.fecha > fechaFin) return false;
    return true;
  });

  let totalRevenue = 0;
  let totalExpenses = 0;

  if (!isTarea) {
    // 1. Sumar gastos manuales de tipo único dentro del rango del periodo
    const unicosPeriodo = gastos.filter(
      g => g.brigada_id === brigadaId && 
           (!g.tipo_coste || g.tipo_coste === 'unico') &&
           (!fechaInicio || g.fecha >= fechaInicio) &&
           (!fechaFin || g.fecha <= fechaFin)
    );
    totalExpenses = unicosPeriodo.reduce((sum, g) => sum + g.importe, 0);

    // 2. Costes de recursos base mensuales
    const recursosBrigada = recursos.filter(r => r.brigada_id === brigadaId);
    const resourceBaseCost = recursosBrigada.reduce((sum, r) => {
      const monthlyCost = Number(r.sueldo || 0) + Number(r.seguridad_social || 0) + Number(r.alojamiento || 0) + Number(r.otros_costes || 0);
      return sum + monthlyCost;
    }, 0);

    // 3. Imputar costes proporcionales mensuales y costes diarios por cada jornada trabajada (cada parte de trabajo en el rango)
    partesFiltrados.forEach(p => {
      const yyyyMm = p.fecha.substring(0, 7);

      // Prorrateo de recursos del mes (fijo 20 días laborables)
      totalExpenses += (resourceBaseCost / 20);

      // Prorrateo de gastos mensuales del mes (fijo 20 días laborables)
      const mensualesMes = gastos.filter(
        g => g.brigada_id === brigadaId && g.fecha.startsWith(yyyyMm) && g.tipo_coste === 'mensual'
      );
      mensualesMes.forEach(g => {
        totalExpenses += (g.importe / 20);
      });

      // Gastos diarios imputados por jornada
      const diariosMes = gastos.filter(
        g => g.brigada_id === brigadaId && g.fecha.startsWith(yyyyMm) && g.tipo_coste === 'diario'
      );
      diariosMes.forEach(g => {
        totalExpenses += g.importe;
      });
    });
  }

  let totalMetros = 0;
  let complianceSum = 0;
  let countLineas = 0;
  let totalPuntosAchieved = 0;
  let totalPuntosTarget = 0;

  partesFiltrados.forEach(p => {
    let dayPuntos = 0;
    if (p.lineas) {
      p.lineas.forEach(l => {
        if (isTarea) {
          const puntos = (l as any).partida_puntos ?? 0;
          dayPuntos += l.metros_ejecutados * puntos;
          totalMetros += l.metros_ejecutados;
        } else {
          const precioUnitario = l.partida_precio_unitario ?? 0;
          totalRevenue += l.metros_ejecutados * precioUnitario;
          totalMetros += l.metros_ejecutados;

          const rendObjetivo = l.partida_rendimiento_objetivo ?? config.rendimiento_default;
          const objetivoDia = p.num_personas * rendObjetivo;
          const compliance = objetivoDia > 0 ? (l.metros_ejecutados / objetivoDia) * 100 : 0;
          complianceSum += compliance;
          countLineas++;
        }
      });
    }
    if (isTarea) {
      totalPuntosAchieved += dayPuntos;
      totalPuntosTarget += p.num_personas * (config.puntos_objetivo_dia ?? 10.00);
    }
  });

  const averageCompliance = isTarea
    ? (totalPuntosTarget > 0 ? (totalPuntosAchieved / totalPuntosTarget) * 100 : 0)
    : (countLineas > 0 ? complianceSum / countLineas : 0);

  const margin = isTarea ? 0 : (totalRevenue - totalExpenses);

  // Lógica del semáforo global
  let status: 'rojo' | 'verde' | 'azul' = 'rojo';
  if (isTarea) {
    if (averageCompliance < config.umbral_verde) {
      status = 'rojo';
    } else if (averageCompliance >= config.umbral_verde && averageCompliance < config.umbral_azul) {
      status = 'verde';
    } else if (averageCompliance >= config.umbral_azul) {
      status = 'azul';
    }
  } else {
    if (averageCompliance < config.umbral_verde || margin <= config.margen_minimo) {
      status = 'rojo';
    } else if (averageCompliance >= config.umbral_verde && averageCompliance < config.umbral_azul) {
      status = 'verde';
    } else if (averageCompliance >= config.umbral_azul) {
      status = 'azul';
    }
  }

  return {
    brigadaId,
    brigadaNombre,
    jefeNombre,
    numPartes: partesFiltrados.length,
    metrosAcumulados: totalMetros,
    revenue: totalRevenue,
    expenses: totalExpenses,
    margin,
    averageCompliance,
    status
  };
}

