/* eslint-disable @typescript-eslint/no-explicit-any */
import { supabase, isSupabaseConfigured } from './supabase';
import { Usuario, Partida, Brigada, ParteTrabajo, ParteLinea, Gasto, AppConfig, DatabaseSchema, Recurso, Obra, UsuarioObra } from './types';

// ==========================================
// SEED DATA PARA LOCALSTORAGE (MOCK)
// ==========================================
const SEED_USUARIOS: Usuario[] = [
  { id: 'u-1', nombre: 'Administrador (Jefe de Obra)', username: 'admin', rol: 'admin', password: 'admin' },
  { id: 'u-2', nombre: 'Carlos Pérez (Encargado)', username: 'carlos', rol: 'jefe_equipo', password: '123' },
  { id: 'u-3', nombre: 'Dirección Técnica', username: 'tecnico', rol: 'lector', password: '123' }
];

const SEED_OBRAS: Obra[] = [
  { id: 'o-1', nombre: 'Obra Principal (Madrid)', descripcion: 'Proyecto de canalización en zona centro' },
  { id: 'o-2', nombre: 'Obra Secundaria (Barcelona)', descripcion: 'Despliegue de red fibra óptica sector norte' }
];

const SEED_USUARIOS_OBRAS: UsuarioObra[] = [
  { usuario_id: 'u-3', obra_id: 'o-1' }
];

const SEED_PARTIDAS: Partida[] = [
  {
    id: 'p-1',
    codigo: '04.02.01.05',
    descripcion: 'Tendido en zanja, canaleta de telecomunicaciones',
    unidad: 'm',
    precio_unitario: 0.51,
    medicion_contrato: 408928.00,
    rendimiento_objetivo: 100.00,
    obra_id: 'o-1'
  },
  {
    id: 'p-2',
    codigo: '04.02.01.06',
    descripcion: 'Grapado de cable de fibra óptica en fachada',
    unidad: 'm',
    precio_unitario: 1.20,
    medicion_contrato: 5000.00,
    rendimiento_objetivo: 40.00,
    obra_id: 'o-1'
  },
  {
    id: 'p-3',
    codigo: '04.02.02.01',
    descripcion: 'Canalización prismática de 2 tubos PVC 110mm',
    unidad: 'm',
    precio_unitario: 15.50,
    medicion_contrato: 1200.00,
    rendimiento_objetivo: 15.00,
    obra_id: 'o-1'
  }
];

const SEED_BRIGADAS: Brigada[] = [
  {
    id: 'b-1',
    nombre: 'Cuadrilla Carlos Pérez',
    jefe_equipo_id: 'u-2',
    num_personas_habitual: 4,
    obra_id: 'o-1'
  },
  {
    id: 'b-2',
    nombre: 'Cuadrilla Bajas/Refuerzos',
    jefe_equipo_id: 'u-2',
    num_personas_habitual: 2,
    obra_id: 'o-1'
  }
];

const SEED_PARTES: ParteTrabajo[] = [
  {
    id: 'pt-1',
    fecha: '2026-06-25',
    brigada_id: 'b-1',
    num_personas: 4,
    creado_por: 'u-2',
    observaciones: 'Jornada normal de tendido',
    obra_id: 'o-1'
  },
  {
    id: 'pt-2',
    fecha: '2026-06-26',
    brigada_id: 'b-1',
    num_personas: 4,
    creado_por: 'u-2',
    observaciones: 'Buen rendimiento, terreno favorable',
    obra_id: 'o-1'
  },
  {
    id: 'pt-3',
    fecha: '2026-06-27',
    brigada_id: 'b-1',
    num_personas: 4,
    creado_por: 'u-2',
    observaciones: 'Incidencias con roca en el trazado',
    obra_id: 'o-1'
  }
];

const SEED_LINEAS: ParteLinea[] = [
  {
    id: 'pl-1',
    parte_id: 'pt-1',
    partida_id: 'p-1',
    metros_ejecutados: 420.00
  },
  {
    id: 'pl-2',
    parte_id: 'pt-2',
    partida_id: 'p-1',
    metros_ejecutados: 460.00
  },
  {
    id: 'pl-3',
    parte_id: 'pt-3',
    partida_id: 'p-1',
    metros_ejecutados: 350.00
  }
];

const SEED_GASTOS: Gasto[] = [
  {
    id: 'g-1',
    fecha: '2026-06-25',
    categoria: 'Material',
    concepto: 'Tubo PE 40mm y manguitos',
    importe: 150.00,
    brigada_id: 'b-1',
    partida_id: 'p-1',
    proveedor: 'Suministros Obra SL',
    creado_por: 'u-2',
    obra_id: 'o-1',
    tipo_coste: 'unico'
  },
  {
    id: 'g-2',
    fecha: '2026-06-26',
    categoria: 'Trabajador',
    concepto: 'Jornal + dietas cuadrilla',
    importe: 140.00,
    brigada_id: 'b-1',
    partida_id: 'p-1',
    proveedor: null,
    creado_por: 'u-2',
    obra_id: 'o-1',
    tipo_coste: 'unico'
  },
  {
    id: 'g-3',
    fecha: '2026-06-27',
    categoria: 'Varios',
    concepto: 'Combustible miniexcavadora',
    importe: 80.00,
    brigada_id: 'b-1',
    partida_id: 'p-1',
    proveedor: 'Gasolinera Local',
    creado_por: 'u-2',
    obra_id: 'o-1',
    tipo_coste: 'unico'
  }
];

const SEED_CONFIGS: AppConfig[] = [
  {
    id: 'c-1',
    obra_id: 'o-1',
    rendimiento_default: 100.00,
    umbral_verde: 100.00,
    umbral_azul: 110.00,
    margen_minimo: 0.00
  },
  {
    id: 'c-2',
    obra_id: 'o-2',
    rendimiento_default: 120.00,
    umbral_verde: 100.00,
    umbral_azul: 110.00,
    margen_minimo: 0.00
  }
];

// ==========================================
// PERSISTENCIA LOCAL (MOCK)
// ==========================================
const LOCAL_STORAGE_KEY = 'kontrol_mock_db';

function getLocalDB(): DatabaseSchema {
  if (typeof window === 'undefined') {
    return {
      obras: SEED_OBRAS,
      usuarios_obras: SEED_USUARIOS_OBRAS,
      usuarios: SEED_USUARIOS,
      partidas: SEED_PARTIDAS,
      brigadas: SEED_BRIGADAS,
      partes_trabajo: SEED_PARTES,
      partes_lineas: SEED_LINEAS,
      gastos: SEED_GASTOS,
      recursos: [],
      configs: SEED_CONFIGS
    };
  }

  const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (!stored) {
    const defaultDB: DatabaseSchema = {
      obras: SEED_OBRAS,
      usuarios_obras: SEED_USUARIOS_OBRAS,
      usuarios: SEED_USUARIOS,
      partidas: SEED_PARTIDAS,
      brigadas: SEED_BRIGADAS,
      partes_trabajo: SEED_PARTES,
      partes_lineas: SEED_LINEAS,
      gastos: SEED_GASTOS,
      recursos: [],
      configs: SEED_CONFIGS
    };
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultDB));
    return defaultDB;
  }
  const parsed = JSON.parse(stored);
  return {
    obras: parsed.obras || SEED_OBRAS,
    usuarios_obras: parsed.usuarios_obras || SEED_USUARIOS_OBRAS,
    usuarios: parsed.usuarios || SEED_USUARIOS,
    partidas: parsed.partidas || SEED_PARTIDAS,
    brigadas: parsed.brigadas || SEED_BRIGADAS,
    partes_trabajo: parsed.partes_trabajo || SEED_PARTES,
    partes_lineas: parsed.partes_lineas || SEED_LINEAS,
    gastos: parsed.gastos || SEED_GASTOS,
    recursos: parsed.recursos || [],
    configs: parsed.configs || (parsed.config ? [parsed.config] : SEED_CONFIGS)
  };
}

function saveLocalDB(db: DatabaseSchema) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(db));
  }
}

// ==========================================
// IMPLEMENTACIÓN DE SERVICIOS HÍBRIDOS
// ==========================================

export const Services = {
  // ==========================================
  // OBRAS Y ACCESOS
  // ==========================================
  async getObras(): Promise<Obra[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('obras').select('*').order('nombre');
        if (!error && data) return data as Obra[];
      } catch (e) {
        console.error('Error al obtener obras de Supabase, usando local:', e);
      }
    }
    return getLocalDB().obras.sort((a, b) => a.nombre.localeCompare(b.nombre));
  },

  async saveObra(obra: Obra): Promise<Obra> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbObra = {
          ...obra,
          id: !obra.id || obra.id.startsWith('o-') ? undefined : obra.id
        };
        const { data, error } = await supabase.from('obras').upsert(dbObra).select().single();
        if (!error && data) return data as Obra;
      } catch (e) {
        console.error('Error al guardar obra en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    const isNew = !obra.id || obra.id.startsWith('o-');
    const finalObra = {
      ...obra,
      id: isNew ? `o-${Date.now()}` : obra.id
    };
    if (isNew) {
      db.obras.push(finalObra);
    } else {
      const idx = db.obras.findIndex(o => o.id === obra.id);
      db.obras[idx] = finalObra;
    }
    saveLocalDB(db);
    return finalObra;
  },

  async deleteObra(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('obras').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar obra de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.obras = db.obras.filter(o => o.id !== id);
    db.partidas = db.partidas.filter(p => p.obra_id !== id);
    db.brigadas = db.brigadas.filter(b => b.obra_id !== id);
    db.partes_trabajo = db.partes_trabajo.filter(pt => pt.obra_id !== id);
    db.gastos = db.gastos.filter(g => g.obra_id !== id);
    db.recursos = db.recursos.filter(r => r.obra_id !== id);
    db.configs = db.configs.filter(c => c.obra_id !== id);
    saveLocalDB(db);
    return true;
  },

  async getUsuariosObras(): Promise<UsuarioObra[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('usuarios_obras').select('*');
        if (!error && data) return data as UsuarioObra[];
      } catch (e) {
        console.error('Error al obtener mapeos de acceso de Supabase, usando local:', e);
      }
    }
    return getLocalDB().usuarios_obras;
  },

  async saveUsuarioObras(usuarioId: string, obraIds: string[]): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        await supabase.from('usuarios_obras').delete().eq('usuario_id', usuarioId);
        if (obraIds.length > 0) {
          const inserts = obraIds.map(oid => ({ usuario_id: usuarioId, obra_id: oid }));
          await supabase.from('usuarios_obras').insert(inserts);
        }
        return true;
      } catch (e) {
        console.error('Error al guardar mapeo de accesos en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.usuarios_obras = db.usuarios_obras.filter(uo => uo.usuario_id !== usuarioId);
    obraIds.forEach(oid => {
      db.usuarios_obras.push({ usuario_id: usuarioId, obra_id: oid });
    });
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // CONFIGURACIÓN (Una por obra)
  // ==========================================
  async getConfig(obraId: string): Promise<AppConfig> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('config').select('*').eq('obra_id', obraId).maybeSingle();
        if (!error && data) return data as AppConfig;
        
        // Si no existe configuración para esta obra, creamos una por defecto
        const newConf = {
          obra_id: obraId,
          rendimiento_default: 100.00,
          umbral_verde: 100.00,
          umbral_azul: 110.00,
          margen_minimo: 0.00
        };
        const { data: created, error: err } = await supabase.from('config').insert(newConf).select().single();
        if (!err && created) return created as AppConfig;
      } catch (e) {
        console.error('Error al conectar con config de la obra en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    let conf = db.configs.find(c => c.obra_id === obraId);
    if (!conf) {
      conf = {
        id: `c-${Date.now()}`,
        obra_id: obraId,
        rendimiento_default: 100.00,
        umbral_verde: 100.00,
        umbral_azul: 110.00,
        margen_minimo: 0.00
      };
      db.configs.push(conf);
      saveLocalDB(db);
    }
    return conf;
  },

  async updateConfig(obraId: string, newConfig: Partial<AppConfig>): Promise<AppConfig> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('config')
          .upsert({ ...newConfig, obra_id: obraId })
          .select()
          .single();
        if (!error && data) return data as AppConfig;
      } catch (e) {
        console.error('Error al actualizar config de la obra en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    const idx = db.configs.findIndex(c => c.obra_id === obraId);
    if (idx < 0) {
      const newC = {
        id: `c-${Date.now()}`,
        obra_id: obraId,
        rendimiento_default: 100.00,
        umbral_verde: 100.00,
        umbral_azul: 110.00,
        margen_minimo: 0.00,
        ...newConfig
      } as AppConfig;
      db.configs.push(newC);
      saveLocalDB(db);
      return newC;
    }
    const conf = { ...db.configs[idx], ...newConfig } as AppConfig;
    db.configs[idx] = conf;
    saveLocalDB(db);
    return conf;
  },

  // ==========================================
  // USUARIOS
  // ==========================================
  async getUsuarios(): Promise<Usuario[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('usuarios').select('*').order('nombre');
        if (!error && data) return data as Usuario[];
      } catch (e) {
        console.error('Error al obtener usuarios de Supabase, usando local:', e);
      }
    }
    return getLocalDB().usuarios;
  },

  async saveUsuario(usuario: Usuario): Promise<Usuario> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Construir el payload limpio para Supabase (sin campos undefined ni id temporal)
        const dbUsuario: Record<string, unknown> = {
          nombre: usuario.nombre,
          username: usuario.username,
          rol: usuario.rol,
          password: usuario.password || '123456'
        };
        if (usuario.id && !usuario.id.startsWith('u-')) {
          dbUsuario.id = usuario.id;
        }
        const { data, error } = await supabase
          .from('usuarios')
          .upsert(dbUsuario)
          .select()
          .single();
        if (error) {
          console.error('Error al guardar usuario en Supabase:', error);
          throw error;
        }
        if (data) return data as Usuario;
      } catch (e) {
        console.error('Error al guardar usuario en Supabase, usando local:', e);
        throw e;
      }
    }
    const db = getLocalDB();
    const index = db.usuarios.findIndex(u => u.id === usuario.id);
    if (index >= 0) {
      db.usuarios[index] = usuario;
    } else {
      db.usuarios.push(usuario);
    }
    saveLocalDB(db);
    return usuario;
  },

  async deleteUsuario(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('usuarios').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar usuario de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.usuarios = db.usuarios.filter(u => u.id !== id);
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // PARTIDAS DE PRESUPUESTO
  // ==========================================
  async getPartidas(obraId: string): Promise<Partida[]> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase.from('partidas').select('*').eq('obra_id', obraId).order('codigo');
        if (!error && data) return data as Partida[];
      } catch (e) {
        console.error('Error al obtener partidas de Supabase, usando local:', e);
      }
    }
    return getLocalDB().partidas.filter(p => p.obra_id === obraId).sort((a, b) => a.codigo.localeCompare(b.codigo));
  },

  async savePartida(partida: Partida): Promise<Partida> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbPartida = {
          ...partida,
          id: !partida.id || partida.id.startsWith('p-') ? undefined : partida.id
        };
        const { data, error } = await supabase
          .from('partidas')
          .upsert(dbPartida)
          .select()
          .single();
        if (!error && data) return data as Partida;
      } catch (e) {
        console.error('Error al guardar partida en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    const index = db.partidas.findIndex(p => (p.id === partida.id || p.codigo === partida.codigo) && p.obra_id === partida.obra_id);
    if (index >= 0) {
      db.partidas[index] = { ...db.partidas[index], ...partida };
    } else {
      db.partidas.push(partida);
    }
    saveLocalDB(db);
    return partida;
  },

  async importPartidas(obraId: string, partidas: Partida[]): Promise<boolean> {
    const scopedPartidas = partidas.map(p => ({ ...p, obra_id: obraId }));
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('partidas').upsert(scopedPartidas);
        if (!error) return true;
      } catch (e) {
        console.error('Error al importar partidas a Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    scopedPartidas.forEach(newP => {
      const idx = db.partidas.findIndex(p => p.codigo === newP.codigo && p.obra_id === obraId);
      if (idx >= 0) {
        db.partidas[idx] = { ...db.partidas[idx], ...newP };
      } else {
        db.partidas.push(newP);
      }
    });
    saveLocalDB(db);
    return true;
  },

  async deletePartida(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('partidas').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar partida de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.partidas = db.partidas.filter(p => p.id !== id);
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // BRIGADAS
  // ==========================================
  async getAllBrigadas(): Promise<Brigada[]> {
    const db = getLocalDB();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('brigadas')
          .select('*, usuarios(nombre)');
        if (!error && data) {
          return data.map((item: any) => ({
            ...item,
            jefe_nombre: item.usuarios?.nombre || 'Sin asignar'
          })) as Brigada[];
        }
      } catch (e) {
        console.error('Error al obtener todas las brigadas de Supabase:', e);
      }
    }
    return db.brigadas.map(b => {
      const user = db.usuarios.find(u => u.id === b.jefe_equipo_id);
      return {
        ...b,
        jefe_nombre: user ? user.nombre : 'Sin asignar'
      };
    });
  },

  async getBrigadas(obraId: string): Promise<Brigada[]> {
    const db = getLocalDB();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('brigadas')
          .select('*, usuarios(nombre)')
          .eq('obra_id', obraId)
          .order('nombre');
        if (!error && data) {
          return data.map((item: any) => ({
            ...item,
            jefe_nombre: item.usuarios?.nombre || 'Sin asignar'
          })) as Brigada[];
        }
      } catch (e) {
        console.error('Error al obtener brigadas de Supabase, usando local:', e);
      }
    }
    // Para local, resolvemos el nombre del jefe de equipo
    return db.brigadas.filter(b => b.obra_id === obraId).map(b => {
      const user = db.usuarios.find(u => u.id === b.jefe_equipo_id);
      return {
        ...b,
        jefe_nombre: user ? user.nombre : 'Sin asignar'
      };
    });
  },

  async saveBrigada(brigada: Brigada): Promise<Brigada> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbBrigada = {
          ...brigada,
          id: !brigada.id || brigada.id.startsWith('b-') ? undefined : brigada.id
        };
        const { data, error } = await supabase
          .from('brigadas')
          .upsert(dbBrigada)
          .select()
          .single();
        if (!error && data) return data as Brigada;
      } catch (e) {
        console.error('Error al guardar brigada en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    const index = db.brigadas.findIndex(b => b.id === brigada.id);
    if (index >= 0) {
      db.brigadas[index] = brigada;
    } else {
      db.brigadas.push(brigada);
    }
    saveLocalDB(db);
    return brigada;
  },

  async deleteBrigada(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('brigadas').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar brigada de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.brigadas = db.brigadas.filter(b => b.id !== id);
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // PARTES DE TRABAJO
  // ==========================================
  async getPartesTrabajo(obraId: string): Promise<ParteTrabajo[]> {
    const db = getLocalDB();
    if (isSupabaseConfigured && supabase) {
      try {
        // Carga partes con brigada, creador y líneas
        const { data, error } = await supabase
          .from('partes_trabajo')
          .select(`
            *,
            brigada:brigadas(nombre),
            creado_por_user:usuarios(nombre),
            partes_lineas(
              *,
              partida:partidas(codigo, descripcion, unidad, precio_unitario, rendimiento_objetivo)
            )
          `)
          .eq('obra_id', obraId)
          .order('fecha', { ascending: false });

        if (!error && data) {
          return data.map((pt: any) => ({
            id: pt.id,
            fecha: pt.fecha,
            brigada_id: pt.brigada_id,
            num_personas: pt.num_personas,
            creado_por: pt.creado_por,
            observaciones: pt.observaciones || '',
            obra_id: pt.obra_id,
            creado_en: pt.creado_en,
            actualizado_en: pt.actualizado_en,
            brigada_nombre: pt.brigada?.nombre || 'Desconocida',
            creado_por_nombre: pt.creado_por_user?.nombre || 'Desconocido',
            lineas: pt.partes_lineas?.map((pl: any) => ({
              id: pl.id,
              parte_id: pl.parte_id,
              partida_id: pl.partida_id,
              metros_ejecutados: Number(pl.metros_ejecutados),
              partida_codigo: pl.partida?.codigo || 'N/A',
              partida_descripcion: pl.partida?.descripcion || '',
              partida_unidad: pl.partida?.unidad || 'm',
              partida_precio_unitario: Number(pl.partida?.precio_unitario || 0),
              partida_rendimiento_objetivo: Number(pl.partida?.rendimiento_objetivo || 100)
            })) || []
          })) as ParteTrabajo[];
        }
      } catch (e) {
        console.error('Error al obtener partes de Supabase, usando local:', e);
      }
    }

    // Resolver relaciones de mock
    return db.partes_trabajo.filter(pt => pt.obra_id === obraId).map(pt => {
      const brigada = db.brigadas.find(b => b.id === pt.brigada_id);
      const creador = db.usuarios.find(u => u.id === pt.creado_por);
      const lineas = db.partes_lineas
        .filter(pl => pl.parte_id === pt.id)
        .map(pl => {
          const partida = db.partidas.find(p => p.id === pl.partida_id);
          return {
            ...pl,
            partida_codigo: partida?.codigo || 'N/A',
            partida_descripcion: partida?.descripcion || '',
            partida_unidad: partida?.unidad || 'm',
            partida_precio_unitario: partida?.precio_unitario || 0,
            partida_rendimiento_objetivo: partida?.rendimiento_objetivo || 100
          };
        });

      return {
        ...pt,
        brigada_nombre: brigada ? brigada.nombre : 'Desconocida',
        creado_por_nombre: creador ? creador.nombre : 'Desconocido',
        lineas
      };
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async saveParteTrabajo(parte: ParteTrabajo, lineas: Omit<ParteLinea, 'id' | 'parte_id'>[]): Promise<ParteTrabajo> {
    if (isSupabaseConfigured && supabase) {
      try {
        // Guardar cabecera
        const cabeceraData = {
          id: parte.id.startsWith('pt-') ? undefined : parte.id, // Si es mock anterior o vacía, generamos nueva
          fecha: parte.fecha,
          brigada_id: parte.brigada_id,
          num_personas: parte.num_personas,
          creado_por: parte.creado_por,
          observaciones: parte.observaciones,
          obra_id: parte.obra_id
        };

        let resultParte;
        if (parte.id && !parte.id.startsWith('pt-')) {
          // Update
          const { data, error } = await supabase
            .from('partes_trabajo')
            .update(cabeceraData)
            .eq('id', parte.id)
            .select()
            .single();
          if (error) throw error;
          resultParte = data;
        } else {
          // Insert
          const { data, error } = await supabase
            .from('partes_trabajo')
            .insert(cabeceraData)
            .select()
            .single();
          if (error) throw error;
          resultParte = data;
        }

        const parteId = resultParte.id;

        // Borrar líneas antiguas si es edición
        if (parte.id && !parte.id.startsWith('pt-')) {
          await supabase.from('partes_lineas').delete().eq('parte_id', parteId);
        }

        // Insertar nuevas líneas
        const lineasData = lineas.map(l => ({
          parte_id: parteId,
          partida_id: l.partida_id,
          metros_ejecutados: l.metros_ejecutados
        }));

        const { error: lineasError } = await supabase.from('partes_lineas').insert(lineasData);
        if (lineasError) throw lineasError;

        return { ...resultParte, lineas: [] } as ParteTrabajo;
      } catch (e) {
        console.error('Error al guardar parte en Supabase, usando local:', e);
      }
    }

    // Persistencia local fallback
    const db = getLocalDB();
    const isNew = !parte.id || parte.id.startsWith('pt-') && !db.partes_trabajo.some(p => p.id === parte.id);
    const parteId = isNew ? `pt-${Date.now()}` : parte.id;

    const savedParte: ParteTrabajo = {
      id: parteId,
      fecha: parte.fecha,
      brigada_id: parte.brigada_id,
      num_personas: Number(parte.num_personas),
      creado_por: parte.creado_por,
      observaciones: parte.observaciones || '',
      obra_id: parte.obra_id
    };

    if (isNew) {
      db.partes_trabajo.push(savedParte);
    } else {
      const idx = db.partes_trabajo.findIndex(p => p.id === parte.id);
      db.partes_trabajo[idx] = savedParte;
      // Eliminar líneas viejas
      db.partes_lineas = db.partes_lineas.filter(pl => pl.parte_id !== parte.id);
    }

    // Guardar nuevas líneas
    lineas.forEach((l, idx) => {
      db.partes_lineas.push({
        id: `pl-${parteId}-${idx}`,
        parte_id: parteId,
        partida_id: l.partida_id,
        metros_ejecutados: Number(l.metros_ejecutados)
      });
    });

    saveLocalDB(db);
    return savedParte;
  },

  async deleteParteTrabajo(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('partes_trabajo').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar parte en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.partes_trabajo = db.partes_trabajo.filter(p => p.id !== id);
    db.partes_lineas = db.partes_lineas.filter(pl => pl.parte_id !== id);
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // GASTOS
  // ==========================================
  async getGastos(obraId: string): Promise<Gasto[]> {
    const db = getLocalDB();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('gastos')
          .select(`
            *,
            brigada:brigadas(nombre),
            partida:partidas(codigo),
            creado_por_user:usuarios(nombre)
          `)
          .eq('obra_id', obraId)
          .order('fecha', { ascending: false });

        if (!error && data) {
          return data.map((g: any) => ({
            ...g,
            importe: Number(g.importe),
            brigada_nombre: g.brigada?.nombre || 'Desconocida',
            partida_codigo: g.partida?.codigo || null,
            creado_por_nombre: g.creado_por_user?.nombre || 'Desconocido'
          })) as Gasto[];
        }
      } catch (e) {
        console.error('Error al obtener gastos de Supabase, usando local:', e);
      }
    }

    return db.gastos.filter(g => g.obra_id === obraId).map(g => {
      const brigada = db.brigadas.find(b => b.id === g.brigada_id);
      const partida = db.partidas.find(p => p.id === g.partida_id);
      const creador = db.usuarios.find(u => u.id === g.creado_por);
      return {
        ...g,
        brigada_nombre: brigada ? brigada.nombre : 'Desconocida',
        partida_codigo: partida ? partida.codigo : null,
        creado_por_nombre: creador ? creador.nombre : 'Desconocido'
      };
    }).sort((a, b) => b.fecha.localeCompare(a.fecha));
  },

  async saveGasto(gasto: Gasto): Promise<Gasto> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbGasto = {
          id: gasto.id.startsWith('g-') ? undefined : gasto.id,
          fecha: gasto.fecha,
          categoria: gasto.categoria,
          concepto: gasto.concepto,
          importe: gasto.importe,
          tipo_coste: gasto.tipo_coste || 'unico',
          brigada_id: gasto.brigada_id,
          partida_id: gasto.partida_id || null,
          proveedor: gasto.proveedor || null,
          creado_por: gasto.creado_por,
          obra_id: gasto.obra_id
        };

        const { data, error } = await supabase
          .from('gastos')
          .upsert(dbGasto)
          .select()
          .single();
        if (!error && data) return data as Gasto;
      } catch (e) {
        console.error('Error al guardar gasto en Supabase, usando local:', e);
      }
    }

    const db = getLocalDB();
    const isNew = !gasto.id || gasto.id.startsWith('g-') && !db.gastos.some(g => g.id === gasto.id);
    const finalGasto = {
      ...gasto,
      id: isNew ? `g-${Date.now()}` : gasto.id,
      importe: Number(gasto.importe),
      tipo_coste: gasto.tipo_coste || 'unico',
      partida_id: gasto.partida_id || null,
      proveedor: gasto.proveedor || null
    };

    if (isNew) {
      db.gastos.push(finalGasto);
    } else {
      const idx = db.gastos.findIndex(g => g.id === gasto.id);
      db.gastos[idx] = finalGasto;
    }
    saveLocalDB(db);
    return finalGasto;
  },

  async deleteGasto(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('gastos').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar gasto de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    db.gastos = db.gastos.filter(g => g.id !== id);
    saveLocalDB(db);
    return true;
  },

  // ==========================================
  // RECURSOS (TRABAJADORES Y MAQUINARIA)
  // ==========================================
  async getRecursos(obraId: string): Promise<Recurso[]> {
    const db = getLocalDB();
    if (isSupabaseConfigured && supabase) {
      try {
        const { data, error } = await supabase
          .from('recursos')
          .select('*, brigadas(nombre)')
          .eq('obra_id', obraId)
          .order('nombre');
        if (!error && data) {
          return data.map((item: any) => ({
            ...item,
            brigada_nombre: item.brigadas?.nombre || 'Sin asignar'
          })) as Recurso[];
        }
      } catch (e) {
        console.error('Error al obtener recursos de Supabase, usando local:', e);
      }
    }
    return (db.recursos || []).filter(r => r.obra_id === obraId).map(r => {
      const brigada = db.brigadas.find(b => b.id === r.brigada_id);
      return {
        ...r,
        brigada_nombre: brigada ? brigada.nombre : 'Sin asignar'
      };
    });
  },

  async saveRecurso(recurso: Recurso): Promise<Recurso> {
    if (isSupabaseConfigured && supabase) {
      try {
        const dbRecurso = {
          ...recurso,
          id: !recurso.id || recurso.id.startsWith('r-') ? undefined : recurso.id
        };
        const { data, error } = await supabase
          .from('recursos')
          .upsert(dbRecurso)
          .select()
          .single();
        if (!error && data) return data as Recurso;
      } catch (e) {
        console.error('Error al guardar recurso en Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    if (!db.recursos) db.recursos = [];
    const isNew = !recurso.id || recurso.id.startsWith('r-') && !db.recursos.some(r => r.id === recurso.id);
    const finalRecurso = {
      ...recurso,
      id: isNew ? `r-${Date.now()}` : recurso.id,
      sueldo: Number(recurso.sueldo) || 0,
      seguridad_social: Number(recurso.seguridad_social) || 0,
      alojamiento: Number(recurso.alojamiento) || 0,
      otros_costes: Number(recurso.otros_costes) || 0
    };
    if (isNew) {
      db.recursos.push(finalRecurso);
    } else {
      const idx = db.recursos.findIndex(r => r.id === recurso.id);
      if (idx >= 0) db.recursos[idx] = finalRecurso;
    }
    saveLocalDB(db);
    return finalRecurso;
  },

  async deleteRecurso(id: string): Promise<boolean> {
    if (isSupabaseConfigured && supabase) {
      try {
        const { error } = await supabase.from('recursos').delete().eq('id', id);
        if (!error) return true;
      } catch (e) {
        console.error('Error al borrar recurso de Supabase, usando local:', e);
      }
    }
    const db = getLocalDB();
    if (!db.recursos) db.recursos = [];
    db.recursos = db.recursos.filter(r => r.id !== id);
    saveLocalDB(db);
    return true;
  }
};
