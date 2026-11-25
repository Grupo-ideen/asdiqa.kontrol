'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import { agruparMaterialPorDia, DiaMaterial, formatEuros } from '@/lib/materialMats';

/** Días que se muestran de golpe; el resto se cargan con «Mostrar más». */
const DIAS_POR_PAGINA = 30;
const MATERIALES_TOP = 5;

const estiloTarjeta: React.CSSProperties = {
  backgroundColor: 'var(--bg-secondary)',
  padding: '1.25rem',
  borderRadius: 'var(--border-radius)',
  border: '1px solid var(--border-color)'
};

const estiloTituloTarjeta: React.CSSProperties = {
  fontSize: '1rem',
  marginBottom: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em',
  color: 'var(--text-secondary)'
};

/**
 * Material gastado en los partes validados en Asdiqa Mats, agrupado por día y brigada para que
 * no inunde el listado de gastos de obra. Es de solo lectura: se corrige en Mats.
 */
export default function MaterialPartesSection() {
  const { gastos, brigadas } = useApp();

  const [filterBrigada, setFilterBrigada] = useState('');
  const [filterMaterial, setFilterMaterial] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');
  const [diasVisibles, setDiasVisibles] = useState(DIAS_POR_PAGINA);
  const [abiertos, setAbiertos] = useState<Set<string>>(new Set());

  const busqueda = filterMaterial.trim().toLowerCase();
  const gastosFiltrados = gastos.filter(g => {
    if (filterBrigada && g.brigada_id !== filterBrigada) return false;
    if (filterFechaInicio && g.fecha < filterFechaInicio) return false;
    if (filterFechaFin && g.fecha > filterFechaFin) return false;
    if (busqueda && !g.concepto.toLowerCase().includes(busqueda)) return false;
    return true;
  });
  const dias = agruparMaterialPorDia(gastosFiltrados);
  const totalPeriodo = dias.reduce((sum, d) => sum + d.total, 0);
  const topMateriales = calcularTopMateriales(dias);

  const alternar = (clave: string) => {
    setAbiertos(previos => {
      const siguientes = new Set(previos);
      if (siguientes.has(clave)) siguientes.delete(clave);
      else siguientes.add(clave);
      return siguientes;
    });
  };

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        <div style={estiloTarjeta}>
          <h2 style={estiloTituloTarjeta}>Material del Periodo</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.9rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontWeight: 500 }}>Días con material:</span>
              <strong>{dias.length}</strong>
            </div>
            <div style={{ borderTop: '1px solid var(--border-color)', marginTop: '0.5rem', paddingTop: '0.5rem', display: 'flex', justifyContent: 'space-between', fontSize: '1rem', fontWeight: 700 }}>
              <span>Total Periodo:</span>
              <span>{formatEuros(totalPeriodo)}</span>
            </div>
          </div>
        </div>

        <div style={estiloTarjeta}>
          <h2 style={estiloTituloTarjeta}>Materiales con más Coste (Top {MATERIALES_TOP})</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {topMateriales.map(item => (
              <div key={item.nombre} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', fontSize: '0.9rem' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.nombre}</span>
                <strong style={{ whiteSpace: 'nowrap' }}>{formatEuros(item.total)}</strong>
              </div>
            ))}
            {topMateriales.length === 0 && (
              <span style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', textAlign: 'center', display: 'block', padding: '1rem 0' }}>
                No hay datos en el periodo.
              </span>
            )}
          </div>
        </div>
      </div>

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
          <label htmlFor="material-filter-brigada">Brigada:</label>
          <select id="material-filter-brigada" value={filterBrigada} onChange={e => setFilterBrigada(e.target.value)}>
            <option value="">Todas</option>
            {brigadas.map(b => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="material-filter-material">Buscar Material:</label>
          <input
            type="text"
            id="material-filter-material"
            value={filterMaterial}
            onChange={e => setFilterMaterial(e.target.value)}
            placeholder="Código o descripción"
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="material-filter-desde">Desde:</label>
          <input
            type="date"
            id="material-filter-desde"
            value={filterFechaInicio}
            onChange={e => setFilterFechaInicio(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
        </div>
        <div>
          <label htmlFor="material-filter-hasta">Hasta:</label>
          <input
            type="date"
            id="material-filter-hasta"
            value={filterFechaFin}
            onChange={e => setFilterFechaFin(e.target.value)}
            style={{ fontSize: '0.85rem', padding: '0.4rem' }}
          />
        </div>
      </div>

      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            <tr>
              <th style={{ width: '2.75rem' }} aria-label="Desplegar" />
              <th>Fecha</th>
              <th>Brigada</th>
              <th>Materiales</th>
              <th style={{ textAlign: 'right' }}>Importe</th>
            </tr>
          </thead>
          <tbody>
            {dias.slice(0, diasVisibles).map(dia => (
              <FilaDia key={dia.clave} dia={dia} abierto={abiertos.has(dia.clave)} onAlternar={() => alternar(dia.clave)} />
            ))}
            {dias.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                  No hay material de partes de Asdiqa Mats con los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {dias.length > diasVisibles && (
        <div style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem' }}>
          <button onClick={() => setDiasVisibles(n => n + DIAS_POR_PAGINA)}>
            Mostrar más ({dias.length - diasVisibles} días)
          </button>
        </div>
      )}
    </>
  );
}

interface FilaDiaProps {
  dia: DiaMaterial;
  abierto: boolean;
  onAlternar: () => void;
}

function FilaDia({ dia, abierto, onAlternar }: FilaDiaProps) {
  const idDetalle = `material-dia-${dia.clave}`;
  return (
    <>
      <tr onClick={onAlternar} style={{ cursor: 'pointer' }}>
        <td>
          <button
            type="button"
            aria-expanded={abierto}
            aria-controls={idDetalle}
            aria-label={`${abierto ? 'Ocultar' : 'Ver'} el material del ${dia.fecha} de ${dia.brigadaNombre}`}
            onClick={e => {
              e.stopPropagation();
              onAlternar();
            }}
            style={{ padding: '0.25rem 0.5rem', lineHeight: 0 }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              style={{ transform: abierto ? 'rotate(90deg)' : 'none', transition: 'var(--transition)' }}
            >
              <path d="M9 6l6 6-6 6" />
            </svg>
          </button>
        </td>
        <td>{dia.fecha}</td>
        <td>{dia.brigadaNombre}</td>
        <td>{dia.materiales.length}</td>
        <td style={{ textAlign: 'right', fontWeight: 600 }}>{formatEuros(dia.total)}</td>
      </tr>
      {abierto && (
        <tr id={idDetalle}>
          <td />
          <td colSpan={4} style={{ backgroundColor: 'var(--bg-secondary)' }}>
            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
              {dia.materiales.map(({ gasto, codigo, descripcion, cantidad }) => (
                <li key={gasto.id} style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
                  <span>
                    {codigo && <><code>{codigo}</code> — </>}
                    {descripcion}
                    {cantidad && <>: <strong>{cantidad}</strong></>}
                  </span>
                  <span style={{ whiteSpace: 'nowrap' }}>{formatEuros(gasto.importe)}</span>
                </li>
              ))}
            </ul>
          </td>
        </tr>
      )}
    </>
  );
}

/** Materiales que más han costado en los días mostrados, por código (o descripción si no lo hay). */
function calcularTopMateriales(dias: DiaMaterial[]): { nombre: string; total: number }[] {
  const porMaterial = new Map<string, { nombre: string; total: number }>();
  for (const { codigo, descripcion, gasto } of dias.flatMap(d => d.materiales)) {
    const clave = codigo ?? descripcion;
    const previo = porMaterial.get(clave) ?? { nombre: codigo ? `${codigo} — ${descripcion}` : descripcion, total: 0 };
    porMaterial.set(clave, { ...previo, total: previo.total + gasto.importe });
  }
  return [...porMaterial.values()].sort((a, b) => b.total - a.total).slice(0, MATERIALES_TOP);
}
