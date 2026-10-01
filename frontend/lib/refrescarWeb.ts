import { supabase } from '@/lib/supabase';

/** Le avisa al servidor que publique ya los cambios hechos en el panel (si falla, se publican solos en 1 minuto). */
export async function refrescarWeb(): Promise<void> {
  try {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) return;
    await fetch('/api/revalidar', { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
  } catch {
    /* no es crítico */
  }
}
