import React, { useEffect, useState } from 'react';
import { useApp } from '@/lib/AppContext';


interface HeaderProps {
  currentSection: string;
  setSection: (section: string) => void;
}

export default function Header({ currentSection, setSection }: HeaderProps) {
  const { currentUser, setCurrentUser, isSupabase, obras, currentObra, setCurrentObra, theme, toggleTheme } = useApp();

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
    if (currentObra?.tipo === 'tarea' && (item.id === 'gastos' || item.id === 'simulator')) {
      return false;
    }
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

  const [menuOpen, setMenuOpen] = useState(false);

  const handleNavClick = (sectionId: string) => {
    setSection(sectionId);
    setMenuOpen(false);
  };

  return (
    <>
      <header className="app-header">
        {/* Marca */}
        <div className="header-brand-wrapper">
          <span className="header-brand-title">
            ASDIQA<span style={{ color: '#4cbd6d' }}>.</span>KONTROL
          </span>

          {/* Indicador de conexión de Base de Datos */}
          <span
            title={isSupabase ? "Conectado correctamente" : "Desconectado"}
            className="db-status-indicator"
            style={{ color: isSupabase ? '#4cbd6d' : 'var(--status-red)' }}
          >
            <svg
              width="16"
              height="16"
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

        {/* Desktop Selector de Obra (Oculto en móvil) */}
        {currentUser && obras.length > 0 && (
          <div className="header-select-wrapper-desktop">
            <select
              value={currentObra?.id || ''}
              onChange={e => {
                const matched = obras.find(o => o.id === e.target.value);
                setCurrentObra(matched || null);
              }}
              className="header-select-obra"
            >
              <option value="" disabled>Seleccionar Obra...</option>
              {obras.map(o => (
                <option key={o.id} value={o.id}>
                  {o.nombre}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Desktop Navegación (Oculto en móvil) */}
        <nav aria-label="Navegación principal" className="header-nav-desktop">
          {visibleMenuItems.map(item => {
            const isActive = currentSection === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setSection(item.id)}
                className={`nav-item-btn ${isActive ? 'active' : ''}`}
                aria-current={isActive ? 'page' : undefined}
              >
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Desktop Controles de Perfil, Tema y Cerrar Sesión (Oculto en móvil) */}
        <div className="header-controls-desktop">
          {currentUser && (
            <div className="user-profile-info">
              <span className="user-name">
                {currentUser.nombre}
                <span className="user-role-badge">
                  {currentUser.rol === 'admin' ? 'ADMIN' : currentUser.rol === 'jefe_equipo' ? 'ENCARGADO' : 'LECTOR'}
                </span>
              </span>
              <button
                type="button"
                onClick={() => setCurrentUser(null)}
                className="logout-btn"
                title="Cerrar Sesión"
                aria-label="Cerrar Sesión"
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

          <button
            type="button"
            onClick={toggleTheme}
            className="theme-toggle-btn"
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
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

        {/* Botón de Hamburguesa (Solo visible en móvil) */}
        <button
          type="button"
          className="menu-toggle-btn"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-expanded={menuOpen}
          aria-label="Toggle menu"
        >
          {menuOpen ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
          )}
        </button>
      </header>

      {/* Mobile Drawer/Dropdown Panel (Visible en móvil cuando está abierto) */}
      {menuOpen && (
        <div className="header-menu-drawer-mobile">
          {currentUser && obras.length > 0 && (
            <div className="drawer-section">
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', marginBottom: '0.25rem', display: 'block' }}>Proyecto Activo</label>
              <select
                value={currentObra?.id || ''}
                onChange={e => {
                  const matched = obras.find(o => o.id === e.target.value);
                  setCurrentObra(matched || null);
                  setMenuOpen(false);
                }}
                className="drawer-select-obra"
              >
                <option value="" disabled>Seleccionar Obra...</option>
                {obras.map(o => (
                  <option key={o.id} value={o.id}>
                    {o.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}

          <nav aria-label="Navegación principal móvil" className="drawer-nav">
            {visibleMenuItems.map(item => {
              const isActive = currentSection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleNavClick(item.id)}
                  className={`drawer-nav-item ${isActive ? 'active' : ''}`}
                >
                  {item.label}
                </button>
              );
            })}
          </nav>

          <div className="drawer-footer">
            {currentUser && (
              <div className="drawer-user-info">
                <span className="user-name">
                  {currentUser.nombre}
                  <span className="user-role-badge">
                    {currentUser.rol === 'admin' ? 'ADMIN' : currentUser.rol === 'jefe_equipo' ? 'ENCARGADO' : 'LECTOR'}
                  </span>
                </span>
              </div>
            )}
            
            <div className="drawer-footer-actions">
              <button
                type="button"
                onClick={() => {
                  toggleTheme();
                  setMenuOpen(false);
                }}
                className="drawer-action-btn"
                aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
              >
                {theme === 'light' ? 'Modo Oscuro' : 'Modo Claro'}
              </button>
              
              <button
                type="button"
                onClick={() => {
                  setCurrentUser(null);
                  setMenuOpen(false);
                }}
                className="drawer-action-btn logout"
              >
                Cerrar Sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
