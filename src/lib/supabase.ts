import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// No romper la aplicación durante el build o en local si el usuario aún no configuró las variables
export const isSupabaseConfigured = 
  typeof window !== 'undefined' 
    ? (!!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : (!!supabaseUrl && !!supabaseAnonKey);

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

if (!isSupabaseConfigured && typeof window !== 'undefined') {
  console.warn(
    'Supabase no está configurado. La aplicación utilizará almacenamiento local (mock data) de forma automática. Agrega NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY en .env.local para conectar con tu base de datos de Supabase.'
  );
}
