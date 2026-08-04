'use client';

import React from 'react';
import { ObraProgress, CategoriaProgress } from '@/lib/calculations';
import { formatPuntos } from '@/lib/format';

const currency = new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' });

const COLOR_CABLE = '#3b82f6';
const COLOR_OBRA = '#d97706';
const COLOR_TOTAL = 'var(--status-green)';

function ProgressRow({
  label,
  data,
  color,
  emphasis = false
}: {
  label: string;
  data: CategoriaProgress;
  color: string;
  emphasis?: boolean;
}) {
  const hasBudget = data.presupuesto > 0;
  // La barra se limita al 100% aunque se supere el presupuesto; el texto muestra el % real.
  const fill = hasBudget ? Math.min(100, data.porcentaje) : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem' }}>
        <span style={{ fontWeight: emphasis ? 700 : 600, fontSize: emphasis ? '0.95rem' : '0.85rem' }}>{label}</span>
        <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontVariantNumeric: 'tabular-nums' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{formatPuntos(data.conseguidos)}</strong>
          {' / '}
          {hasBudget ? `${formatPuntos(data.presupuesto)} pts` : '— pts'}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuenow={hasBudget ? Math.round(data.porcentaje) : undefined}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Avance de ${label}`}
        style={{
          height: emphasis ? '0.6rem' : '0.5rem',
          backgroundColor: 'var(--bg-tertiary)',
          borderRadius: '999px',
          overflow: 'hidden'
        }}
      >
        <div
          style={{
            width: `${fill}%`,
            height: '100%',
            backgroundColor: color,
            borderRadius: '999px',
            transition: 'width 0.4s ease'
          }}
        />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '0.75rem', fontSize: '0.8rem' }}>
        <span style={{ fontWeight: 700, color: hasBudget ? color : 'var(--text-tertiary)' }}>
          {hasBudget ? `${data.porcentaje.toFixed(1)}% cumplido` : 'Sin presupuesto'}
        </span>
        <span style={{ color: 'var(--text-secondary)' }}>
          <strong style={{ color: 'var(--text-primary)' }}>{currency.format(data.dinero)}</strong> ganado
        </span>
      </div>
    </div>
  );
}

export default function ObraProgressPanel({ progress }: { progress: ObraProgress }) {
  return (
    <section
      style={{
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--border-radius)',
        padding: '1.5rem'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.25rem' }}>
        <h2 style={{ fontSize: '1.2rem', margin: 0 }}>Avance de la Obra</h2>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Acumulado total · no depende del filtro de fechas
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <ProgressRow label="Cable" data={progress.cable} color={COLOR_CABLE} />
        <ProgressRow label="Obra civil" data={progress.obraCivil} color={COLOR_OBRA} />
        <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '1.25rem' }}>
          <ProgressRow label="Total obra" data={progress.total} color={COLOR_TOTAL} emphasis />
        </div>
      </div>
    </section>
  );
}
