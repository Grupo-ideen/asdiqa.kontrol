'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';

export default function SimulatorView() {
  const { recursos, partidas } = useApp();

  const [selectedRecursoId, setSelectedRecursoId] = useState('');
  const [selectedPartidaId, setSelectedPartidaId] = useState('');
  const [simulatedMeters, setSimulatedMeters] = useState(100);

  // Buscar recurso y partida seleccionados
  const recurso = recursos.find(r => r.id === selectedRecursoId);
  const partida = partidas.find(p => p.id === selectedPartidaId);

  // Calcular costes del recurso
  const totalMensual = recurso 
    ? Number(recurso.sueldo || 0) + Number(recurso.seguridad_social || 0) + Number(recurso.alojamiento || 0) + Number(recurso.otros_costes || 0)
    : 0;
  
  // Asumimos 20 días laborables al mes
  const costeDiario = totalMensual / 20;

  // Precio unitario
  const precioUnitario = partida ? Number(partida.precio_unitario) : 0;

  // Metros para ser rentable (Break-even): Coste diario / Precio unitario
  const breakEvenMeters = precioUnitario > 0 ? costeDiario / precioUnitario : 0;

  // Simulación interactiva
  const ingresoSimulado = simulatedMeters * precioUnitario;
  const margenSimulado = ingresoSimulado - costeDiario;
  const esRentable = margenSimulado >= 0;

  // Formateadores
  const currencyFormatter = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });
  const decimalFormatter = new Intl.NumberFormat('es-ES', { maximumFractionDigits: 2 });

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      <header style={{ marginBottom: '2rem' }}>
        <h1>Simulador de Rentabilidad Diaria</h1>
        <p>Calcula el rendimiento mínimo (metros/día) que debe hacer cada trabajador o máquina para cubrir sus costes.</p>
      </header>

      {recursos.length === 0 || partidas.length === 0 ? (
        <div style={{ padding: '3rem', textAlign: 'center', backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius)' }}>
          <h2 style={{ fontSize: '1.2rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>Faltan Datos para Simular</h2>
          <p style={{ color: 'var(--text-tertiary)', marginBottom: '1.5rem' }}>
            Para usar el simulador, primero debes configurar recursos y partidas en el panel de administración.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Panel de Configuración de la Simulación */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <h2 style={{ fontSize: '1.1rem', margin: 0 }}>Parámetros de Simulación</h2>
            
            <div>
              <label htmlFor="sim-recurso" style={{ fontWeight: 600 }}>Selecciona un Recurso:</label>
              <select
                id="sim-recurso"
                value={selectedRecursoId}
                onChange={e => {
                  setSelectedRecursoId(e.target.value);
                  // Inicializar el slider cerca del break-even
                  const targetRec = recursos.find(r => r.id === e.target.value);
                  const total = targetRec ? Number(targetRec.sueldo || 0) + Number(targetRec.seguridad_social || 0) + Number(targetRec.alojamiento || 0) + Number(targetRec.otros_costes || 0) : 0;
                  const daily = total / 20;
                  if (partida && partida.precio_unitario > 0) {
                    setSimulatedMeters(Math.ceil(daily / partida.precio_unitario));
                  } else {
                    setSimulatedMeters(100);
                  }
                }}
                required
              >
                <option value="">Selecciona trabajador o máquina...</option>
                {recursos.map(r => (
                  <option key={r.id} value={r.id}>
                    {r.nombre} ({r.tipo === 'trabajador' ? 'Trabajador' : 'Maquinaria'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="sim-partida" style={{ fontWeight: 600 }}>Selecciona una Partida de Obra:</label>
              <select
                id="sim-partida"
                value={selectedPartidaId}
                onChange={e => {
                  setSelectedPartidaId(e.target.value);
                  const targetP = partidas.find(p => p.id === e.target.value);
                  const price = targetP ? Number(targetP.precio_unitario) : 0;
                  if (price > 0) {
                    setSimulatedMeters(Math.ceil(costeDiario / price));
                  }
                }}
                required
              >
                <option value="">Selecciona partida...</option>
                {partidas.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.codigo} — {p.descripcion.substring(0, 50)}... ({p.precio_unitario}€/{p.unidad})
                  </option>
                ))}
              </select>
            </div>

            {recurso && (
              <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1rem', marginTop: '0.5rem' }}>
                <h3 style={{ fontSize: '0.9rem', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)' }}>
                  Estructura de Costes de {recurso.nombre}
                </h3>
                <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.4rem', fontSize: '0.85rem' }}>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Sueldo / Coste base:</span>
                    <strong>{currencyFormatter.format(recurso.sueldo)}/mes</strong>
                  </li>
                  {recurso.tipo === 'trabajador' && (
                    <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Seguridad Social:</span>
                      <strong>{currencyFormatter.format(recurso.seguridad_social)}/mes</strong>
                    </li>
                  )}
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Alojamiento / Dieta:</span>
                    <strong>{currencyFormatter.format(recurso.alojamiento)}/mes</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Otros costes:</span>
                    <strong>{currencyFormatter.format(recurso.otros_costes)}/mes</strong>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px dashed var(--border-color)', paddingTop: '0.4rem', fontWeight: 600, fontSize: '0.9rem', marginTop: '0.2rem' }}>
                    <span>Total Coste Mensual:</span>
                    <span>{currencyFormatter.format(totalMensual)}</span>
                  </li>
                  <li style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    <span>Coste Diario (20 días/mes):</span>
                    <span>{currencyFormatter.format(costeDiario)}/día</span>
                  </li>
                </ul>
              </div>
            )}
          </div>

          {/* Panel de Resultados de la Simulación */}
          <div>
            {!recurso || !partida ? (
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '3rem', backgroundColor: 'var(--bg-secondary)', border: '1px dashed var(--border-color)', borderRadius: 'var(--border-radius)', color: 'var(--text-tertiary)', textAlign: 'center' }}>
                <p>Selecciona un recurso y una partida en el panel de la izquierda para ver la simulación.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                {/* Break-even Info Card */}
                <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
                  <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Umbral de Rentabilidad</h2>
                  <p style={{ fontSize: '0.95rem', lineHeight: '1.45', margin: 0 }}>
                    Para que <strong>{recurso.nombre}</strong> cubra su coste de <strong>{currencyFormatter.format(costeDiario)}/día</strong> trabajando la partida <strong>{partida.codigo}</strong> (precio contratado de <strong>{currencyFormatter.format(precioUnitario)}/{partida.unidad}</strong>), debe producir como mínimo:
                  </p>
                  
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginTop: '1rem', marginBottom: '0.5rem' }}>
                    <span style={{ fontSize: '2.5rem', fontWeight: 800, color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                      {decimalFormatter.format(breakEvenMeters)}
                    </span>
                    <span style={{ fontSize: '1.2rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                      {partida.unidad}/día
                    </span>
                  </div>
                  
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', margin: 0 }}>
                    Cualquier rendimiento diario inferior a este umbral generará pérdidas netas para la obra en este recurso.
                  </p>
                </div>

                {/* Simulador Interactivo */}
                <div style={{
                  backgroundColor: esRentable ? 'var(--status-green-bg)' : 'var(--status-red-bg)',
                  border: `1px solid ${esRentable ? 'var(--status-green-border)' : 'var(--status-red-border)'}`,
                  color: esRentable ? 'var(--status-green)' : 'var(--status-red)',
                  padding: '1.5rem',
                  borderRadius: 'var(--border-radius)',
                  transition: 'all 0.2s ease-in-out'
                }}>
                  <h2 style={{ fontSize: '1.1rem', color: 'inherit', marginBottom: '1rem' }}>
                    Ajuste de Producción Diaria (Simulación)
                  </h2>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 600 }}>
                      <span>Rendimiento Simulado:</span>
                      <span>{simulatedMeters} {partida.unidad}/día</span>
                    </div>
                    <input
                      type="range"
                      min="0"
                      max={Math.max(500, Math.ceil(breakEvenMeters * 3))}
                      value={simulatedMeters}
                      onChange={e => setSimulatedMeters(Number(e.target.value))}
                      style={{
                        width: '100%',
                        cursor: 'pointer',
                        accentColor: esRentable ? 'var(--status-green)' : 'var(--status-red)'
                      }}
                    />
                  </div>

                  {/* Resultados detallados */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', borderTop: '1px dashed currentColor', paddingTop: '1rem' }}>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Ingreso Generado</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currencyFormatter.format(ingresoSimulado)}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Coste Diario</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>{currencyFormatter.format(costeDiario)}</span>
                    </div>
                    <div>
                      <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Margen Neto Diario</span>
                      <span style={{ fontSize: '1.25rem', fontWeight: 800, color: esRentable ? 'var(--status-green)' : 'var(--status-red)' }}>
                        {margenSimulado >= 0 ? '+' : ''}{currencyFormatter.format(margenSimulado)}
                      </span>
                    </div>
                  </div>

                  <div style={{ marginTop: '1.25rem', padding: '0.75rem', borderRadius: '4px', backgroundColor: 'rgba(255, 255, 255, 0.15)', border: '1px solid currentColor', fontSize: '0.85rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                    {esRentable ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
                          <polygon points="5,0.5 10,9.5 0,9.5" />
                        </svg>
                        <span>Rentable: Se obtiene un beneficio de {currencyFormatter.format(margenSimulado)} al día.</span>
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 10 10" fill="currentColor">
                          <circle cx="5" cy="5" r="4.5" />
                        </svg>
                        <span>Pérdidas: Faltan {decimalFormatter.format(breakEvenMeters - simulatedMeters)} {partida.unidad}/día para cubrir costes.</span>
                      </>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
