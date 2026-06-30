'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { ParteTrabajo, ParteLinea } from '@/lib/types';
import { calculateParteMetrics } from '@/lib/calculations';
import PerformanceTrafficLight from './PerformanceTrafficLight';

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
  
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formBrigadaId, setFormBrigadaId] = useState('');
  const [formNumPersonas, setFormNumPersonas] = useState(1);
  const [formObservaciones, setFormObservaciones] = useState('');
  const [formLineas, setFormLineas] = useState<Omit<ParteLinea, 'id' | 'parte_id'>[]>([
    { partida_id: '', metros_ejecutados: 0 }
  ]);

  const handleBrigadaChange = (id: string) => {
    setFormBrigadaId(id);
    if (!editingParte) {
      const selected = brigadas.find(b => b.id === id);
      if (selected) {
        setFormNumPersonas(selected.num_personas_habitual);
      }
    }
  };

  // Bloquear edición si el rol es 'lector'
  const isReadOnly = currentUser?.rol === 'lector';

  // Configuración de filtro y permisos para Jefe de Equipo
  const isJefeEquipo = currentUser?.rol === 'jefe_equipo';
  const misBrigadas = brigadas.filter(b => b.jefe_equipo_id === currentUser?.id);
  const misBrigadasIds = misBrigadas.map(b => b.id);
  const isAdmin = currentUser?.rol === 'admin';

  // Manejo de líneas en el formulario
  const handleAddLinea = () => {
    setFormLineas([...formLineas, { partida_id: '', metros_ejecutados: 0 }]);
  };

  const handleRemoveLinea = (index: number) => {
    if (formLineas.length > 1) {
      setFormLineas(formLineas.filter((_, i) => i !== index));
    }
  };

  const handleLineaChange = (index: number, field: 'partida_id' | 'metros_ejecutados', value: string | number) => {
    const updated = [...formLineas];
    if (field === 'metros_ejecutados') {
      updated[index].metros_ejecutados = Number(value) || 0;
    } else {
      updated[index].partida_id = value as string;
    }
    setFormLineas(updated);
  };

  // Abrir formulario para nuevo parte
  const handleOpenNewForm = () => {
    setEditingParte(null);
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormBrigadaId(brigadas[0]?.id || '');
    setFormNumPersonas(brigadas[0]?.num_personas_habitual || 1);
    setFormObservaciones('');
    setFormLineas([{ partida_id: partidas[0]?.id || '', metros_ejecutados: 0 }]);
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
    setFormFecha(parte.fecha);
    setFormBrigadaId(parte.brigada_id);
    setFormNumPersonas(parte.num_personas);
    setFormObservaciones(parte.observaciones || '');
    
    const lines = parte.lineas?.map(l => ({
      partida_id: l.partida_id,
      metros_ejecutados: l.metros_ejecutados
    })) || [{ partida_id: '', metros_ejecutados: 0 }];

    setFormLineas(lines);
    setIsFormOpen(true);
  };

  // Guardar Parte
  const handleSaveParte = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formBrigadaId || !formFecha) {
      showToast('Por favor selecciona una brigada y fecha válidas.', 'error');
      return;
    }

    // Filtrar líneas vacías
    const validLineas = formLineas.filter(l => l.partida_id && l.metros_ejecutados > 0);
    if (validLineas.length === 0) {
      showToast('Debes agregar al menos una línea de trabajo con cantidad superior a 0.', 'error');
      return;
    }

    try {
      const parteData: ParteTrabajo = {
        id: editingParte?.id || `pt-temp`,
        fecha: formFecha,
        brigada_id: formBrigadaId,
        num_personas: Number(formNumPersonas),
        creado_por: currentUser?.id || null,
        observaciones: formObservaciones,
        obra_id: currentObra?.id || ''
      };

      await Services.saveParteTrabajo(parteData, validLineas);
      setIsFormOpen(false);
      await refreshAll();
      showToast(editingParte ? 'Parte de trabajo corregido correctamente.' : 'Parte de trabajo registrado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el parte de trabajo.', 'error');
    }
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
          <p>Registra las unidades de obra ejecutadas por cada brigada para calcular su rendimiento inmediato.</p>
        </div>
        {!isReadOnly && !isFormOpen && (
          <button onClick={handleOpenNewForm} className="primary">
            + Nuevo Parte Diario
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA / EDICIÓN */}
      {isFormOpen && !isReadOnly && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>
            {editingParte ? 'Corregir/Editar Parte de Trabajo' : 'Registrar Parte de Trabajo'}
          </h2>
          
          <form onSubmit={handleSaveParte} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            {/* Cabecera del Parte */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
              <div>
                <label htmlFor="form-fecha">Fecha del Parte:</label>
                <input
                  type="date"
                  id="form-fecha"
                  value={formFecha}
                  onChange={e => setFormFecha(e.target.value)}
                  required
                />
              </div>

              <div>
                <label htmlFor="form-brigada">Brigada / Equipo:</label>
                <select
                  id="form-brigada"
                  value={formBrigadaId}
                  onChange={e => handleBrigadaChange(e.target.value)}
                  required
                >
                  <option value="">Selecciona brigada...</option>
                  {brigadas.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="form-personas">Operarios ese día:</label>
                <input
                  type="number"
                  id="form-personas"
                  value={formNumPersonas}
                  onChange={e => setFormNumPersonas(Number(e.target.value))}
                  min="1"
                  required
                />
              </div>
            </div>

            {/* Líneas de ejecución (Partidas y Metros) */}
            <div>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {currentObra?.tipo === 'tarea' ? 'Líneas de Trabajo (Tareas y Cantidades realizadas)' : 'Líneas de Producción (Metros o unidades ejecutadas)'}
              </h3>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {formLineas.map((linea, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.75rem',
                      flexWrap: 'wrap',
                      backgroundColor: 'var(--bg-primary)',
                      padding: '0.75rem',
                      borderRadius: 'var(--border-radius)',
                      border: '1px solid var(--border-color)'
                    }}
                  >
                    <div style={{ flex: '2', minWidth: '200px' }}>
                      <label htmlFor={`partida-${index}`} style={{ display: 'none' }}>Partida</label>
                      <select
                        id={`partida-${index}`}
                        value={linea.partida_id}
                        onChange={e => handleLineaChange(index, 'partida_id', e.target.value)}
                        required
                      >
                        <option value="">{currentObra?.tipo === 'tarea' ? 'Selecciona tarea...' : 'Selecciona partida de presupuesto...'}</option>
                        {partidas.map(p => (
                          <option key={p.id} value={p.id}>
                            [{p.codigo}] {p.descripcion.substring(0, 50)}... ({currentObra?.tipo === 'tarea' ? `${Math.round(Number(p.puntos || p.precio_unitario))} pts` : `${isAdmin ? `${p.precio_unitario}€/${p.unidad}` : p.unidad}`})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ flex: '1', minWidth: '100px', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <label htmlFor={`metros-${index}`} style={{ display: 'none' }}>Cantidad ejecutada</label>
                      <input
                        type="number"
                        id={`metros-${index}`}
                        placeholder={currentObra?.tipo === 'tarea' ? "5" : "120"}
                        value={linea.metros_ejecutados || ''}
                        onChange={e => handleLineaChange(index, 'metros_ejecutados', e.target.value)}
                        min="0.1"
                        step="0.1"
                        required
                        style={{ flex: 1 }}
                      />
                      {currentObra?.tipo !== 'tarea' && (
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                          {partidas.find(p => p.id === linea.partida_id)?.unidad || 'm'}
                        </span>
                      )}
                    </div>

                    {formLineas.length > 1 && (
                      <button
                        type="button"
                        className="danger"
                        onClick={() => handleRemoveLinea(index)}
                        style={{ padding: '0.6rem', width: '2.5rem' }}
                        aria-label="Quitar línea"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={handleAddLinea}
                style={{ marginTop: '0.75rem', fontSize: '0.8rem', padding: '0.4rem 0.8rem' }}
              >
                {currentObra?.tipo === 'tarea' ? '+ Añadir Tarea Realizada' : '+ Añadir Partida Trabajada'}
              </button>
            </div>

            {/* Observaciones */}
            <div>
              <label htmlFor="form-obs">Observaciones o Incidencias (Climatología, averías, etc.):</label>
              <textarea
                id="form-obs"
                rows={2}
                value={formObservaciones}
                onChange={e => setFormObservaciones(e.target.value)}
                placeholder="Indica si hubo incidencias"
              />
            </div>

            {/* Acciones del Formulario */}
            <div style={{ display: 'flex', gap: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="submit" className="primary">
                {editingParte ? 'Actualizar Parte Diario' : 'Confirmar y Guardar'}
              </button>
              <button type="button" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
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
                     margin={currentObra?.tipo === 'tarea' ? 1 : metrics.margin}
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
                      const puntos = (linea as any).partida_puntos ?? 0;
                      const totalPuntos = linea.metros_ejecutados * puntos;
                      return (
                        <li key={linea.id}>
                          <code>{linea.partida_codigo}</code> — {linea.partida_descripcion}: <strong>{Math.round(linea.metros_ejecutados)}</strong> ({Math.round(puntos)} pts/ud → <strong>{Math.round(totalPuntos)} pts</strong>)
                        </li>
                      );
                    }
                    const lineRendObj = linea.partida_rendimiento_objetivo ?? config?.rendimiento_default ?? 100;
                    const lineTotalObj = parte.num_personas * lineRendObj;
                    const pct = lineTotalObj > 0 ? (linea.metros_ejecutados / lineTotalObj) * 100 : 0;
                    return (
                      <li key={linea.id}>
                        <code>{linea.partida_codigo}</code> — {linea.metros_ejecutados} {linea.partida_unidad} 
                        {!isJefeEquipo && (
                          <span style={{ color: 'var(--text-tertiary)', marginLeft: '0.5rem' }}>
                            (Objetivo: {lineTotalObj} {linea.partida_unidad} | {pct.toFixed(0)}% cumpl.)
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
                      display: 'flex',
                      gap: '2rem',
                      backgroundColor: 'var(--bg-secondary)',
                      padding: '0.75rem 1rem',
                      borderRadius: 'var(--border-radius)',
                      fontSize: '0.85rem',
                      border: '1px solid var(--border-color)',
                      marginTop: '0.25rem',
                      marginBottom: '0.25rem',
                      flexWrap: 'wrap'
                    }}
                  >
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Puntos Totales Conseguidos</span>
                      <span style={{ fontWeight: 700, color: 'var(--status-blue)', fontSize: '1rem' }}>
                        {((parte.lineas?.reduce((sum, l) => sum + l.metros_ejecutados * ((l as any).partida_puntos ?? 0), 0)) ?? 0).toFixed(0)} pts
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Objetivo del Día</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                        {(parte.num_personas * (config?.puntos_objetivo_dia ?? 10)).toFixed(0)} pts
                      </span>
                    </div>
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>% Cumplimiento</span>
                      <span style={{ fontWeight: 700, color: metrics.status === 'rojo' ? 'var(--status-red)' : metrics.status === 'verde' ? 'var(--status-green)' : 'var(--status-blue)', fontSize: '1.05rem' }}>
                        {metrics.compliancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                ) : (
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
                    <div>
                      <span style={{ display: 'block', color: 'var(--text-tertiary)', fontSize: '0.7rem', textTransform: 'uppercase', fontWeight: 600, letterSpacing: '0.03em' }}>Cumplimiento</span>
                      <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {metrics.compliancePct.toFixed(1)}%
                      </span>
                    </div>
                  </div>
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
