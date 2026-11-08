import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * Cliente de Supabase para EJ Casa (proyecto CASA, separado del de EJ).
 *
 * - Usa SOLO la clave pública (anon) y el token del usuario: cada consulta se resuelve con RLS
 *   como ese usuario. En /casa no existe ninguna clave de servicio.
 * - La sesión vive únicamente en memoria. El refresh token no se guarda en localStorage:
 *   queda en la bóveda cifrada (PIN / biometría) y se descarta al bloquear.
 */
export function crearClienteCasa(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_CASA_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_CASA_SUPABASE_ANON_KEY;
  if (!url || !anon) {
    throw new Error('Falta configurar CASA_SUPABASE_URL y CASA_SUPABASE_ANON_KEY.');
  }
  const memoria = new Map<string, string>();
  return createClient(url, anon, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
      storageKey: 'ej-casa-memoria',
      storage: {
        getItem: (k) => memoria.get(k) ?? null,
        setItem: (k, v) => void memoria.set(k, v),
        removeItem: (k) => void memoria.delete(k),
      },
    },
  });
}

/** Suelta un cliente sin revocar su sesión en el servidor (el token sigue guardado en la bóveda). */
export function descartarCliente(c: SupabaseClient | null) {
  if (!c) return;
  try { void c.auth.stopAutoRefresh(); } catch { /* ya estaba parado */ }
}
