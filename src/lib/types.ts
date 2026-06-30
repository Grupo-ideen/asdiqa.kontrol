// Definiciones de tipos para Control de Rendimiento de Obra

export type UserRole = 'admin' | 'jefe_equipo' | 'lector';

export interface Obra {
  id: string;
  nombre: string;
  descripcion?: string;
  creado_en?: string;
}

export interface UsuarioObra {
  usuario_id: string;
  obra_id: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  username: string;
  rol: UserRole;
  creado_en?: string;
  password?: string;
}

export interface Partida {
  id: string;
  codigo: string;
  descripcion: string;
  unidad: string; // m, ud, m2, etc.
  precio_unitario: number;
  medicion_contrato: number;
  rendimiento_objetivo: number; // m/persona/dia
  obra_id: string;
  creado_en?: string;
}

export interface Brigada {
  id: string;
  nombre: string;
  jefe_equipo_id: string | null;
  num_personas_habitual: number;
  obra_id: string;
  creado_en?: string;
  // Relaciones
  jefe_nombre?: string;
}

export interface ParteTrabajo {
  id: string;
  fecha: string;
  brigada_id: string;
  num_personas: number;
  creado_por: string | null;
  observaciones: string;
  obra_id: string;
  creado_en?: string;
  actualizado_en?: string;
  // Relaciones
  brigada_nombre?: string;
  creado_por_nombre?: string;
  lineas?: ParteLinea[];
}

export interface ParteLinea {
  id: string;
  parte_id: string;
  partida_id: string;
  metros_ejecutados: number;
  // Relaciones
  partida_codigo?: string;
  partida_descripcion?: string;
  partida_unidad?: string;
  partida_precio_unitario?: number;
  partida_rendimiento_objetivo?: number;
}

export interface Gasto {
  id: string;
  fecha: string;
  categoria: 'Material' | 'Trabajador' | 'Opcional' | 'Varios';
  concepto: string;
  importe: number;
  tipo_coste?: 'unico' | 'mensual' | 'diario';
  brigada_id: string;
  partida_id: string | null;
  proveedor: string | null;
  obra_id: string;
  creado_por: string | null;
  creado_en?: string;
  // Relaciones
  brigada_nombre?: string;
  partida_codigo?: string | null;
  creado_por_nombre?: string;
}

export interface AppConfig {
  id: string;
  obra_id: string;
  rendimiento_default: number;
  umbral_verde: number; // % cumplimiento (ej: 100)
  umbral_azul: number; // % cumplimiento (ej: 110)
  margen_minimo: number; // euros (ej: 0)
}

export interface Recurso {
  id: string;
  nombre: string;
  tipo: 'trabajador' | 'maquinaria' | 'alojamiento' | 'otros';
  sueldo: number;
  seguridad_social: number;
  alojamiento: number;
  otros_costes: number;
  brigada_id: string | null;
  obra_id: string;
  creado_en?: string;
  // Relaciones
  brigada_nombre?: string;
}

// Interfaz para almacenar el estado mock en localStorage
export interface DatabaseSchema {
  obras: Obra[];
  usuarios_obras: UsuarioObra[];
  usuarios: Usuario[];
  partidas: Partida[];
  brigadas: Brigada[];
  partes_trabajo: ParteTrabajo[];
  partes_lineas: ParteLinea[];
  gastos: Gasto[];
  recursos: Recurso[];
  configs: AppConfig[];
}
