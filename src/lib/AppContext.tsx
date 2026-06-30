'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { Usuario, Partida, Brigada, ParteTrabajo, Gasto, AppConfig, Recurso, Obra, UsuarioObra } from './types';
import { Services } from './services';
import { isSupabaseConfigured } from './supabase';
import { calculateBrigadePeriodMetrics } from './calculations';

interface AppContextProps {
  currentUser: Usuario | null;
  setCurrentUser: (user: Usuario | null) => void;
  usuarios: Usuario[];
  partidas: Partida[];
  brigadas: Brigada[];
  partes: ParteTrabajo[];
  gastos: Gasto[];
  recursos: Recurso[];
  config: AppConfig | null;
  isSupabase: boolean;
  loading: boolean;
  initialLoaded: boolean;
  refreshAll: () => Promise<void>;
  showToast: (message: string, type?: 'success' | 'error') => void;
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  section: string;
  setSection: (section: string) => void;
  selectedBrigadaFilter: string;
  setSelectedBrigadaFilter: (id: string) => void;
  obras: Obra[];
  currentObra: Obra | null;
  setCurrentObra: (obra: Obra | null) => void;
  usuariosObras: UsuarioObra[];
  theme: 'light' | 'dark';
  toggleTheme: () => void;
}

const AppContext = createContext<AppContextProps | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUserState] = useState<Usuario | null>(null);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [partidas, setPartidas] = useState<Partida[]>([]);
  const [brigadas, setBrigadas] = useState<Brigada[]>([]);
  const [partes, setPartes] = useState<ParteTrabajo[]>([]);
  const [gastos, setGastos] = useState<Gasto[]>([]);
  const [recursos, setRecursos] = useState<Recurso[]>([]);
  const [config, setConfig] = useState<AppConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  
  // Estados de obras y mapeos
  const [obras, setObras] = useState<Obra[]>([]);
  const [currentObra, setCurrentObraState] = useState<Obra | null>(null);
  const [usuariosObras, setUsuariosObras] = useState<UsuarioObra[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Inicializar tema
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('kontrol_theme') as 'light' | 'dark' | null;
      const initialTheme = savedTheme || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      setTheme(initialTheme);
      document.documentElement.setAttribute('data-theme', initialTheme);
    }
  }, []);

  const toggleTheme = useCallback(() => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    if (typeof window !== 'undefined') {
      localStorage.setItem('kontrol_theme', nextTheme);
      document.documentElement.setAttribute('data-theme', nextTheme);
    }
  }, [theme]);

  // Estados globales de navegación
  const [section, setSection] = useState('dashboard');
  const [selectedBrigadaFilter, setSelectedBrigadaFilter] = useState('');

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
  }, []);

  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  const showConfirm = useCallback((title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  }, []);

  const setCurrentObra = useCallback((obra: Obra | null) => {
    setCurrentObraState(obra);
    if (typeof window !== 'undefined') {
      if (obra) {
        localStorage.setItem('kontrol_current_obra_id', obra.id);
      } else {
        localStorage.removeItem('kontrol_current_obra_id');
      }
    }
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const refreshAll = useCallback(async () => {
    if (!initialLoaded) {
      setLoading(true);
    }
    try {
      // 1. Cargar usuarios, obras y accesos
      const [u, allObs, uObs] = await Promise.all([
        Services.getUsuarios(),
        Services.getObras(),
        Services.getUsuariosObras()
      ]);

      setUsuarios(u);
      setObras(allObs);
      setUsuariosObras(uObs);

      // 2. Resolver usuario conectado
      let loggedUser: Usuario | null = null;
      if (typeof window !== 'undefined') {
        const savedUserId = localStorage.getItem('kontrol_user_id');
        const savedUser = u.find(user => user.id === savedUserId);
        if (savedUser) {
          loggedUser = savedUser;
          setCurrentUserState(savedUser);
        } else {
          setCurrentUserState(null);
        }
      }

      // 3. Resolver obras permitidas
      let permittedObras: Obra[] = [];
      if (loggedUser) {
        if (loggedUser.rol === 'admin') {
          permittedObras = allObs;
        } else if (loggedUser.rol === 'lector') {
          const userObraIds = uObs.filter(uo => uo.usuario_id === loggedUser!.id).map(uo => uo.obra_id);
          permittedObras = allObs.filter(o => userObraIds.includes(o.id));
        } else if (loggedUser.rol === 'jefe_equipo') {
          const allBrigadas = await Services.getAllBrigadas();
          const myBrigadas = allBrigadas.filter(b => b.jefe_equipo_id === loggedUser!.id);
          const userObraIds = Array.from(new Set(myBrigadas.map(b => b.obra_id)));
          permittedObras = allObs.filter(o => userObraIds.includes(o.id));
        }
      }
      setObras(loggedUser ? permittedObras : allObs);

      // 4. Determinar obra activa
      let activeObra: Obra | null = null;
      if (loggedUser && permittedObras.length > 0) {
        const savedObraId = typeof window !== 'undefined' ? localStorage.getItem('kontrol_current_obra_id') : null;
        const matchedObra = permittedObras.find(o => o.id === savedObraId);
        if (matchedObra) {
          activeObra = matchedObra;
        } else if (permittedObras.length === 1) {
          activeObra = permittedObras[0];
        }
      }
      setCurrentObraState(activeObra);

      // 5. Cargar datos específicos si hay obra activa
      if (activeObra) {
        const [p, b, pt, g, r, c] = await Promise.all([
          Services.getPartidas(activeObra.id),
          Services.getBrigadas(activeObra.id),
          Services.getPartesTrabajo(activeObra.id),
          Services.getGastos(activeObra.id),
          Services.getRecursos(activeObra.id),
          Services.getConfig(activeObra.id)
        ]);

        setPartidas(p);
        setBrigadas(b);
        setPartes(pt);
        setGastos(g);
        setRecursos(r);
        setConfig(c);
      } else {
        setPartidas([]);
        setBrigadas([]);
        setPartes([]);
        setGastos([]);
        setRecursos([]);
        setConfig(null);
      }

      setInitialLoaded(true);
    } catch (e) {
      console.error('Error al recargar datos de la aplicación:', e);
    } finally {
      setLoading(false);
    }
  }, [initialLoaded]);

  // Cargar datos cuando cambie la obra activa
  useEffect(() => {
    if (currentUser && currentObra && initialLoaded) {
      const loadObraData = async () => {
        setLoading(true);
        try {
          const [p, b, pt, g, r, c] = await Promise.all([
            Services.getPartidas(currentObra.id),
            Services.getBrigadas(currentObra.id),
            Services.getPartesTrabajo(currentObra.id),
            Services.getGastos(currentObra.id),
            Services.getRecursos(currentObra.id),
            Services.getConfig(currentObra.id)
          ]);
          setPartidas(p);
          setBrigadas(b);
          setPartes(pt);
          setGastos(g);
          setRecursos(r);
          setConfig(c);
        } catch (e) {
          console.error('Error al cambiar de obra:', e);
        } finally {
          setLoading(false);
        }
      };
      loadObraData();
    }
  }, [currentObra, currentUser, initialLoaded]);

  const setCurrentUser = (user: Usuario | null) => {
    setInitialLoaded(false);
    setCurrentUserState(user);
    if (typeof window !== 'undefined') {
      if (user) {
        localStorage.setItem('kontrol_user_id', user.id);
      } else {
        localStorage.removeItem('kontrol_user_id');
        localStorage.removeItem('kontrol_current_obra_id');
        setCurrentObraState(null);
      }
    }
    // Forzar actualización inmediata de permisos y obras
    refreshAll();
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      refreshAll();
    }, 0);
    return () => clearTimeout(timer);
  }, [refreshAll]);

  // Actualizar favicon dinámicamente según el estado del proyecto activo en el mes actual
  useEffect(() => {
    function updateFavicon(status: 'rojo' | 'verde' | 'azul') {
      if (typeof window === 'undefined') return;

      let color = '#4cbd6d'; // verde por defecto
      if (status === 'rojo') {
        color = '#c53030';
      } else if (status === 'azul') {
        color = '#2b6cb0';
      }

      const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" width="32" height="32">
        <rect width="32" height="32" rx="6" fill="#0a0a0a"/>
        <circle cx="16" cy="16" r="9" fill="${color}"/>
      </svg>`;

      const links: NodeListOf<HTMLLinkElement> = document.querySelectorAll("link[rel*='icon']");
      if (links.length > 0) {
        links.forEach(l => {
          l.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
        });
      } else {
        const link = document.createElement('link');
        link.rel = 'icon';
        link.href = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
        document.head.appendChild(link);
      }
    }

    if (!currentObra || !config || brigadas.length === 0) {
      updateFavicon('verde');
      return;
    }

    try {
      const d = new Date();
      const fechaInicio = new Date(d.getFullYear(), d.getMonth(), 1).toISOString().split('T')[0];
      const fechaFin = d.toISOString().split('T')[0];
      const isTarea = currentObra.tipo === 'tarea';

      const brigadeMetricsList = brigadas.map(b => {
        return calculateBrigadePeriodMetrics(
          b.id,
          b.nombre,
          b.jefe_nombre || 'Sin asignar',
          partes,
          gastos,
          config,
          recursos,
          fechaInicio,
          fechaFin,
          currentObra.tipo
        );
      });

      const totalRevenue = brigadeMetricsList.reduce((sum, item) => sum + item.revenue, 0);
      const totalExpenses = brigadeMetricsList.reduce((sum, item) => sum + item.expenses, 0);
      const totalMargin = totalRevenue - totalExpenses;
      const avgCompliance = brigadeMetricsList.length > 0 
        ? brigadeMetricsList.reduce((sum, item) => sum + item.averageCompliance, 0) / brigadeMetricsList.length 
        : 0;

      let status: 'rojo' | 'verde' | 'azul' = 'rojo';
      if (isTarea) {
        if (avgCompliance < config.umbral_verde) {
          status = 'rojo';
        } else if (avgCompliance >= config.umbral_verde && avgCompliance < config.umbral_azul) {
          status = 'verde';
        } else {
          status = 'azul';
        }
      } else {
        if (avgCompliance < config.umbral_verde || totalMargin <= config.margen_minimo) {
          status = 'rojo';
        } else if (avgCompliance >= config.umbral_verde && avgCompliance < config.umbral_azul) {
          status = 'verde';
        } else {
          status = 'azul';
        }
      }

      updateFavicon(status);
    } catch (e) {
      console.error('Error al calcular estado del proyecto para el favicon:', e);
      updateFavicon('verde');
    }
  }, [currentObra, config, partes, gastos, recursos, brigadas]);

  return (
    <AppContext.Provider
      value={{
        currentUser,
        setCurrentUser,
        usuarios,
        partidas,
        brigadas,
        partes,
        gastos,
        recursos,
        config,
        isSupabase: isSupabaseConfigured,
        loading,
        initialLoaded,
        refreshAll,
        showToast,
        showConfirm,
        section,
        setSection,
        selectedBrigadaFilter,
        setSelectedBrigadaFilter,
        obras,
        currentObra,
        setCurrentObra,
        usuariosObras,
        theme,
        toggleTheme
      }}
    >
      {children}
      
      {/* Toast Notification Minimalista */}
      {toast && (
        <div
          style={{
            position: 'fixed',
            bottom: '2rem',
            left: '2rem',
            zIndex: 9999,
            backgroundColor: toast.type === 'error' ? 'var(--status-red-bg)' : 'var(--accent)',
            color: toast.type === 'error' ? 'var(--status-red)' : 'var(--accent-foreground)',
            border: `1px solid ${toast.type === 'error' ? 'var(--status-red-border)' : 'var(--border-color)'}`,
            padding: '0.75rem 1.25rem',
            borderRadius: 'var(--border-radius)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            fontSize: '0.9rem',
            fontWeight: 500,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          role="alert"
          aria-live="assertive"
        >
          <span>{toast.type === 'error' ? '✕' : '✓'}</span>
          <span>{toast.message}</span>
          <style>{`
            @keyframes fadeIn {
              from { opacity: 0; transform: translateY(10px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}

      {/* Modal de Confirmación Premium */}
      {confirmModal.isOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: '1.5rem',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          <div
            style={{
              backgroundColor: 'var(--bg-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--border-radius)',
              maxWidth: '400px',
              width: '100%',
              padding: '1.75rem',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              animation: 'scaleUp 0.15s ease-out'
            }}
          >
            <h3 style={{ fontSize: '1.15rem', fontWeight: 700, margin: '0 0 0.75rem 0', color: 'var(--text-primary)' }}>
              {confirmModal.title}
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', margin: '0 0 1.5rem 0', lineHeight: 1.5 }}>
              {confirmModal.message}
            </p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  borderColor: 'var(--border-color)',
                  backgroundColor: 'transparent',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer'
                }}
              >
                Cancelar
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="danger"
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp debe usarse dentro de un AppProvider');
  }
  return context;
}
