'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { Gasto } from '@/lib/types';
import Modal from './Modal';
import GastoForm from './GastoForm';

export default function GastosView() {
  const { gastos, brigadas, partidas, currentUser, refreshAll, showConfirm } = useApp();

  // Filtros de listado
  const [filterBrigada, setFilterBrigada] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterConcepto, setFilterConcepto] = useState('');
  const [filterPartida, setFilterPartida] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Estados del Formulario (Creación / Edición)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingGasto, setEditingGasto] = useState<Gasto | null>(null);

  const isReadOnly = currentUser?.rol === 'lector';

  // Abrir un gasto existente en el formulario para editarlo
  const handleEditGasto = (g: Gasto) => {
    if (isReadOnly) return;
    setEditingGasto(g);
    setIsFormOpen(true);
  };

  // Borrar Gasto
  const handleDeleteGasto = (id: string) => {
    if (isReadOnly) return;
    showConfirm(
      '¿Borrar gasto?',
      '¿Estás seguro de borrar este gasto? Se recalculará el rendimiento de la brigada para este periodo.',
      async () => {
        await Services.deleteGasto(id);
        await refreshAll();
      }
    );
  };

  // Abrir formulario en modo alta
  const handleOpenForm = () => {
    setEditingGasto(null);
    setIsFormOpen(true);
  };

  const handleCloseForm = () => {
    setIsFormOpen(false);
  };

  // Filtrado de la lista de gastos
  const filteredGastos = gastos.filter(g => {
    if (filterBrigada && g.brigada_id !== filterBrigada) return false;
    if (filterCategoria && g.categoria !== filterCategoria) return false;
    if (filterPartida && g.partida_id !== filterPartida) return false;
    if (filterFechaInicio && g.fecha < filterFechaInicio) return false;
    if (filterFechaFin && g.fecha > filterFechaFin) return false;
    if (filterConcepto && !g.concepto.toLowerCase().includes(filterConcepto.toLowerCase())) return false;
    return true;
  });

  // ==========================================
  // CÁLCULO DE DESGLOSE (ESTADÍSTICAS)
  // ==========================================
  const totalGastado = filteredGastos.reduce((sum, g) => sum + g.importe, 0);

  // Gastos por Categoría
  const desgloseCategorias = {
    Material: 0,
    Trabajador: 0,
    Opcional: 0,
    Varios: 0
  };
  filteredGastos.forEach(g => {
    if (g.categoria in desgloseCategorias) {
      desgloseCategorias[g.categoria] += g.importe;
    }
  });

  // Gastos por Concepto (Top 5 más caros)
  const desgloseConceptos: Record<string, number> = {};
  filteredGastos.forEach(g => {
    const key = g.concepto.trim().toLowerCase();
    desgloseConceptos[key] = (desgloseConceptos[key] || 0) + g.importe;
  });
  
  const sortedConceptos = Object.entries(desgloseConceptos)
    .map(([concepto, total]) => {
      // Intentar encontrar la versión original del texto con mayúsculas correctas
      const original = filteredGastos.find(g => g.concepto.trim().toLowerCase() === concepto)?.concepto || concepto;
      return { concepto: original, total };
    })
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      
      {/* Encabezado de la Sección */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1>Control de Gastos de Obra</h1>
          <p>Imputa facturas, jornales y costes directos a cada brigada para realizar el balance económico.</p>
        </div>
        {!isReadOnly && (
          <button onClick={handleOpenForm} className="primary">
            + Registrar Gasto
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA / EDICIÓN */}
      {!isReadOnly && (
        <Modal
          isOpen={isFormOpen}
          onClose={handleCloseForm}
          title={editingGasto ? 'Editar Gasto' : 'Registrar Nuevo Gasto'}
        >
          <GastoForm editingGasto={editingGasto} onClose={handleCloseForm} />
        </Modal>
      )}

      {/* DASHBOARD RÁPIDO DE DESGLOSE */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Totales por Categoría */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Distribución por Categorías
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {Object.entries(desgloseCategorias).map(([cat, total]) => {
              const pct = totalGastado > 0 ? (total / totalGastado) * 100 : 0;
              return (
                <div key={cat} style={{ display: 'flex', justifyItems: 'center', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                  <span style={{ fontWeight: 500 }}>{cat}:</span>
                  <span>
                    <strong>{total.toFixed(2)} €</strong>{' '}
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>({pct.toFixed(0)}%)</span>
                  </span>
                </div>
              );
            })}
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
              <span>Total Periodo:</span>
              <span>{totalGastado.toFixed(2)} €</span>
            </div>
          </div>
        </div>

        {/* Top Conceptos */}
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.25rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
            Principales Costes (Top 5)
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {sortedConceptos.map((item, idx) => (
              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ textTransform: 'capitalize', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>
                  {item.concepto}
                </span>
                <strong>{item.total.toFixed(2)} €</strong>
              </div>
            ))}
            {sortedConceptos.length === 0 && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', display: 'block', padding: '1rem 0' }}>
                No hay datos en el periodo.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* FILTROS DE BÚSQUEDA */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          backgroundColor: 'var(--bg-secondary)',
          padding: '1rem',
          borderRadius: 'var(--border-radius)',
          border: '1px solid var(--border-color)',
          marginBottom: '1.5rem'
        }}
      >
        <div>
          <label htmlFor="filter-brigada">Brigada:</label>
          <select id="filter-brigada" value={filterBrigada} onChange={e => setFilterBrigada(e.target.value)}>
            <option value="">Todas</option>
            {brigadas.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-categoria">Categoría:</label>
          <select id="filter-categoria" value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}>
            <option value="">Todas</option>
            <option value="Material">Material</option>
            <option value="Trabajador">Trabajador</option>
            <option value="Opcional">Opcional</option>
            <option value="Varios">Varios</option>
          </select>
        </div>

        <div>
          <label htmlFor="filter-partida">Código Partida:</label>
          <select id="filter-partida" value={filterPartida} onChange={e => setFilterPartida(e.target.value)}>
            <option value="">Todas</option>
            {partidas.map(p => (
              <option key={p.id} value={p.id}>
                {p.codigo}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="filter-concepto">Buscar Concepto:</label>
          <input
            type="text"
            id="filter-concepto"
            value={filterConcepto}
            onChange={e => setFilterConcepto(e.target.value)}
            placeholder="Tubo, minicargadora..."
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
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

      {/* LISTADO DE GASTOS REGISTRADOS */}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Categoría</th>
              <th>Concepto</th>
              <th>Tipo</th>
              <th>Brigada</th>
              <th>Partida</th>
              <th>Proveedor</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
              {!isReadOnly && <th style={{ textAlign: 'right' }}>Acciones</th>}
            </tr>
          </thead>
          <tbody>
            {filteredGastos.map(g => {
              const esPeriodico = g.tipo_coste === 'mensual' || g.tipo_coste === 'diario';
              return (
              <tr key={g.id}>
                <td>
                  {g.fecha}
                  {esPeriodico && (
                    <span style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                      {g.fecha_fin ? `hasta ${g.fecha_fin}` : 'en curso'}
                    </span>
                  )}
                </td>
                <td>
                  <span style={{
                    fontSize: '0.75rem',
                    padding: '0.2rem 0.4rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontWeight: 500
                  }}>
                    {g.categoria}
                  </span>
                </td>
                <td style={{ fontWeight: 500 }}>{g.concepto}</td>
                <td>
                  <span style={{
                    fontSize: '0.7rem',
                    textTransform: 'uppercase',
                    padding: '0.15rem 0.35rem',
                    borderRadius: '4px',
                    backgroundColor: 'var(--bg-tertiary)',
                    fontWeight: 600,
                    color: 'var(--text-secondary)'
                  }}>
                    {g.tipo_coste === 'mensual' ? 'Mensual' : g.tipo_coste === 'diario' ? 'Diario' : 'Único'}
                  </span>
                </td>
                <td>{g.brigada_nombre}</td>
                <td>
                  {g.partida_codigo ? <code>{g.partida_codigo}</code> : <span style={{ color: 'var(--text-tertiary)', fontSize: '0.8rem' }}>General</span>}
                </td>
                <td>{g.proveedor || '-'}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{g.importe.toFixed(2)} €</td>
                {!isReadOnly && (
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                      <button
                        onClick={() => handleEditGasto(g)}
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Editar
                      </button>
                      <button
                        onClick={() => handleDeleteGasto(g.id)}
                        className="danger"
                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                      >
                        Eliminar
                      </button>
                    </div>
                  </td>
                )}
              </tr>
              );
            })}
            {filteredGastos.length === 0 && (
              <tr>
                <td colSpan={isReadOnly ? 8 : 9} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                  No se encontraron gastos en este periodo con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
