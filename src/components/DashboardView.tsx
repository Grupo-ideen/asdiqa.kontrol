'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { calculateBrigadePeriodMetrics } from '@/lib/calculations';
import PerformanceTrafficLight from './PerformanceTrafficLight';

export default function DashboardView() {
  const { partes, gastos, brigadas, recursos, config, setSection, setSelectedBrigadaFilter, currentObra } = useApp();

  const handleRowClick = (brigadaId: string) => {
    setSelectedBrigadaFilter(brigadaId);
    setSection('partes');
  };

  // Filtros de fecha
  const [fechaInicio, setFechaInicio] = useState(() => {
    // Primer día del mes actual
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
  });
  const [fechaFin, setFechaFin] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });
  
  const [selectedBrigadaId, setSelectedBrigadaId] = useState('');

  const isTarea = currentObra?.tipo === 'tarea';

  // 1. Calcular métricas por cada brigada
  const brigadeMetricsList = brigadas.map(b => {
    return config
      ? calculateBrigadePeriodMetrics(b.id, b.nombre, b.jefe_nombre || 'Sin asignar', partes, gastos, config, recursos, fechaInicio, fechaFin, currentObra?.tipo)
      : {
          brigadaId: b.id,
          brigadaNombre: b.nombre,
          jefeNombre: b.jefe_nombre || 'Sin asignar',
          numPartes: 0,
          metrosAcumulados: 0,
          revenue: 0,
          expenses: 0,
          margin: 0,
          averageCompliance: 0,
          status: 'rojo' as const
        };
  });

  // Métricas consolidadas (Totales generales)
  const totalMetros = brigadeMetricsList.reduce((sum, item) => sum + item.metrosAcumulados, 0);
  const totalRevenue = brigadeMetricsList.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = brigadeMetricsList.reduce((sum, item) => sum + item.expenses, 0);
  const totalMargin = totalRevenue - totalExpenses;
  const avgCompliance = brigadeMetricsList.length > 0 
    ? brigadeMetricsList.reduce((sum, item) => sum + item.averageCompliance, 0) / brigadeMetricsList.length 
    : 0;

  // Calcular puntos totales consolidados (si es tipo tarea)
  let totalPuntosAchieved = 0;
  let totalPuntosTarget = 0;
  if (isTarea) {
    partes.forEach(p => {
      if (p.fecha >= fechaInicio && p.fecha <= fechaFin) {
        totalPuntosTarget += p.num_personas * (config?.puntos_objetivo_dia ?? 10.00);
        p.lineas?.forEach(l => {
          const puntos = (l as any).partida_puntos ?? 0;
          totalPuntosAchieved += l.metros_ejecutados * puntos;
        });
      }
    });
  }

  // Semáforo consolidado
  let totalStatus: 'rojo' | 'verde' | 'azul' = 'rojo';
  if (config) {
    if (isTarea) {
      if (avgCompliance < config.umbral_verde) {
        totalStatus = 'rojo';
      } else if (avgCompliance >= config.umbral_verde && avgCompliance < config.umbral_azul) {
        totalStatus = 'verde';
      } else {
        totalStatus = 'azul';
      }
    } else {
      if (avgCompliance < config.umbral_verde || totalMargin <= config.margen_minimo) {
        totalStatus = 'rojo';
      } else if (avgCompliance >= config.umbral_verde && avgCompliance < config.umbral_azul) {
        totalStatus = 'verde';
      } else {
        totalStatus = 'azul';
      }
    }
  }

  // 2. Preparar datos para el gráfico de evolución
  // Agrupar por fecha los partes de la brigada seleccionada (o de todas si no se selecciona ninguna)
  const partesFiltradosParaGrafico = partes
    .filter(p => p.fecha >= fechaInicio && p.fecha <= fechaFin)
    .filter(p => !selectedBrigadaId || p.brigada_id === selectedBrigadaId)
    .sort((a, b) => a.fecha.localeCompare(b.fecha));

  const chartDataPoints = partesFiltradosParaGrafico.map(p => {
    // Calcular rendimiento y margen diario
    let revenue = 0;
    let complianceSum = 0;
    let dayPuntosAchieved = 0;
    const numLineas = p.lineas?.length || 0;

    if (p.lineas && numLineas > 0) {
      p.lineas.forEach(l => {
        if (isTarea) {
          dayPuntosAchieved += l.metros_ejecutados * ((l as any).partida_puntos ?? 0);
        } else {
          revenue += l.metros_ejecutados * (l.partida_precio_unitario ?? 0);
          const rendObj = l.partida_rendimiento_objetivo ?? config?.rendimiento_default ?? 100;
          const totalObj = p.num_personas * rendObj;
          complianceSum += totalObj > 0 ? (l.metros_ejecutados / totalObj) * 100 : 0;
        }
      });
    }

    const avgLineCompliance = isTarea
      ? (p.num_personas * (config?.puntos_objetivo_dia ?? 10.00) > 0 ? (dayPuntosAchieved / (p.num_personas * (config?.puntos_objetivo_dia ?? 10.00))) * 100 : 0)
      : (numLineas > 0 ? complianceSum / numLineas : 0);
    const dayGastos = isTarea ? 0 : gastos
      .filter(g => g.fecha === p.fecha && g.brigada_id === p.brigada_id)
      .reduce((sum, g) => sum + g.importe, 0);
    const dayMargin = isTarea ? 0 : revenue - dayGastos;

    return {
      fecha: p.fecha,
      compliance: avgLineCompliance,
      margin: dayMargin,
      nombreBrigada: p.brigada_nombre
    };
  });

  // Generar CSV para exportar
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,\uFEFF';
    // Encabezado
    if (isTarea) {
      csvContent += 'Brigada,Encargado,Partes Registrados,Tareas Realizadas (uds),Puntos Conseguidos,Cumplimiento Medio (%),Semáforo\n';
    } else {
      csvContent += 'Brigada,Encargado,Partes Registrados,Metros Acumulados,Ingresos Generados (€),Gastos Imputados (€),Margen Neto (€),Cumplimiento Medio (%),Semáforo\n';
    }
    
    // Contenido
    brigadeMetricsList.forEach(item => {
      if (isTarea) {
        let pointsAchieved = 0;
        partes.forEach(p => {
          if (p.brigada_id === item.brigadaId && p.fecha >= fechaInicio && p.fecha <= fechaFin) {
            p.lineas?.forEach(l => {
              pointsAchieved += l.metros_ejecutados * ((l as any).partida_puntos ?? 0);
            });
          }
        });
        csvContent += `"${item.brigadaNombre}","${item.jefeNombre}",${item.numPartes},${item.metrosAcumulados.toFixed(1)},${pointsAchieved.toFixed(1)},${item.averageCompliance.toFixed(1)}%,"${item.status.toUpperCase()}"\n`;
      } else {
        csvContent += `"${item.brigadaNombre}","${item.jefeNombre}",${item.numPartes},${item.metrosAcumulados.toFixed(1)},${item.revenue.toFixed(2)},${item.expenses.toFixed(2)},${item.margin.toFixed(2)},${item.averageCompliance.toFixed(1)}%,"${item.status.toUpperCase()}"\n`;
      }
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', isTarea ? `kontrol_puntos_${fechaInicio}_a_${fechaFin}.csv` : `kontrol_rendimiento_${fechaInicio}_a_${fechaFin}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Renderizador de gráfico SVG nativo
  const renderEvolutionChart = () => {
    if (chartDataPoints.length === 0) {
      return (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          No hay datos suficientes para graficar en el periodo seleccionado.
        </div>
      );
    }

    const width = 600;
    const height = 220;
    const padding = 40;

    // Calcular valores extremos
    const maxCompliance = Math.max(...chartDataPoints.map(d => d.compliance), 150); // Mínimo 150% para escala
    const maxMargin = Math.max(...chartDataPoints.map(d => d.margin), 500);
    const minMargin = Math.min(...chartDataPoints.map(d => d.margin), 0);

    // Mapeo a coordenadas SVG
    const getX = (idx: number) => padding + (idx / (chartDataPoints.length - 1 || 1)) * (width - 2 * padding);
    
    const getComplianceY = (val: number) => 
      height - padding - (val / maxCompliance) * (height - 2 * padding);
    
    const getMarginY = (val: number) => {
      const marginRange = maxMargin - minMargin || 1;
      return height - padding - ((val - minMargin) / marginRange) * (height - 2 * padding);
    };

    // Crear caminos polilínea
    let compliancePoints = '';
    let marginPoints = '';
    
    chartDataPoints.forEach((d, idx) => {
      const x = getX(idx);
      compliancePoints += `${x},${getComplianceY(d.compliance)} `;
      marginPoints += `${x},${getMarginY(d.margin)} `;
    });

    return (
      <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', overflowX: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
          <h3 style={{ fontSize: '1rem', margin: 0 }}>Evolución Temporal de Rendimiento</h3>
          <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem' }}>
            <span style={{ color: 'var(--status-blue)', fontWeight: 600 }}>● Cumplimiento (%)</span>
            {!isTarea && <span style={{ color: '#d97706', fontWeight: 600 }}>■ Margen (€)</span>}
          </div>
        </div>

        <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ minWidth: '500px' }}>
          {/* Eje X (Fecha) */}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1.5" />
          
          {/* Eje Y Izquierdo (Cumplimiento) */}
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="var(--border-color)" strokeWidth="1.5" />

          {/* Línea objetivo del 100% */}
          {config && (
            <line
              x1={padding}
              y1={getComplianceY(config.umbral_verde)}
              x2={width - padding}
              y2={getComplianceY(config.umbral_verde)}
              stroke="var(--status-green)"
              strokeDasharray="4 4"
              strokeWidth="1"
            />
          )}

          {/* Gráfico de Cumplimiento (Línea Azul) */}
          <polyline
            fill="none"
            stroke="var(--status-blue)"
            strokeWidth="3"
            points={compliancePoints}
          />
          
          {/* Gráfico de Margen (Línea Amarilla/Marrón) */}
          {!isTarea && (
            <polyline
              fill="none"
              stroke="#d97706"
              strokeWidth="2"
              strokeDasharray="3 2"
              points={marginPoints}
            />
          )}

          {/* Puntos y Etiquetas */}
          {chartDataPoints.map((d, idx) => {
            const x = getX(idx);
            const yComp = getComplianceY(d.compliance);
            const yMarg = getMarginY(d.margin);
            
            return (
              <g key={idx}>
                {/* Punto cumplimiento */}
                <circle cx={x} cy={yComp} r="4" fill="var(--status-blue)" />
                {/* Punto margen */}
                {!isTarea && <rect x={x - 3} y={yMarg - 3} width="6" height="6" fill="#d97706" />}

                {/* Fecha en eje X (primer, intermedio y último punto) */}
                {(idx === 0 || idx === chartDataPoints.length - 1 || (chartDataPoints.length > 2 && idx === Math.floor(chartDataPoints.length / 2))) && (
                  <text
                    x={x}
                    y={height - padding + 18}
                    textAnchor="middle"
                    fontSize="9px"
                    fill="var(--text-secondary)"
                    fontWeight="500"
                  >
                    {d.fecha.substring(5)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Etiquetas Eje Y Izquierdo (Cumplimiento) */}
          <text x={padding - 8} y={padding + 4} textAnchor="end" fontSize="9px" fill="var(--text-secondary)">{maxCompliance.toFixed(0)}%</text>
          <text x={padding - 8} y={getComplianceY(100) + 4} textAnchor="end" fontSize="9px" fill="var(--text-secondary)">100%</text>
          <text x={padding - 8} y={height - padding + 4} textAnchor="end" fontSize="9px" fill="var(--text-secondary)">0%</text>
        </svg>
      </div>
    );
  };

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      
      {/* Cabecera del Dashboard */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Cuadro de Mando de Producción</h1>
          <p>Supervisa el rendimiento acumulado e ingresos vs gastos de todas las cuadrillas de la obra.</p>
        </div>
        
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button onClick={handleExportCSV} style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Exportar Informe (CSV)
          </button>
        </div>
      </div>

      {/* FILTROS DE FECHAS */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
          marginBottom: '2rem'
        }}
      >
        <div>
          <label htmlFor="dash-desde">Rango desde:</label>
          <input
            type="date"
            id="dash-desde"
            value={fechaInicio}
            onChange={e => setFechaInicio(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="dash-hasta">Rango hasta:</label>
          <input
            type="date"
            id="dash-hasta"
            value={fechaFin}
            onChange={e => setFechaFin(e.target.value)}
          />
        </div>

        <div>
          <label htmlFor="dash-brigada-chart">Detalle de gráfico (Filtro Brigada):</label>
          <select
            id="dash-brigada-chart"
            value={selectedBrigadaId}
            onChange={e => setSelectedBrigadaId(e.target.value)}
          >
            <option value="">Todas las brigadas</option>
            {brigadas.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* TARJETAS DE MÉTRICAS CONSOLIDADAS GENERALES */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            {isTarea ? 'Tareas Realizadas' : 'Volumen Ejecutado'}
          </span>
          <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0.5rem 0', fontWeight: 700 }}>
            {totalMetros.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} {isTarea ? 'uds' : 'm'}
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            {isTarea ? 'Total tareas completadas' : 'Total metros registrados'}
          </span>
        </div>

        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Rendimiento Medio
          </span>
          <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0.5rem 0', fontWeight: 700 }}>
            {avgCompliance.toFixed(1)}%
          </h2>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
            Objetivo: {config?.umbral_verde}%
          </span>
        </div>

        {isTarea ? (
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Puntos Totales Conseguidos
            </span>
            <h2 style={{ fontSize: '1.8rem', margin: '0.25rem 0 0.5rem 0', fontWeight: 700, color: 'var(--status-blue)' }}>
              {totalPuntosAchieved.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Objetivo: {totalPuntosTarget.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} pts
            </span>
          </div>
        ) : (
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
              Margen Neto Consolidado
            </span>
            <h2 style={{
              fontSize: '1.8rem',
              margin: '0.25rem 0 0.5rem 0',
              fontWeight: 700,
              color: totalMargin > 0 ? 'var(--status-green)' : totalMargin < 0 ? 'var(--status-red)' : 'inherit'
            }}>
              {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalMargin)}
            </h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)' }}>
              Ingresos: {totalRevenue.toFixed(0)}€ | Gastos: {totalExpenses.toFixed(0)}€
            </span>
          </div>
        )}

        <div style={{ 
          backgroundColor: totalStatus === 'rojo' ? 'var(--status-red-bg)' : totalStatus === 'verde' ? 'var(--status-green-bg)' : 'var(--status-blue-bg)', 
          padding: '1.25rem', 
          borderRadius: 'var(--border-radius)', 
          border: `1px solid ${totalStatus === 'rojo' ? 'var(--status-red-border)' : totalStatus === 'verde' ? 'var(--status-green-border)' : 'var(--status-blue-border)'}`,
          color: totalStatus === 'rojo' ? 'var(--status-red)' : totalStatus === 'verde' ? 'var(--status-green)' : 'var(--status-blue)'
        }}>
          <span style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.05em', opacity: 0.85 }}>
            Estado Global de Obra
          </span>
          <h2 style={{ fontSize: '1.6rem', margin: '0.25rem 0 0.5rem 0', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span>{totalStatus === 'rojo' ? (isTarea ? '● DEFICIENTE' : (totalMargin < 0 ? '● PÉRDIDAS' : '● DEFICIENTE')) : totalStatus === 'verde' ? '▲ ESTABLE' : '★ EXCELENTE'}</span>
          </h2>
          <span style={{ fontSize: '0.8rem', opacity: 0.85 }}>
            Balance del periodo filtrado
          </span>
        </div>
      </div>

      {/* SECCIÓN DE GRÁFICO EVOLUTIVO */}
      <div style={{ marginBottom: '2.5rem' }}>
        {renderEvolutionChart()}
      </div>

      {/* TABLA RESUMEN POR BRIGADA */}
      <div style={{ overflowX: 'auto', marginBottom: '2rem' }}>
        <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem' }}>Resumen por Brigadas en el Periodo</h2>
        <table>
          <thead>
            <tr>
              <th>Brigada</th>
              <th>Jefe de Equipo</th>
              <th style={{ textAlign: 'center' }}>Nº Partes</th>
              <th style={{ textAlign: 'right' }}>{isTarea ? 'Tareas Realizadas' : 'Metros Acum.'}</th>
              {!isTarea && <th style={{ textAlign: 'right' }}>Ingresos Gen.</th>}
              {!isTarea && <th style={{ textAlign: 'right' }}>Gastos Real.</th>}
              {!isTarea && <th style={{ textAlign: 'right' }}>Margen Neto</th>}
              {isTarea && <th style={{ textAlign: 'right' }}>Puntos Cons.</th>}
              <th style={{ textAlign: 'right' }}>% Cumpl. Medio</th>
              <th style={{ textAlign: 'center' }}>Semáforo</th>
            </tr>
          </thead>
          <tbody>
            {brigadeMetricsList.map(item => {
              const roundedCompliance = item.averageCompliance.toFixed(1);
              const formattedRevenue = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.revenue);
              const formattedExpenses = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.expenses);
              const formattedMargin = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(item.margin);

              let pointsAchieved = 0;
              if (isTarea) {
                partes.forEach(p => {
                  if (p.brigada_id === item.brigadaId && p.fecha >= fechaInicio && p.fecha <= fechaFin) {
                    p.lineas?.forEach(l => {
                      pointsAchieved += l.metros_ejecutados * ((l as any).partida_puntos ?? 0);
                    });
                  }
                });
              }

              return (
                <tr key={item.brigadaId} style={{ cursor: 'pointer' }} onClick={() => handleRowClick(item.brigadaId)} title="Hacer clic para ver los partes diarios de esta cuadrilla">
                  <td style={{ fontWeight: 600 }}>{item.brigadaNombre}</td>
                  <td>{item.jefeNombre}</td>
                  <td style={{ textAlign: 'center' }}>{item.numPartes}</td>
                  <td style={{ textAlign: 'right' }}>{item.metrosAcumulados.toFixed(1)} {isTarea ? 'uds' : 'm'}</td>
                  {!isTarea && <td style={{ textAlign: 'right' }}>{formattedRevenue}</td>}
                  {!isTarea && <td style={{ textAlign: 'right' }}>{formattedExpenses}</td>}
                  {!isTarea && <td style={{
                    textAlign: 'right',
                    fontWeight: 600,
                    color: item.margin > 0 ? 'var(--status-green)' : item.margin < 0 ? 'var(--status-red)' : 'inherit'
                  }}>{formattedMargin}</td>}
                  {isTarea && <td style={{ textAlign: 'right', fontWeight: 600, color: 'var(--status-blue)' }}>{pointsAchieved.toFixed(1)} pts</td>}
                  <td style={{ textAlign: 'right', fontWeight: 600 }}>{roundedCompliance}%</td>
                  <td style={{ textAlign: 'center' }}>
                    <PerformanceTrafficLight
                      status={item.status}
                      compliance={item.averageCompliance}
                      margin={isTarea ? 1 : item.margin}
                      compact={true}
                      isTarea={isTarea}
                    />
                  </td>
                </tr>
              );
            })}
            {brigadeMetricsList.length === 0 && (
              <tr>
                <td colSpan={isTarea ? 7 : 9} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                  No hay brigadas registradas en el sistema.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
