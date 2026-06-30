'use client';

import React, { useState, useEffect } from 'react';
import { useApp } from '@/lib/AppContext';
import { Services } from '@/lib/services';
import { Partida, Brigada, Usuario, Recurso, Obra } from '@/lib/types';

// Función auxiliar externa para evitar errores de pureza en el render de React
const generateUniqueId = (prefix: string) => `${prefix}-${Date.now()}`;

export default function ConfigView() {
  const { config, partidas, brigadas, usuarios, recursos, refreshAll, showToast, currentObra, obras, showConfirm } = useApp();
  const [activeTab, setActiveTab] = useState<'umbrales' | 'partidas' | 'brigadas' | 'usuarios' | 'recursos' | 'obras'>('umbrales');

  // Estado para umbrales
  const [rendDefault, setRendDefault] = useState(config?.rendimiento_default || 100);
  const [umbVerde, setUmbVerde] = useState(config?.umbral_verde || 100);
  const [umbAzul, setUmbAzul] = useState(config?.umbral_azul || 110);
  const [margenMin, setMargenMin] = useState(config?.margen_minimo || 0);
  const [configSaving, setConfigSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState('');

  // Estado para partidas
  const [selectedPartida, setSelectedPartida] = useState<Partida | null>(null);
  const [partidaCodigo, setPartidaCodigo] = useState('');
  const [partidaDesc, setPartidaDesc] = useState('');
  const [partidaUnidad, setPartidaUnidad] = useState('m');
  const [partidaPrecio, setPartidaPrecio] = useState(0);
  const [partidaMedicion, setPartidaMedicion] = useState(0);
  const [partidaRend, setPartidaRend] = useState(100);
  const [csvError, setCsvError] = useState('');
  const [csvSuccess, setCsvSuccess] = useState('');

  // Estado para brigadas
  const [selectedBrigada, setSelectedBrigada] = useState<Brigada | null>(null);
  const [brigadaNombre, setBrigadaNombre] = useState('');
  const [brigadaJefe, setBrigadaJefe] = useState('');
  const [brigadaHabitual, setBrigadaHabitual] = useState(4);

  // Estado para usuarios
  const [selectedUsuario, setSelectedUsuario] = useState<Usuario | null>(null);
  const [usuarioNombre, setUsuarioNombre] = useState('');
  const [usuarioUsername, setUsuarioUsername] = useState('');
  const [usuarioRol, setUsuarioRol] = useState<'admin' | 'jefe_equipo' | 'lector'>('jefe_equipo');
  const [usuarioPassword, setUsuarioPassword] = useState('');

  const handleSaveUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioNombre || !usuarioUsername) return;

    try {
      const uData: Usuario = {
        id: selectedUsuario?.id || generateUniqueId('u'),
        nombre: usuarioNombre,
        username: usuarioUsername,
        rol: usuarioRol,
        password: usuarioPassword || '123456'
      };

      await Services.saveUsuario(uData);
      setSelectedUsuario(null);
      resetUsuarioForm();
      await refreshAll();
      showToast('Usuario guardado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar usuario.', 'error');
    }
  };

  const handleEditUsuario = (u: Usuario) => {
    setSelectedUsuario(u);
    setUsuarioNombre(u.nombre);
    setUsuarioUsername(u.username);
    setUsuarioRol(u.rol);
    setUsuarioPassword(u.password || '');
  };

  const handleDeleteUsuario = (id: string) => {
    showConfirm(
      '¿Borrar usuario?',
      '¿Estás seguro de borrar este usuario? Esta acción no se puede deshacer.',
      async () => {
        await Services.deleteUsuario(id);
        await refreshAll();
      }
    );
  };

  const resetUsuarioForm = () => {
    setSelectedUsuario(null);
    setUsuarioNombre('');
    setUsuarioUsername('');
    setUsuarioRol('jefe_equipo');
    setUsuarioPassword('');
  };

  // Estado para gestión de obras y visibilidades (Tab 6)
  const [selectedObra, setSelectedObra] = useState<Obra | null>(null);
  const [obraNombre, setObraNombre] = useState('');
  const [obraDesc, setObraDesc] = useState('');
  const [userAccessMapping, setUserAccessMapping] = useState<Record<string, string[]>>({}); // usuario_id -> array de obra_id

  // Cargar mapeos de accesos al entrar a la tab
  const loadAccessMappings = async () => {
    try {
      const mappings = await Services.getUsuariosObras();
      const map: Record<string, string[]> = {};
      mappings.forEach(m => {
        if (!map[m.usuario_id]) {
          map[m.usuario_id] = [];
        }
        map[m.usuario_id].push(m.obra_id);
      });
      setUserAccessMapping(map);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (activeTab === 'obras') {
      setTimeout(() => {
        loadAccessMappings();
      }, 0);
    }
  }, [activeTab]);

  const handleSaveObra = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!obraNombre) return;
    try {
      const oData: Obra = {
        id: selectedObra?.id || '',
        nombre: obraNombre,
        descripcion: obraDesc
      };
      await Services.saveObra(oData);
      setSelectedObra(null);
      setObraNombre('');
      setObraDesc('');
      await refreshAll();
      showToast('Obra guardada correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar obra.', 'error');
    }
  };

  const handleEditObra = (o: Obra) => {
    setSelectedObra(o);
    setObraNombre(o.nombre);
    setObraDesc(o.descripcion || '');
  };

  const handleDeleteObra = (id: string) => {
    showConfirm(
      '¿Borrar obra?',
      '¿Estás seguro de borrar esta obra? Esto eliminará permanentemente todos sus datos asociados (partidas, partes, gastos y configuraciones).',
      async () => {
        await Services.deleteObra(id);
        await refreshAll();
        showToast('Obra eliminada correctamente.', 'success');
      }
    );
  };

  const handleToggleAccess = async (usuarioId: string, obraId: string) => {
    const currentList = userAccessMapping[usuarioId] || [];
    let newList;
    if (currentList.includes(obraId)) {
      newList = currentList.filter(id => id !== obraId);
    } else {
      newList = [...currentList, obraId];
    }
    
    setUserAccessMapping(prev => ({
      ...prev,
      [usuarioId]: newList
    }));

    try {
      await Services.saveUsuarioObras(usuarioId, newList);
      showToast('Permisos de acceso actualizados.', 'success');
      await refreshAll();
    } catch (e) {
      console.error(e);
      showToast('Error al actualizar permisos.', 'error');
    }
  };

  // Estado para recursos
  const [selectedRecurso, setSelectedRecurso] = useState<Recurso | null>(null);
  const [recursoNombre, setRecursoNombre] = useState('');
  const [recursoTipo, setRecursoTipo] = useState<'trabajador' | 'maquinaria' | 'alojamiento' | 'otros'>('trabajador');
  const [recursoSueldo, setRecursoSueldo] = useState(0);
  const [recursoSS, setRecursoSS] = useState(0);
  const [recursoAlojamiento, setRecursoAlojamiento] = useState(0);
  const [recursoOtros, setRecursoOtros] = useState(0);
  const [recursoBrigadaId, setRecursoBrigadaId] = useState('');

  const handleSaveRecurso = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!recursoNombre) return;

    try {
      const rData: Recurso = {
        id: selectedRecurso?.id || generateUniqueId('r'),
        nombre: recursoNombre,
        tipo: recursoTipo,
        sueldo: Number(recursoSueldo),
        seguridad_social: Number(recursoSS),
        alojamiento: Number(recursoAlojamiento),
        otros_costes: Number(recursoOtros),
        brigada_id: recursoBrigadaId || null,
        obra_id: currentObra?.id || ''
      };

      await Services.saveRecurso(rData);
      setSelectedRecurso(null);
      resetRecursoForm();
      await refreshAll();
      showToast('Recurso guardado correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar recurso.', 'error');
    }
  };

  const handleEditRecurso = (r: Recurso) => {
    setSelectedRecurso(r);
    setRecursoNombre(r.nombre);
    setRecursoTipo(r.tipo);
    setRecursoSueldo(r.sueldo);
    setRecursoSS(r.seguridad_social);
    setRecursoAlojamiento(r.alojamiento);
    setRecursoOtros(r.otros_costes);
    setRecursoBrigadaId(r.brigada_id || '');
  };

  const handleDeleteRecurso = (id: string) => {
    showConfirm(
      '¿Borrar recurso?',
      '¿Estás seguro de borrar este recurso? Se recalcularán los márgenes automáticos de costes.',
      async () => {
        await Services.deleteRecurso(id);
        await refreshAll();
      }
    );
  };

  const resetRecursoForm = () => {
    setSelectedRecurso(null);
    setRecursoNombre('');
    setRecursoTipo('trabajador');
    setRecursoSueldo(0);
    setRecursoSS(0);
    setRecursoAlojamiento(0);
    setRecursoOtros(0);
    setRecursoBrigadaId('');
  };

  // Guardar configuración general
  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setConfigSaving(true);
    setConfigMsg('');
    try {
      await Services.updateConfig(currentObra?.id || '', {
        rendimiento_default: Number(rendDefault),
        umbral_verde: Number(umbVerde),
        umbral_azul: Number(umbAzul),
        margen_minimo: Number(margenMin)
      });
      setConfigMsg('Configuración guardada correctamente.');
      await refreshAll();
    } catch (err) {
      console.error(err);
      setConfigMsg('Error al guardar configuración.');
    } finally {
      setConfigSaving(false);
    }
  };

  // Guardar Partida (Nuevo o Editar)
  const handleSavePartida = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!partidaCodigo || !partidaDesc || !partidaUnidad) return;

    try {
      const pData: Partida = {
        id: selectedPartida?.id || generateUniqueId('p'),
        codigo: partidaCodigo,
        descripcion: partidaDesc,
        unidad: partidaUnidad,
        precio_unitario: Number(partidaPrecio),
        medicion_contrato: Number(partidaMedicion),
        rendimiento_objetivo: Number(partidaRend),
        obra_id: currentObra?.id || ''
      };

      await Services.savePartida(pData);
      setSelectedPartida(null);
      resetPartidaForm();
      await refreshAll();
      showToast('Partida guardada correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar partida.', 'error');
    }
  };

  const handleEditPartida = (p: Partida) => {
    setSelectedPartida(p);
    setPartidaCodigo(p.codigo);
    setPartidaDesc(p.descripcion);
    setPartidaUnidad(p.unidad);
    setPartidaPrecio(p.precio_unitario);
    setPartidaMedicion(p.medicion_contrato);
    setPartidaRend(p.rendimiento_objetivo);
  };

  const handleDeletePartida = (id: string) => {
    showConfirm(
      '¿Borrar partida de obra?',
      '¿Estás seguro de borrar esta partida? Se desvinculará de los partes de trabajo y gastos asociados de forma permanente.',
      async () => {
        await Services.deletePartida(id);
        await refreshAll();
      }
    );
  };

  const resetPartidaForm = () => {
    setSelectedPartida(null);
    setPartidaCodigo('');
    setPartidaDesc('');
    setPartidaUnidad('m');
    setPartidaPrecio(0);
    setPartidaMedicion(0);
    setPartidaRend(100);
  };

  // Importar CSV
  const handleCsvImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvError('');
    setCsvSuccess('');
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      const text = evt.target?.result as string;
      if (!text) return;

      try {
        const lines = text.split(/\r?\n/);
        const header = lines[0].toLowerCase().split(',');
        
        // Validar columnas
        const required = ['codigo', 'descripcion', 'unidad', 'precio_unitario', 'medicion_contrato', 'rendimiento_objetivo'];
        const missing = required.filter(col => !header.includes(col));
        if (missing.length > 0) {
          throw new Error(`Faltan columnas requeridas en el CSV: ${missing.join(', ')}`);
        }

        const parsedPartidas: Partida[] = [];
        
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;

          // Simple CSV line parser handling double quotes
          const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || line.split(',');
          const cleaned = matches.map(val => val.replace(/^"|"$/g, '').trim());

          const rowData: Record<string, string> = {};
          header.forEach((col, idx) => {
            rowData[col] = cleaned[idx] || '';
          });

          if (!rowData.codigo || !rowData.descripcion) continue;

          parsedPartidas.push({
            id: `p-${Date.now()}-${i}`,
            codigo: rowData.codigo,
            descripcion: rowData.descripcion,
            unidad: rowData.unidad || 'm',
            precio_unitario: Number(rowData.precio_unitario) || 0,
            medicion_contrato: Number(rowData.medicion_contrato) || 0,
            rendimiento_objetivo: Number(rowData.rendimiento_objetivo) || 100,
            obra_id: currentObra?.id || ''
          });
        }

        if (parsedPartidas.length === 0) {
          throw new Error('No se encontraron registros válidos para importar.');
        }

        await Services.importPartidas(currentObra?.id || '', parsedPartidas);
        setCsvSuccess(`✓ Se importaron con éxito ${parsedPartidas.length} partidas.`);
        await refreshAll();
      } catch (err) {
        const error = err as Error;
        setCsvError(error.message || 'Error al analizar el archivo CSV.');
      }
    };
    reader.readAsText(file, 'UTF-8');
  };

  // Guardar Brigada
  const handleSaveBrigada = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brigadaNombre) return;

    try {
      const bData: Brigada = {
        id: selectedBrigada?.id || generateUniqueId('b'),
        nombre: brigadaNombre,
        jefe_equipo_id: brigadaJefe || null,
        num_personas_habitual: Number(brigadaHabitual),
        obra_id: currentObra?.id || ''
      };

      await Services.saveBrigada(bData);
      setSelectedBrigada(null);
      resetBrigadaForm();
      await refreshAll();
      showToast('Brigada guardada correctamente.', 'success');
    } catch (err) {
      console.error(err);
      showToast('Error al guardar brigada.', 'error');
    }
  };

  const handleEditBrigada = (b: Brigada) => {
    setSelectedBrigada(b);
    setBrigadaNombre(b.nombre);
    setBrigadaJefe(b.jefe_equipo_id || '');
    setBrigadaHabitual(b.num_personas_habitual);
  };

  const handleDeleteBrigada = (id: string) => {
    showConfirm(
      '¿Borrar brigada / cuadrilla?',
      '¿Estás seguro de borrar esta brigada? Esta acción desvinculará los recursos asignados de forma permanente.',
      async () => {
        await Services.deleteBrigada(id);
        await refreshAll();
      }
    );
  };

  const resetBrigadaForm = () => {
    setSelectedBrigada(null);
    setBrigadaNombre('');
    setBrigadaJefe('');
    setBrigadaHabitual(4);
  };

  return (
    <div style={{ maxWidth: 'var(--max-width)', margin: '0 auto', padding: '1.5rem', width: '100%' }}>
      <header style={{ marginBottom: '1.5rem' }}>
        <h1>Configuración del Sistema</h1>
        <p>Gestiona los umbrales de rendimiento, partidas presupuestarias y brigadas de la obra.</p>
      </header>

      {/* Tabs minimalistas */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border-color)', marginBottom: '1.5rem', gap: '0.5rem' }}>
        <button
          onClick={() => setActiveTab('umbrales')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'umbrales' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'umbrales' ? 600 : 400
          }}
        >
          Semáforo y Umbrales
        </button>
        <button
          onClick={() => setActiveTab('partidas')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'partidas' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'partidas' ? 600 : 400
          }}
        >
          Partidas de Obra
        </button>
        <button
          onClick={() => setActiveTab('brigadas')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'brigadas' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'brigadas' ? 600 : 400
          }}
        >
          Brigadas / Cuadrillas
        </button>
        <button
          onClick={() => setActiveTab('usuarios')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'usuarios' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'usuarios' ? 600 : 400
          }}
        >
          Usuarios y Roles
        </button>
        <button
          onClick={() => setActiveTab('recursos')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'recursos' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'recursos' ? 600 : 400
          }}
        >
          Recursos y Costes
        </button>
        <button
          onClick={() => setActiveTab('obras')}
          style={{
            border: 'none',
            borderBottom: activeTab === 'obras' ? '2px solid var(--text-primary)' : 'none',
            borderRadius: 0,
            padding: '0.5rem 1rem',
            background: 'none',
            fontWeight: activeTab === 'obras' ? 600 : 400
          }}
        >
          Obras y Accesos
        </button>
      </div>

      {/* 1. TAB UMBRALES */}
      {activeTab === 'umbrales' && (
        <div style={{ maxWidth: '600px', backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
          <h2 style={{ fontSize: '1.15rem', marginBottom: '1rem' }}>Umbrales del Semáforo de Rendimiento</h2>
          <form onSubmit={handleSaveConfig} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label htmlFor="rend-default">Rendimiento objetivo por defecto (m/persona/día):</label>
              <input
                type="number"
                id="rend-default"
                value={rendDefault}
                onChange={e => setRendDefault(Number(e.target.value))}
                min="1"
                required
              />
            </div>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label htmlFor="umb-verde">Umbral Verde (Mínimo % Cumplimiento):</label>
                <input
                  type="number"
                  id="umb-verde"
                  value={umbVerde}
                  onChange={e => setUmbVerde(Number(e.target.value))}
                  min="50"
                  max="200"
                  required
                />
              </div>
              <div>
                <label htmlFor="umb-azul">Umbral Azul (Sobresaliente % Cumplimiento):</label>
                <input
                  type="number"
                  id="umb-azul"
                  value={umbAzul}
                  onChange={e => setUmbAzul(Number(e.target.value))}
                  min="50"
                  max="200"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="margen-min">Margen mínimo aceptable para Verde/Azul (€):</label>
              <input
                type="number"
                id="margen-min"
                value={margenMin}
                onChange={e => setMargenMin(Number(e.target.value))}
                required
              />
              <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                Si el beneficio de un parte menos sus gastos es menor o igual a este valor, el semáforo será Rojo independientemente del rendimiento en metros.
              </span>
            </div>

            <button type="submit" className="primary" disabled={configSaving} style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}>
              {configSaving ? 'Guardando...' : 'Guardar Umbrales'}
            </button>

            {configMsg && (
              <p style={{ marginTop: '0.5rem', fontSize: '0.85rem', fontWeight: 500, color: configMsg.includes('✓') ? 'var(--status-green)' : 'var(--status-red)' }}>
                {configMsg}
              </p>
            )}
          </form>
        </div>
      )}

      {/* 2. TAB PARTIDAS */}
      {activeTab === 'partidas' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}>
          {/* Formulario y CSV */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                {selectedPartida ? 'Editar Partida' : 'Nueva Partida de Presupuesto'}
              </h2>
              <form onSubmit={handleSavePartida} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="part-codigo">Código Partida (Único):</label>
                  <input
                    type="text"
                    id="part-codigo"
                    value={partidaCodigo}
                    onChange={e => setPartidaCodigo(e.target.value)}
                    placeholder="Ej. 04.02.01.05"
                    required
                    disabled={!!selectedPartida}
                  />
                </div>
                <div>
                  <label htmlFor="part-desc">Descripción:</label>
                  <input
                    type="text"
                    id="part-desc"
                    value={partidaDesc}
                    onChange={e => setPartidaDesc(e.target.value)}
                    placeholder="Tendido en zanja..."
                    required
                  />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="part-unidad">Unidad (UD):</label>
                    <input
                      type="text"
                      id="part-unidad"
                      value={partidaUnidad}
                      onChange={e => setPartidaUnidad(e.target.value)}
                      placeholder="m, ud, m2"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="part-precio">Precio Unitario (€):</label>
                    <input
                      type="number"
                      id="part-precio"
                      value={partidaPrecio}
                      onChange={e => setPartidaPrecio(Number(e.target.value))}
                      step="0.01"
                      min="0"
                      required
                    />
                  </div>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
                  <div>
                    <label htmlFor="part-medicion">Medición Contrato:</label>
                    <input
                      type="number"
                      id="part-medicion"
                      value={partidaMedicion}
                      onChange={e => setPartidaMedicion(Number(e.target.value))}
                      min="0"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="part-rend">Objetivo (unidad/persona/día):</label>
                    <input
                      type="number"
                      id="part-rend"
                      value={partidaRend}
                      onChange={e => setPartidaRend(Number(e.target.value))}
                      min="0.1"
                      step="0.1"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="primary">
                    {selectedPartida ? 'Actualizar' : 'Crear'}
                  </button>
                  {selectedPartida && (
                    <button type="button" onClick={resetPartidaForm}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* CSV Import */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>Importación Masiva (CSV)</h2>
                <p style={{ fontSize: '0.85rem' }}>Sube un archivo de Excel exportado a CSV (.csv) con las partidas del presupuesto.</p>
                <div style={{ fontSize: '0.75rem', backgroundColor: 'var(--bg-tertiary)', padding: '0.75rem', borderRadius: '4px', fontFamily: 'monospace', marginBottom: '1rem', whiteSpace: 'pre-wrap' }}>
                  codigo,descripcion,unidad,precio_unitario,medicion_contrato,rendimiento_objetivo
                  04.02.01.05,&quot;Tendido en zanja&quot;,m,0.51,408928,100
                </div>
                
                <div style={{ marginTop: '0.5rem' }}>
                  <label htmlFor="csv-file" className="button" style={{ display: 'inline-block', cursor: 'pointer', textAlign: 'center' }}>
                    Seleccionar Archivo CSV
                  </label>
                  <input
                    type="file"
                    id="csv-file"
                    accept=".csv"
                    onChange={handleCsvImport}
                    style={{ display: 'none' }}
                  />
                </div>
              </div>

              <div style={{ marginTop: '1rem' }}>
                {csvError && <p style={{ color: 'var(--status-red)', fontSize: '0.85rem', fontWeight: 500 }}>{csvError}</p>}
                {csvSuccess && <p style={{ color: 'var(--status-green)', fontSize: '0.85rem', fontWeight: 500 }}>{csvSuccess}</p>}
              </div>
            </div>
          </div>

          {/* Tabla de partidas */}
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Listado de Partidas ({partidas.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Descripción</th>
                  <th>Unidad</th>
                  <th>Precio Unit.</th>
                  <th>Med. Contrato</th>
                  <th>Rend. Objetivo</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {partidas.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600 }}>{p.codigo}</td>
                    <td>{p.descripcion}</td>
                    <td>{p.unidad}</td>
                    <td>{p.precio_unitario.toFixed(2)} €</td>
                    <td>{p.medicion_contrato.toLocaleString('es-ES')}</td>
                    <td>{p.rendimiento_objetivo} {p.unidad}/pers/día</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleEditPartida(p)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeletePartida(p.id)}
                          className="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {partidas.length === 0 && (
                  <tr>
                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No hay partidas registradas. Créalas arriba o importa un CSV.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. TAB BRIGADAS */}
      {activeTab === 'brigadas' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Formulario */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {selectedBrigada ? 'Editar Brigada' : 'Nueva Brigada'}
            </h2>
            <form onSubmit={handleSaveBrigada} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="brig-nombre">Nombre de la Brigada:</label>
                <input
                  type="text"
                  id="brig-nombre"
                  value={brigadaNombre}
                  onChange={e => setBrigadaNombre(e.target.value)}
                  placeholder="Ej. Cuadrilla 1, Equipo Pérez"
                  required
                />
              </div>
              <div>
                <label htmlFor="brig-jefe">Encargado / Jefe de Equipo:</label>
                <select
                  id="brig-jefe"
                  value={brigadaJefe}
                  onChange={e => setBrigadaJefe(e.target.value)}
                >
                  <option value="">Selecciona encargado...</option>
                  {usuarios
                    .filter(u => u.rol === 'jefe_equipo')
                    .map(u => (
                      <option key={u.id} value={u.id}>
                        {u.nombre}
                      </option>
                    ))}
                </select>
              </div>
              <div>
                <label htmlFor="brig-habitual">Nº de personas habitual:</label>
                <input
                  type="number"
                  id="brig-habitual"
                  value={brigadaHabitual}
                  onChange={e => setBrigadaHabitual(Number(e.target.value))}
                  min="1"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="primary">
                  {selectedBrigada ? 'Actualizar' : 'Crear'}
                </button>
                {selectedBrigada && (
                  <button type="button" onClick={resetBrigadaForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listado */}
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Brigadas ({brigadas.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Jefe de Equipo</th>
                  <th>Operarios Habituales</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {brigadas.map(b => (
                  <tr key={b.id}>
                    <td style={{ fontWeight: 600 }}>{b.nombre}</td>
                    <td>{b.jefe_nombre || 'Sin asignar'}</td>
                    <td>{b.num_personas_habitual} personas</td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleEditBrigada(b)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteBrigada(b.id)}
                          className="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {brigadas.length === 0 && (
                  <tr>
                    <td colSpan={4} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                      No hay brigadas registradas.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 4. TAB USUARIOS */}
      {activeTab === 'usuarios' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Formulario */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {selectedUsuario ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <form onSubmit={handleSaveUsuario} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="usr-nombre">Nombre Completo:</label>
                <input
                  type="text"
                  id="usr-nombre"
                  value={usuarioNombre}
                  onChange={e => setUsuarioNombre(e.target.value)}
                  placeholder="Ej. Carlos Pérez"
                  required
                />
              </div>
              <div>
                <label htmlFor="usr-username">Usuario:</label>
                <input
                  type="text"
                  id="usr-username"
                  value={usuarioUsername}
                  onChange={e => setUsuarioUsername(e.target.value)}
                  placeholder="Ej. carlosperez"
                  required
                />
              </div>
              <div>
                <label htmlFor="usr-rol">Rol:</label>
                <select
                  id="usr-rol"
                  value={usuarioRol}
                  onChange={e => setUsuarioRol(e.target.value as 'admin' | 'jefe_equipo' | 'lector')}
                  required
                >
                  <option value="jefe_equipo">Jefe de Equipo (Encargado)</option>
                  <option value="admin">Administrador (Jefe de Obra)</option>
                  <option value="lector">Solo Lectura (Dirección/Oficina)</option>
                </select>
              </div>
              <div>
                <label htmlFor="usr-password">Contraseña de acceso:</label>
                <input
                  type="password"
                  id="usr-password"
                  value={usuarioPassword}
                  onChange={e => setUsuarioPassword(e.target.value)}
                  placeholder="Min. 4 caracteres"
                  required
                />
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="primary">
                  {selectedUsuario ? 'Actualizar' : 'Crear'}
                </button>
                {selectedUsuario && (
                  <button type="button" onClick={resetUsuarioForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listado */}
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Usuarios y Roles ({usuarios.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Usuario</th>
                  <th>Rol</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id}>
                    <td style={{ fontWeight: 600 }}>{u.nombre}</td>
                    <td>{u.username}</td>
                    <td>
                      <span style={{
                        fontSize: '0.75rem',
                        padding: '0.2rem 0.4rem',
                        borderRadius: '4px',
                        backgroundColor: 'var(--bg-tertiary)',
                        fontWeight: 500
                      }}>
                        {u.rol === 'admin' ? 'Administrador' : u.rol === 'jefe_equipo' ? 'Jefe de Equipo' : 'Solo lectura'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                        <button
                          onClick={() => handleEditUsuario(u)}
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleDeleteUsuario(u.id)}
                          className="danger"
                          style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                        >
                          Borrar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. TAB RECURSOS */}
      {activeTab === 'recursos' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', alignItems: 'start' }}>
          {/* Formulario */}
          <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
              {selectedRecurso ? 'Editar Recurso' : 'Nuevo Recurso (Trabajador / Maquinaria)'}
            </h2>
            <form onSubmit={handleSaveRecurso} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div>
                <label htmlFor="rec-nombre">Nombre del Recurso:</label>
                <input
                  type="text"
                  id="rec-nombre"
                  value={recursoNombre}
                  onChange={e => setRecursoNombre(e.target.value)}
                  placeholder="Ej. Paco (Oficial), Miniexcavadora"
                  required
                />
              </div>
              
              <div>
                <label htmlFor="rec-tipo">Tipo de Recurso:</label>
                <select
                  id="rec-tipo"
                  value={recursoTipo}
                  onChange={e => setRecursoTipo(e.target.value as 'trabajador' | 'maquinaria' | 'alojamiento' | 'otros')}
                  required
                >
                  <option value="trabajador">Trabajador</option>
                  <option value="maquinaria">Maquinaria / Equipo</option>
                  <option value="alojamiento">Alojamiento / Alquileres</option>
                  <option value="otros">Otros Gastos Fijos</option>
                </select>
              </div>

              <div>
                <label htmlFor="rec-sueldo">Sueldo / Coste base mensual (€/mes):</label>
                <input
                  type="number"
                  id="rec-sueldo"
                  value={recursoSueldo}
                  onChange={e => setRecursoSueldo(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>

              {recursoTipo === 'trabajador' && (
                <div>
                  <label htmlFor="rec-ss">Seguridad Social mensual (€/mes):</label>
                  <input
                    type="number"
                    id="rec-ss"
                    value={recursoSS}
                    onChange={e => setRecursoSS(Number(e.target.value))}
                    min="0"
                    step="0.01"
                  />
                </div>
              )}

              <div>
                <label htmlFor="rec-alojamiento">Alojamiento / Dietas mensual (€/mes):</label>
                <input
                  type="number"
                  id="rec-alojamiento"
                  value={recursoAlojamiento}
                  onChange={e => setRecursoAlojamiento(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="rec-otros">Otros Costes mensuales (€/mes):</label>
                <input
                  type="number"
                  id="rec-otros"
                  value={recursoOtros}
                  onChange={e => setRecursoOtros(Number(e.target.value))}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <label htmlFor="rec-brigada">Asignar a Brigada / Cuadrilla:</label>
                <select
                  id="rec-brigada"
                  value={recursoBrigadaId}
                  onChange={e => setRecursoBrigadaId(e.target.value)}
                >
                  <option value="">Sin asignar (Coste general)</option>
                  {brigadas.map(b => (
                    <option key={b.id} value={b.id}>
                      {b.nombre}
                    </option>
                  ))}
                </select>
                <p style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)', marginTop: '0.25rem' }}>
                  Su coste diario se imputará automáticamente a los partes diarios de esta brigada (calculado sobre 20 días laborables/mes).
                </p>
              </div>

              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                <button type="submit" className="primary">
                  {selectedRecurso ? 'Actualizar' : 'Crear'}
                </button>
                {selectedRecurso && (
                  <button type="button" onClick={resetRecursoForm}>
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Listado */}
          <div style={{ overflowX: 'auto' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Recursos Activos ({recursos.length})</h2>
            <table>
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Tipo</th>
                  <th>Coste Mensual</th>
                  <th>Coste Diario (20d)</th>
                  <th>Brigada</th>
                  <th style={{ textAlign: 'right' }}>Acciones</th>
                </tr>
              </thead>
              <tbody>
                {recursos.map(r => {
                  const totalMensual = Number(r.sueldo || 0) + Number(r.seguridad_social || 0) + Number(r.alojamiento || 0) + Number(r.otros_costes || 0);
                  const totalDiario = totalMensual / 20;
                  return (
                    <tr key={r.id}>
                      <td>
                        <span style={{ fontWeight: 600, display: 'block' }}>{r.nombre}</span>
                        {r.tipo === 'trabajador' && (
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            S: {r.sueldo}€ | SS: {r.seguridad_social}€ | Al: {r.alojamiento}€
                          </span>
                        )}
                      </td>
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
                          {r.tipo}
                        </span>
                      </td>
                      <td style={{ fontWeight: 500 }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalMensual)}
                      </td>
                      <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                        {new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(totalDiario)}
                      </td>
                      <td>
                        <span style={{ fontSize: '0.85rem' }}>{r.brigada_nombre || 'Sin asignar'}</span>
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEditRecurso(r)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteRecurso(r.id)}
                            className="danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {recursos.length === 0 && (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: '2rem' }}>
                      No hay recursos de personal o maquinaria registrados.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. TAB OBRAS */}
      {activeTab === 'obras' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', alignItems: 'start' }}>
            {/* Formulario */}
            <div style={{ backgroundColor: 'var(--bg-secondary)', padding: '1.5rem', borderRadius: 'var(--border-radius)', border: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '1rem' }}>
                {selectedObra ? 'Editar Obra' : 'Nueva Obra'}
              </h2>
              <form onSubmit={handleSaveObra} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div>
                  <label htmlFor="obra-nombre">Nombre de la Obra:</label>
                  <input
                    type="text"
                    id="obra-nombre"
                    value={obraNombre}
                    onChange={e => setObraNombre(e.target.value)}
                    placeholder="Ej. Obra Principal (Madrid)"
                    required
                  />
                </div>
                <div>
                  <label htmlFor="obra-desc">Descripción / Detalles:</label>
                  <textarea
                    id="obra-desc"
                    value={obraDesc}
                    onChange={e => setObraDesc(e.target.value)}
                    placeholder="Ej. Canalización zona centro y acometidas"
                    style={{ width: '100%', minHeight: '60px', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-color)', backgroundColor: 'var(--bg-primary)', color: 'var(--text-primary)' }}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                  <button type="submit" className="primary">
                    {selectedObra ? 'Actualizar' : 'Crear'}
                  </button>
                  {selectedObra && (
                    <button type="button" onClick={() => { setSelectedObra(null); setObraNombre(''); setObraDesc(''); }}>
                      Cancelar
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* Listado de Obras registradas */}
            <div style={{ overflowX: 'auto' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>Obras en el Sistema ({obras.length})</h2>
              <table>
                <thead>
                  <tr>
                    <th>Nombre</th>
                    <th>Descripción</th>
                    <th style={{ textAlign: 'right' }}>Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {obras.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.nombre}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{o.descripcion || 'Sin descripción'}</td>
                      <td style={{ textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '0.25rem' }}>
                          <button
                            onClick={() => handleEditObra(o)}
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleDeleteObra(o.id)}
                            className="danger"
                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                          >
                            Borrar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {obras.length === 0 && (
                    <tr>
                      <td colSpan={3} style={{ textAlign: 'center', color: 'var(--text-tertiary)' }}>
                        No hay obras registradas.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <hr style={{ border: '0', borderTop: '1px solid var(--border-color)', margin: '1rem 0' }} />

          {/* Asignación de accesos para lectores */}
          <div>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.5rem' }}>Permisos de Lectores</h2>
            <p style={{ color: 'var(--text-tertiary)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
              Controla qué obras puede ver cada usuario con rol de <strong>Solo Lectura</strong>. Los administradores ven todas las obras de forma automática, y los encargados/jefes de equipo ven aquellas en las que estén asignados a una brigada.
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
              {usuarios
                .filter(u => u.rol === 'lector')
                .map(user => {
                  const allowedIds = userAccessMapping[user.id] || [];
                  return (
                    <div key={user.id} style={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', padding: '1rem', borderRadius: 'var(--border-radius)' }}>
                      <div style={{ fontWeight: 600, marginBottom: '0.5rem', fontSize: '0.95rem' }}>{user.nombre}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', marginBottom: '1rem' }}>@{user.username}</div>
                      
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', borderTop: '1px dashed var(--border-color)', paddingTop: '0.75rem' }}>
                        <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>Obras Permitidas:</span>
                        {obras.map(o => {
                          const isChecked = allowedIds.includes(o.id);
                          return (
                            <label key={o.id} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.85rem', cursor: 'pointer' }}>
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleAccess(user.id, o.id)}
                              />
                              {o.nombre}
                            </label>
                          );
                        })}
                        {obras.length === 0 && (
                          <span style={{ fontSize: '0.8rem', color: 'var(--text-tertiary)', fontStyle: 'italic' }}>No hay obras en el sistema.</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              {usuarios.filter(u => u.rol === 'lector').length === 0 && (
                <div style={{ color: 'var(--text-tertiary)', gridColumn: '1 / -1', fontStyle: 'italic' }}>
                  No hay usuarios de Solo Lectura (Lectores) registrados para gestionar permisos.
                </div>
              )}
            </div>
          </div>

        </div>
      )}
    </div>
  );
}
