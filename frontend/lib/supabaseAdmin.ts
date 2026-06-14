import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder';

// Helper para instanciar el cliente con privilegios de administrador en el servidor
export function getSupabaseAdmin() {
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!adminKey) {
    console.warn('⚠️ ADVERTENCIA: SUPABASE_SERVICE_ROLE_KEY no está configurada en las variables de entorno.');
  }
  return createClient(supabaseUrl, adminKey || supabaseAnonKey);
}
