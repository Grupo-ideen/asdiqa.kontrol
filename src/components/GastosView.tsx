'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { Gasto } from '@/lib/types';

export default function GastosView() {
  const { gastos, brigadas, partidas, currentUser, refreshAll, showToast, currentObra, showConfirm } = useApp();

  // Filtros de listado
  const [filterBrigada, setFilterBrigada] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterConcepto, setFilterConcepto] = useState('');
  const [filterPartida, setFilterPartida] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Estados del Formulario (Creación)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formFecha, setFormFecha] = useState(new Date().toISOString().split('T')[0]);
  const [formCategoria, setFormCategoria] = useState<'Material' | 'Trabajador' | 'Opcional' | 'Varios'>('Material');
  const [formConcepto, setFormConcepto] = useState('');
  const [formImporte, setFormImporte] = useState(0);
  const [formBrigadaId, setFormBrigadaId] = useState('');
  const [formPartidaId, setFormPartidaId] = useState('');
  const [formProveedor, setFormProveedor] = useState('');
  const [formTipoCoste, setFormTipoCoste] = useState<'unico' | 'mensual' | 'diario'>('unico');

  const isReadOnly = currentUser?.rol === 'lector';

  // Guardar Gasto
  const handleSaveGasto = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!formBrigadaId || !formConcepto || formImporte <= 0 || !formFecha) {
      showToast('Por favor rellena todos los campos obligatorios y asegúrate de que el importe sea mayor que 0.', 'error');
      return;
    }

    try {
      const gastoData: Gasto = {
        id: `g-temp`,
        fecha: formFecha,
        categoria: formCategoria,
        concepto: formConcepto,
        importe: Number(formImporte),
        tipo_coste: formTipoCoste,
        brigada_id: formBrigadaId,
        partida_id: formPartidaId || null,
        proveedor: formProveedor || null,
        creado_por: currentUser?.id || null,
        obra_id: currentObra?.id || ''
      };

      await Services.saveGasto(gastoData);
      setIsFormOpen(false);
      resetForm();
      await refreshAll();
      showToast('Gasto registrado con éxito.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar el gasto.', 'error');
    }
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

  const resetForm = () => {
    setFormFecha(new Date().toISOString().split('T')[0]);
    setFormCategoria('Material');
    setFormConcepto('');
    setFormImporte(0);
    setFormBrigadaId(brigadas[0]?.id || '');
    setFormPartidaId('');
    setFormProveedor('');
    setFormTipoCoste('unico');
  };

  // Abrir formulario
  const handleOpenForm = () => {
    resetForm();
    setIsFormOpen(true);
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
        {!isReadOnly && !isFormOpen && (
          <button onClick={handleOpenForm} className="primary">
            + Registrar Gasto
          </button>
        )}
      </div>

      {/* FORMULARIO DE ALTA */}
      {isFormOpen && !isReadOnly && (
        <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Registrar Nuevo Gasto</h2>
          
          <form onSubmit={handleSaveGasto} style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1rem' }}>
            <div>
              <label htmlFor="form-fecha">Fecha del Gasto:</label>
              <input
                type="date"
                id="form-fecha"
                value={formFecha}
                onChange={e => setFormFecha(e.target.value)}
                required
              />
            </div>

            <div>
              <label htmlFor="form-categoria">Categoría:</label>
              <select
                id="form-categoria"
                value={formCategoria}
                onChange={e => setFormCategoria(e.target.value as 'Material' | 'Trabajador' | 'Opcional' | 'Varios')}
                required
              >
                <option value="Material">Material</option>
                <option value="Trabajador">Trabajador (Mano de obra)</option>
                <option value="Opcional">Opcional (Extra/Otros)</option>
                <option value="Varios">Varios (Maquinaria/Transporte)</option>
              </select>
            </div>

            <div>
              <label htmlFor="form-concepto">Concepto (Descripción libre):</label>
              <input
                type="text"
                id="form-concepto"
                value={formConcepto}
                onChange={e => setFormConcepto(e.target.value)}
                placeholder="Ej. Alquiler retroexcavadora, Tubo PVC"
                required
              />
            </div>

            <div>
              <label htmlFor="form-importe">Importe Coste (€):</label>
              <input
                type="number"
                id="form-importe"
                value={formImporte || ''}
                onChange={e => setFormImporte(Number(e.target.value))}
                min="0.01"
                step="0.01"
                required
              />
            </div>

            <div>
              <label htmlFor="form-tipo-coste">Periodicidad del Gasto / Tipo de Coste:</label>
              <select
                id="form-tipo-coste"
                value={formTipoCoste}
                onChange={e => setFormTipoCoste(e.target.value as 'unico' | 'mensual' | 'diario')}
                required
              >
                <option value="unico">Gasto Único (Imputado en la fecha del registro)</option>
                <option value="mensual">Gasto Mensual (Prorrateado entre los días trabajados del mes)</option>
                <option value="diario">Gasto Diario (Coste fijo por cada día de trabajo)</option>
              </select>
            </div>

            <div>
              <label htmlFor="form-brigada">Brigada Imputada:</label>
              <select
                id="form-brigada"
                value={formBrigadaId}
                onChange={e => setFormBrigadaId(e.target.value)}
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
              <label htmlFor="form-partida">Código de Partida asociado (Opcional):</label>
              <select
                id="form-partida"
                value={formPartidaId}
                onChange={e => setFormPartidaId(e.target.value)}
              >
                <option value="">No asociado a partida específica</option>
                {partidas.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} - {p.descripcion.substring(0, 30)}...
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="form-proveedor">Proveedor / Trazabilidad (Opcional):</label>
              <input
                type="text"
                id="form-proveedor"
                value={formProveedor}
                onChange={e => setFormProveedor(e.target.value)}
                placeholder="Ej. Suministros Martínez S.A."
              />
            </div>

            <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '0.5rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
              <button type="submit" className="primary">
                Guardar Gasto
              </button>
              <button type="button" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </button>
            </div>
          </form>
        </div>
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
            {filteredGastos.map(g => (
              <tr key={g.id}>
                <td>{g.fecha}</td>
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
                    <button
                      onClick={() => handleDeleteGasto(g.id)}
                      className="danger"
                      style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                    >
                      Eliminar
                    </button>
                  </td>
                )}
              </tr>
            ))}
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
