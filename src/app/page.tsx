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
  const { currentUser, section, setSection, usuarios, setCurrentUser, obras, currentObra, setCurrentObra, refreshAll, initialLoaded } = useApp();
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
        padding: '1.5rem'
      }}>
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
        minHeight: '80vh',
        backgroundColor: 'var(--bg-primary)',
        padding: '2rem',
        textAlign: 'center'
      }}>
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
