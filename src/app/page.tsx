'use client';

import React, { useState } from 'react';
import { useApp } from '@/lib/AppContext';
import Header from '@/components/Header';
import DashboardView from '@/components/DashboardView';
import PartesView from '@/components/PartesView';
import GastosView from '@/components/GastosView';
import ConfigView from '@/components/ConfigView';
import SimulatorView from '@/components/SimulatorView';

import { Services } from '@/lib/services';

export default function Home() {
  const { currentUser, section, setSection, usuarios, setCurrentUser, obras, currentObra, setCurrentObra, refreshAll, initialLoaded, theme, toggleTheme } = useApp();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const user = usuarios.find(u => u.username && u.username.toLowerCase() === username.toLowerCase());
    
    // Validar contraseña (por defecto es 123456 si no está definida en la base de datos)
    const storedPassword = user?.password || '123456';
    if (user && storedPassword === password) {
      setCurrentUser(user);
      setErrorMsg('');
    } else {
      setErrorMsg('Usuario o contraseña incorrectos.');
    }
  };

  if (!initialLoaded) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100vh',
          gap: '1rem',
          backgroundColor: 'var(--bg-primary)',
          color: 'var(--text-primary)'
        }}
        role="status"
        aria-live="polite"
      >
        <span
          style={{
            width: '2rem',
            height: '2rem',
            border: '2px solid var(--border-color)',
            borderTopColor: 'var(--text-primary)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }}
          aria-hidden="true"
        />
        <span style={{ fontSize: '0.9rem', fontWeight: 500 }}>Cargando base de datos...</span>
        <style>{`
          @keyframes spin {
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        padding: '1.5rem',
        position: 'relative'
      }}>
        {/* Theme Toggle Button */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            style={{
              padding: '0.5rem',
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '50%',
              borderColor: 'var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer'
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
                <line x1="4.22" y1="19.22" x2="5.64" y2="17.78" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>

        <div style={{
          width: '100%',
          maxWidth: '400px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '2.5rem 2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
        }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <h1 style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              letterSpacing: '-0.03em',
              marginBottom: '0.5rem'
            }}>
              ASDIQA<span style={{ color: '#4cbd6d' }}>.</span>KONTROL
            </h1>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-tertiary)', margin: 0 }}>
              Introduce tus credenciales para acceder
            </p>
          </div>

          {errorMsg && (
            <div style={{
              backgroundColor: 'var(--status-red-bg)',
              color: 'var(--status-red)',
              border: '1px solid var(--status-red-border)',
              padding: '0.75rem',
              borderRadius: 'var(--border-radius)',
              fontSize: '0.85rem',
              fontWeight: 500,
              marginBottom: '1.25rem',
              textAlign: 'center'
            }}>
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div>
              <label htmlFor="login-username" style={{ fontWeight: 600 }}>Usuario:</label>
              <input
                type="text"
                id="login-username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Nombre de usuario (ej. admin o carlos)"
                required
                style={{ marginTop: '0.25rem' }}
              />
            </div>

            <div>
              <label htmlFor="login-password" style={{ fontWeight: 600 }}>Contraseña:</label>
              <input
                type="password"
                id="login-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{ marginTop: '0.25rem' }}
              />
            </div>

            <button type="submit" className="primary" style={{ width: '100%', padding: '0.75rem', marginTop: '0.5rem' }}>
              Iniciar Sesión
            </button>
          </form>

        </div>
      </div>
    );
  }

  if (currentUser && !currentObra) {
    return (
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
        textAlign: 'center',
        position: 'relative'
      }}>
        {/* Floating Controls (Theme Toggle and Logout) */}
        <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            type="button"
            onClick={toggleTheme}
            aria-label={theme === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro'}
            style={{
              padding: '0.5rem',
              width: '2.25rem',
              height: '2.25rem',
              borderRadius: '50%',
              borderColor: 'var(--border-color)',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer'
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
                <line x1="4.22" y1="19.22" x2="5.64" y2="17.78" />
                <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
          
          <button
            type="button"
            onClick={() => setCurrentUser(null)}
            style={{
              padding: '0.4rem 0.8rem',
              fontSize: '0.8rem',
              fontWeight: 500,
              height: '2.25rem',
              borderColor: 'var(--border-color)',
              backgroundColor: 'var(--bg-secondary)',
              cursor: 'pointer'
            }}
          >
            Cerrar Sesión
          </button>
        </div>

        <div style={{
          width: '100%',
          maxWidth: '500px',
          backgroundColor: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius)',
          padding: '3rem 2rem',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.03)'
        }}>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1rem' }}>Selecciona una Obra</h2>
          <p style={{ color: 'var(--text-tertiary)', fontSize: '0.9rem', marginBottom: '2rem', lineHeight: '1.5' }}>
            Para acceder al panel de control, por favor selecciona el proyecto u obra en el que deseas trabajar.
          </p>

          {obras.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {obras.map(o => (
                <button
                  key={o.id}
                  onClick={() => setCurrentObra(o)}
                  className="primary"
                  style={{ padding: '0.75rem', width: '100%' }}
                >
                  {o.nombre}
                </button>
              ))}
            </div>
          ) : (
            <div>
              <p style={{ color: 'var(--status-red)', fontWeight: 500, marginBottom: '1.5rem' }}>
                {currentUser.rol === 'admin' 
                  ? 'No hay ninguna obra registrada en el sistema.' 
                  : 'No tienes acceso asignado a ninguna obra activa. Contacta con tu administrador.'}
              </p>
              {currentUser.rol === 'admin' && (
                <button
                  onClick={async () => {
                    const newO = await Services.saveObra({ id: '', nombre: 'Obra Principal (Madrid)' });
                    await refreshAll();
                    setCurrentObra(newO);
                  }}
                  className="primary"
                  style={{ padding: '0.75rem', width: '100%' }}
                >
                  Crear Obra Inicial Automáticamente
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  const renderSection = () => {
    switch (section) {
      case 'dashboard':
        return <DashboardView />;
      case 'partes':
        return <PartesView />;
      case 'gastos':
        return <GastosView />;
      case 'simulator':
        return <SimulatorView />;
      case 'config':
        // Protección de ruta de rol Admin
        if (currentUser.rol !== 'admin') {
          return (
            <div style={{ padding: '3rem', textAlign: 'center' }}>
              <h2>Acceso Denegado</h2>
              <p>Solo los administradores (Jefes de Obra) tienen permisos para modificar la configuración.</p>
              <button className="primary" onClick={() => setSection('dashboard')}>
                Volver al Cuadro de Mando
              </button>
            </div>
          );
        }
        return <ConfigView />;
      default:
        return <DashboardView />;
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Header currentSection={section} setSection={setSection} />
      
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg-primary)' }}>
        {renderSection()}
      </main>

      <footer
        style={{
          borderTop: '1px solid var(--border-color)',
          padding: '1rem',
          textAlign: 'center',
          fontSize: '0.8rem',
          color: 'var(--text-tertiary)',
          backgroundColor: 'var(--bg-secondary)'
        }}
      >
        <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto' }}>
          Asdiqa &copy; {new Date().getFullYear()} — Control de Rendimiento de Obra y Gestión de Gastos.
        </div>
      </footer>
    </div>
  );
}
