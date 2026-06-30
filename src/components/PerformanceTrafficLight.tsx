import React from 'react';

interface TrafficLightProps {
  status: 'rojo' | 'verde' | 'azul';
  compliance: number;
  margin: number;
  compact?: boolean;
  isTarea?: boolean;
}

export default function PerformanceTrafficLight({
  status,
  compliance,
  margin,
  compact = false,
  isTarea = false
}: TrafficLightProps) {
  const roundedCompliance = compliance.toFixed(1);
  const formattedMargin = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(margin);

  // Colores e iconos accesibles
  const statusStyles = {
    rojo: {
      color: 'var(--status-red)',
      bg: 'var(--status-red-bg)',
      border: 'var(--status-red-border)',
      label: isTarea ? 'Deficiente' : (margin < 0 ? 'Pérdidas' : 'Deficiente'),
      desc: isTarea ? 'No cumple objetivo de puntos' : (margin < 0 ? 'Margen negativo (pérdidas)' : 'No cumple objetivo de rendimiento')
    },
    verde: {
      color: 'var(--status-green)',
      bg: 'var(--status-green-bg)',
      border: 'var(--status-green-border)',
      label: 'Estable',
      desc: isTarea ? 'Cumple objetivo de puntos' : 'Cumple objetivo con margen positivo'
    },
    azul: {
      color: 'var(--status-blue)',
      bg: 'var(--status-blue-bg)',
      border: 'var(--status-blue-border)',
      label: 'Sobresaliente',
      desc: isTarea ? 'Supera objetivo de puntos' : 'Supera objetivo con margen positivo'
    }
  };

  const style = statusStyles[status] || statusStyles.rojo;

  // Renderizar iconos vectoriales del mismo tamaño exacto
  const renderIcon = (iconSize: number) => {
    const svgStyle = { display: 'inline-block', verticalAlign: 'middle' };
    switch (status) {
      case 'rojo':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={svgStyle}>
            <circle cx="5" cy="5" r="4.5" />
          </svg>
        );
      case 'verde':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={svgStyle}>
            <polygon points="5,0.5 10,9.5 0,9.5" />
          </svg>
        );
      case 'azul':
        return (
          <svg width={iconSize} height={iconSize} viewBox="0 0 10 10" fill="currentColor" aria-hidden="true" style={svgStyle}>
            <polygon points="5,0.5 6.3,3.8 9.8,3.8 7,5.9 8.1,9.3 5,7.2 1.9,9.3 3,5.9 0.2,3.8 3.7,3.8" />
          </svg>
        );
    }
  };

  if (compact) {
    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '0.35rem',
          padding: '0.2rem 0.5rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          borderRadius: 'var(--border-radius)',
          backgroundColor: style.bg,
          border: `1px solid ${style.border}`,
          color: style.color
        }}
        title={isTarea ? `${style.label}: ${style.desc} (${roundedCompliance}% cumpl.)` : `${style.label}: ${style.desc} (${roundedCompliance}% cumpl., ${formattedMargin} margen)`}
      >
        <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
          {renderIcon(10)}
        </span>
        <span>{roundedCompliance}%</span>
      </span>
    );
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '0.5rem',
        padding: '1rem',
        borderRadius: 'var(--border-radius)',
        backgroundColor: style.bg,
        border: `1px solid ${style.border}`,
        color: style.color
      }}
      role="status"
      aria-label={isTarea ? `Rendimiento: ${style.label}. Cumplimiento ${roundedCompliance}%.` : `Rendimiento: ${style.label}. Cumplimiento ${roundedCompliance}%. Margen ${formattedMargin}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
          <span aria-hidden="true" style={{ display: 'inline-flex', alignItems: 'center' }}>
            {renderIcon(12)}
          </span>
          <span style={{ fontSize: '0.95rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            {style.label}
          </span>
        </div>
        <span style={{ fontSize: '0.85rem', opacity: 0.85 }}>{style.desc}</span>
      </div>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isTarea ? '1fr' : '1fr 1fr', 
        gap: '1rem', 
        marginTop: '0.25rem', 
        paddingTop: '0.5rem', 
        borderTop: `1px dashed ${style.border}` 
      }}>
        <div>
          <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Cumplimiento</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{roundedCompliance}%</span>
        </div>
        {!isTarea && (
          <div>
            <span style={{ display: 'block', fontSize: '0.75rem', textTransform: 'uppercase', opacity: 0.8 }}>Margen Neto</span>
            <span style={{ fontSize: '1.15rem', fontWeight: 700 }}>{formattedMargin}</span>
          </div>
        )}
      </div>
    </div>
  );
}

