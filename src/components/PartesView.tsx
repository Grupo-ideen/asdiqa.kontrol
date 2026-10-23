'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { ParteTrabajo } from '@/lib/types';
import { calculateParteMetrics } from '@/lib/calculations';
import { formatPuntos } from '@/lib/format';
import PerformanceTrafficLight from './PerformanceTrafficLight';
import Modal from './Modal';
import ParteForm from './ParteForm';

export default function PartesView() {
  const { partes, brigadas, partidas, gastos, recursos, config, currentUser, refreshAll, showToast, selectedBrigadaFilter, setSelectedBrigadaFilter, currentObra, showConfirm, usuarios } = useApp();

  // Filtros de listado
  const [filterBrigada, setFilterBrigada] = useState(selectedBrigadaFilter || '');
  const [filterPartida, setFilterPartida] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  React.useEffect(() => {
    if (selectedBrigadaFilter) {
      const timer = setTimeout(() => {
        setFilterBrigada(selectedBrigadaFilter);
        setSelectedBrigadaFilter('');
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [selectedBrigadaFilter, setSelectedBrigadaFilter]);

  // Estados del Formulario (Creación / Edición)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingParte, setEditingParte] = useState<ParteTrabajo | null>(null);

  // Bloquear edición si el rol es 'lector'
  const isReadOnly = currentUser?.rol === 'lector';

  // Configuración de filtro y permisos para Jefe de Equipo
  const isJefeEquipo = currentUser?.rol === 'jefe_equipo';
  const misBrigadas = brigadas.filter(b => b.jefe_equipo_id === currentUser?.id);
  const misBrigadasIds = misBrigadas.map(b => b.id);

  // Abrir formulario para nuevo parte
  const handleOpenNewForm = () => {
    setEditingParte(null);
    setIsFormOpen(true);
  };

  // Abrir formulario para editar
  const handleEditParte = (parte: ParteTrabajo) => {
    const creatorUser = usuarios.find(u => u.id === parte.creado_por);
    if (isJefeEquipo && creatorUser?.rol === 'admin') {
      showToast('No puedes corregir partes creados por un administrador.', 'error');
      return;
    }
    setEditingParte(parte);
    setIsFormOpen(true);
  };

  // Borrar Parte
  const handleDeleteParte = (id: string) => {
    if (isReadOnly) return;
    const parte = partes.find(p => p.id === id);
    const creatorUser = usuarios.find(u => u.id === parte?.creado_por);
    if (isJefeEquipo && creatorUser?.rol === 'admin') {
      showToast('No puedes eliminar partes creados por un administrador.', 'error');
      return;
    }
    showConfirm(
      '¿Borrar parte de trabajo?',
      '¿Estás seguro de borrar este parte de trabajo? Las líneas asociadas se eliminarán permanentemente.',
      async () => {
        await Services.deleteParteTrabajo(id);
        await refreshAll();
      }
    );
  };

  // Filtrado de la lista de partes
  const filteredPartes = partes.filter(parte => {
    if (isJefeEquipo && !misBrigadasIds.includes(parte.brigada_id)) return false;
    if (filterBrigada && parte.brigada_id !== filterBrigada) return false;
    if (filterFechaInicio && parte.fecha < filterFechaInicio) return false;
    if (filterFechaFin && parte.fecha > filterFechaFin) return false;
    if (filterPartida && parte.lineas) {
      const hasPartida = parte.lineas.some(l => l.partida_id === filterPartida);
      if (!hasPartida) return false;
    }
    return true;
  });

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      
      {/* Encabezado de la Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Partes de Trabajo Diarios</h1>
          {!isJefeEquipo && (
            <p>Registra las unidades de obra ejecutadas por cada brigada para calcular su rendimiento inmediato.</p>
          )}
        </div>
        {!isReadOnly && (
          <button onClick={handleOpenNewForm} className="primary">
            + Nuevo Parte Diario
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA / EDICIÓN */}
      {!isReadOnly && (
        <Modal
          isOpen={isFormOpen}
          onClose={() => setIsFormOpen(false)}
          title={editingParte ? 'Corregir/Editar Parte de Trabajo' : 'Registrar Parte de Trabajo'}
        >
          <ParteForm editingParte={editingParte} onClose={() => setIsFormOpen(false)} />
        </Modal>
      )}

      {/* FILTROS DE BÚSQUEDA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <label htmlFor="filter-brigada">Filtrar por Brigada:</label>
          <select
            id="filter-brigada"
            value={filterBrigada}
            onChange={e => setFilterBrigada(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          >
            <option value="">Todas las brigadas</option>
            {(isJefeEquipo ? misBrigadas : brigadas).map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-partida">Filtrar por Código:</label>
          <select
            id="filter-partida"
            value={filterPartida}
            onChange={e => setFilterPartida(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          >
            <option value="">Todas las partidas</option>
            {partidas.map(p => (
              <option key={p.id} value={p.id}>
                {p.codigo} - {p.descripcion.substring(0, 20)}...
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-desde">Desde:</label>
          <input
            type="date"
            id="filter-desde"
            value={filterFechaInicio}
            onChange={e => setFilterFechaInicio(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
        </div>

        <div>
          <label htmlFor="filter-hasta">Hasta:</label>
          <input
            type="date"
            id="filter-hasta"
            value={filterFechaFin}
            onChange={e => setFilterFechaFin(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
        </div>
      </div>

      {/* LISTADO DE PARTES REGISTRADOS */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <h2 style={{ fontSize: '1.15rem' }}>Histórico de Partes ({filteredPartes.length})</h2>
        
        {filteredPartes.map(parte => {
          // Calcular rendimiento y semáforo en tiempo real para este parte diario
          const metrics = config ? calculateParteMetrics(parte, gastos, config, recursos, currentObra?.tipo) : null;
          
          return (
            <div
              key={parte.id}
              style={{
                backgroundColor: 'var(--card-bg)',
                borderRadius: 'var(--border-radius)',
                border: '1px solid var(--border-color)',
                padding: '1.25rem',
                display: 'grid',
                gridTemplateColumns: '1fr',
                gap: '1rem',
                boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
              }}
            >
              {/* Encabezado del parte card */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontWeight: 600, textTransform: 'uppercase' }}>
                    {parte.fecha}
                  </span>
                  <h3 style={{ fontSize: '1.1rem', margin: 0 }}>{parte.brigada_nombre}</h3>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Operarios: <strong>{parte.num_personas}</strong>
                  </span>
                </div>
                
                {metrics && !isJefeEquipo && (
                  <PerformanceTrafficLight
                    status={metrics.status}
                    compliance={metrics.compliancePct}
                    margin={metrics.margin}
                    compact={true}
                    isTarea={currentObra?.tipo === 'tarea'}
                  />
                )}
              </div>

              {/* Detalle de partidas */}
              <div style={{ fontSize: '0.85rem', borderLeft: '2px solid var(--border-color)', paddingLeft: '0.75rem' }}>
                <span style={{ display: 'block', fontWeight: 600, marginBottom: '0.25rem', color: 'var(--text-secondary)' }}>
                  {currentObra?.tipo === 'tarea' ? 'Tareas Realizadas:' : 'Producción Registrada:'}
                </span>
                <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  {parte.lineas?.map(linea => {
                    const isTarea = currentObra?.tipo === 'tarea';
                    if (isTarea) {
                      const puntos = linea.partida_puntos ?? 0;
                      const totalPuntos = linea.metros_ejecutados * puntos;
                      const categoria = linea.partida_categoria === 'obra_civil' ? 'obra_civil' : 'cable';
                      const costeLinea = linea.metros_ejecutados * (linea.partida_coste_unitario ?? 0);

                      let items: { descripcion: string; cantidad: number }[] = [];
                      if (linea.desglose) {
                        try {
                          items = JSON.parse(linea.desglose);
                        } catch (e) {}
                      }
                      
                      return (
                        <li key={linea.id} style={{ marginBottom: '0.5rem' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                            <span style={{
                              fontSize: '0.65rem',
                              fontWeight: 600,
                              padding: '0.1rem 0.4rem',
                              borderRadius: '999px',
                              textTransform: 'uppercase',
                              letterSpacing: '0.03em',
                              backgroundColor: categoria === 'obra_civil' ? 'rgba(217, 119, 6, 0.12)' : 'rgba(59, 130, 246, 0.12)',
                              color: categoria === 'obra_civil' ? '#d97706' : '#3b82f6'
                            }}>
                              {categoria === 'obra_civil' ? 'Obra civil' : 'Cable'}
                            </span>
                            <span>
                              <code>{linea.partida_codigo}</code> — {linea.partida_descripcion}: <strong>{linea.metros_ejecutados}</strong> ({formatPuntos(puntos)} pts/ud → <strong>{formatPuntos(totalPuntos)} pts</strong>)
                            </span>
                            {!isJefeEquipo && costeLinea > 0 && (
                              <span
                                style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}
                                title={`Coste de la tarea: ${new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(linea.partida_coste_unitario ?? 0)} por unidad`}
                              >
                                · {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(costeLinea)} de gasto
                              </span>
                            )}
                          </div>
                          {items.length > 0 && (
                            <ul style={{ listStyle: 'none', paddingLeft: '1.25rem', marginTop: '0.15rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '0.1rem', fontSize: '0.8rem' }}>
                              {items.map((it, idx) => (
                                <li key={idx}>
                                  ↳ {it.descripcion}: <strong>{it.cantidad}</strong> uds
                                </li>
                              ))}
                            </ul>
                          )}
                        </li>
                      );
                    }
                    const lineRendObj = linea.partida_rendimiento_objetivo || config?.rendimiento_default || 100;
                    return (
                      <li key={linea.id}>
                        <code>{linea.partida_codigo}</code> — <strong>{linea.metros_ejecutados}</strong> {linea.partida_unidad} 
                        {!isJefeEquipo && lineRendObj > 0 && (
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>
                            (Rend. Obj: {lineRendObj} {linea.partida_unidad}/pers/día)
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              {/* Resumen económico diario del Parte */}
               {metrics && !isJefeEquipo && (
                currentObra?.tipo === 'tarea' ? (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                      gap: '1rem',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--border-radius)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-color)',
                      marginTop: '0.25rem',
                      marginBottom: '0.25rem'
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Puntos Cons.</span>
                      <span style={{ fontWeight: 700, color: 'var(--status-blue)', fontSize: '1rem' }}>
                        {formatPuntos((parte.lineas?.reduce((sum, l) => sum + l.metros_ejecutados * (l.partida_puntos ?? 0), 0)) ?? 0)} pts
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Objetivo Día</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                        {formatPuntos(parte.num_personas * (config?.puntos_objetivo_dia ?? 10))} pts
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>% Cumpl.</span>
                      <span style={{ fontWeight: 700, color: metrics.status === 'rojo' ? 'var(--status-red)' : metrics.status === 'verde' ? 'var(--status-green)' : 'var(--status-blue)', fontSize: '1rem' }}>
                        {metrics.compliancePct.toFixed(1)}%
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Ingresos Gen.</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.revenue)}
                      </span>
                    </div>
                    {/* El coste de tareas es opcional: sólo se desglosa cuando alguna tarea del parte lo tiene configurado. */}
                    {metrics.taskExpenses > 0 ? (
                      <>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Gastos Tareas</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }} title="Coste directo de las tareas realizadas en este parte">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.taskExpenses)}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Gastos Imput.</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }} title="Gastos registrados y prorrateo de recursos de la brigada">
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.imputedExpenses)}
                          </span>
                        </div>
                      </>
                    ) : (
                      <div>
                        <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Gastos Real.</span>
                        <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                          {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.expenses)}
                        </span>
                      </div>
                    )}
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Margen Neto</span>
                      <span style={{ fontWeight: 600, color: metrics.margin >= 0 ? '#4cbd6d' : 'var(--status-red)' }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.margin)}
                      </span>
                    </div>
                  </div>
                ) : (
                  (() => {
                    const totalMetros = parte.lineas?.reduce((sum, l) => sum + l.metros_ejecutados, 0) ?? 0;
                    const rendMedio = parte.lineas && parte.lineas.length > 0
                      ? (parte.lineas.reduce((sum, l) => sum + (l.partida_rendimiento_objetivo || (config?.rendimiento_default ?? 100)), 0) / parte.lineas.length)
                      : (config?.rendimiento_default ?? 100);
                    const objetivoGlobalDia = parte.num_personas * rendMedio;

                    return (
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
                          gap: '1rem',
                          backgroundColor: 'var(--bg-secondary)',
                          padding: '0.75rem 1rem',
                          borderRadius: 'var(--border-radius)',
                          fontSize: '0.85rem',
                          border: '1px solid var(--border-color)',
                          marginTop: '0.25rem',
                          marginBottom: '0.25rem'
                        }}
                      >
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Metros Ejec.</span>
                          <span style={{ fontWeight: 650, color: 'var(--text-primary)', fontSize: '1rem' }}>
                            {totalMetros.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} m
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Objetivo Día</span>
                          <span style={{ fontWeight: 650, color: 'var(--text-primary)', fontSize: '1rem' }}>
                            {objetivoGlobalDia.toLocaleString('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 1 })} m
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Cumplimiento</span>
                          <span style={{ fontWeight: 700, color: metrics.status === 'rojo' ? 'var(--status-red)' : metrics.status === 'verde' ? 'var(--status-green)' : 'var(--status-blue)', fontSize: '1rem' }}>
                            {metrics.compliancePct.toFixed(1)}%
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Ingresos Gen.</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.revenue)}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Gastos Real.</span>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.expenses)}
                          </span>
                        </div>
                        <div>
                          <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Margen Neto</span>
                          <span style={{ fontWeight: 600, color: metrics.margin >= 0 ? '#4cbd6d' : 'var(--status-red)' }}>
                            {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(metrics.margin)}
                          </span>
                        </div>
                      </div>
                    );
                  })()
                )
              )}

              {/* Observaciones y Auditoría */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--bg-tertiary)', paddingTop: '0.75rem' }}>
                <div>
                  {parte.observaciones && (
                    <p style={{ margin: 0, fontStyle: 'italic' }}>
                      <strong>Notas:</strong> &ldquo;{parte.observaciones}&rdquo;
                    </p>
                  )}
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                    Registrado por: {parte.creado_por_nombre || 'Sistema'}
                  </span>
                </div>

                {(() => {
                  const creatorUser = usuarios.find(u => u.id === parte.creado_por);
                  const isCreatedByAdmin = creatorUser?.rol === 'admin';
                  const canModify = !isReadOnly && (!isJefeEquipo || !isCreatedByAdmin);
                  return canModify && (
                    <div style={{ display: 'inline-flex', gap: '0.5rem' }}>
                      <button
                        onClick={() => handleEditParte(parte)}
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Corregir
                      </button>
                      <button
                        onClick={() => handleDeleteParte(parte.id)}
                        className="danger"
                        style={{ padding: '0.3rem 0.6rem', fontSize: '0.75rem' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  );
                })()}
              </div>
            </div>
          );
        })}

        {filteredPartes.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius)', backgroundColor: 'var(--bg-secondary)', color: 'var(--text-tertiary)' }}>
            No se encontraron partes de trabajo con los filtros aplicados.
          </div>
        )}
      </div>
    </div>
  );
}
