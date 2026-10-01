import { createClient } from '@supabase/supabase-js';

// Cliente con privilegios de administrador. SOLO para código de servidor (API routes).
// Si falta la clave service_role se lanza un error: nunca se degrada a la clave pública.
export function getSupabaseAdmin() {
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const adminKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!urlRaw || !adminKey) {
    throw new Error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en las variables de entorno.');
  }

  const url = urlRaw.replace(/\/rest\/v1\/?$/, '');
  return createClient(url, adminKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
