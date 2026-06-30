import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/AppContext';


interface HeaderProps {
  currentSection: string;
  setSection: (section: string) => void;
}

export default function Header({ currentSection, setSection }: HeaderProps) {
  const { currentUser, setCurrentUser, isSupabase, obras, currentObra, setCurrentObra } = useApp();
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Cargar tema inicial
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('kontrol_theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTimeout(() => {
        setTheme(initialTheme);
      }, 0);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('kontrol_theme', nextTheme);
    document.documentElement.setAttribute('data-theme', nextTheme);
  };

  // Secciones disponibles según el rol
  const menuItems = [
    { id: 'dashboard', label: 'Cuadro de Mando', roles: ['admin', 'lector'] },
    { id: 'partes', label: 'Partes de Trabajo', roles: ['admin', 'jefe_equipo', 'lector'] },
    { id: 'gastos', label: 'Gastos', roles: ['admin', 'lector'] },
    { id: 'simulator', label: 'Simulador', roles: ['admin', 'lector'] },
    { id: 'config', label: 'Configuración', roles: ['admin'] }
  ];

  const visibleMenuItems = menuItems.filter(item => {
    if (!currentUser) return false;
    return item.roles.includes(currentUser.rol);
  });

  // Redirigir al usuario si está en una pestaña no autorizada para su rol
  useEffect(() => {
    if (currentUser && !visibleMenuItems.some(item => item.id === currentSection)) {
      const firstAvailable = visibleMenuItems[0]?.id;
      if (firstAvailable) {
        setSection(firstAvailable);
      }
    }
  }, [currentUser, currentSection, visibleMenuItems, setSection]);

  return (
    <header
      style={{
        borderBottom: '1px solid var(--border-color)',
        backgroundColor: 'var(--bg-secondary)',
        padding: '0.75rem 1.5rem',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '1rem'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <span
          style={{
            fontSize: '1.25rem',
            fontWeight: 700,
            letterSpacing: '-0.03em',
            textTransform: 'uppercase'
          }}
        >
          ASDIQA<span style={{ color: '#4cbd6d' }}>.</span>KONTROL
        </span>

        {/* Selector de Obra */}
        {currentUser && obras.length > 0 && (
          <select
            value={currentObra?.id || ''}
            onChange={e => {
              const matched = obras.find(o => o.id === e.target.value);
              setCurrentObra(matched || null);
            }}
            style={{
              padding: '0.25rem 0.5rem',
              fontSize: '0.8rem',
              fontWeight: 600,
              borderRadius: '4px',
              border: '1px solid var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              cursor: 'pointer',
              outline: 'none',
              marginLeft: '0.5rem'
            }}
          >
            <option value="" disabled>Seleccionar Obra...</option>
            {obras.map(o => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        )}
        
        {/* Indicador de conexión de Base de Datos */}
        <span
          title={isSupabase ? "Conectado correctamente" : "Desconectado"}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: isSupabase ? '#4cbd6d' : 'var(--status-red)',
            cursor: 'default',
            transition: 'opacity 0.2s, transform 0.2s',
            opacity: 0.85,
            alignSelf: 'center',
            padding: '0.25rem'
          }}
          onMouseEnter={e => {
            e.currentTarget.style.opacity = '1';
            e.currentTarget.style.transform = 'scale(1.1)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.opacity = '0.85';
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <ellipse cx="12" cy="5" rx="9" ry="3" />
            <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
            <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
          </svg>
        </span>
      </div>

      {/* Navegación */}
      <nav aria-label="Navegación principal" style={{ display: 'flex', gap: '0.25rem' }}>
        {visibleMenuItems.map(item => {
          const isActive = currentSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setSection(item.id)}
              style={{
                background: isActive ? 'var(--bg-primary)' : 'transparent',
                borderColor: isActive ? 'var(--border-color)' : 'transparent',
                color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                fontWeight: isActive ? 600 : 400,
                padding: '0.4rem 0.8rem',
                fontSize: '0.85rem'
              }}
              aria-current={isActive ? 'page' : undefined}
            >
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Controles de perfil y tema */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
        {currentUser && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginRight: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>
              {currentUser.nombre}
              <span style={{
                fontSize: '0.7rem',
                marginLeft: '0.4rem',
                padding: '0.15rem 0.4rem',
                backgroundColor: 'var(--bg-tertiary)',
                borderRadius: '4px',
                color: 'var(--text-secondary)',
                fontWeight: 600
              }}>
                {currentUser.rol === 'admin' ? 'ADMIN' : currentUser.rol === 'jefe_equipo' ? 'ENCARGADO' : 'LECTOR'}
              </span>
            </span>
            <button
              onClick={() => setCurrentUser(null)}
              title="Cerrar Sesión"
              aria-label="Cerrar Sesión"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '0.4rem',
                width: '2rem',
                height: '2rem',
                borderColor: 'var(--border-color)',
                backgroundColor: 'transparent',
                borderRadius: 'var(--border-radius)',
                cursor: 'pointer',
                color: 'var(--text-secondary)'
              }}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        )}

        {/* Botón de tema */}
        <button
          onClick={toggleTheme}
          aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
          style={{
            padding: '0.4rem',
            width: '2rem',
            height: '2rem',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '0.9rem',
            borderColor: 'var(--border-color)'
          }}
        >
          {theme === 'light' ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
