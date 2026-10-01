import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Publica al instante los cambios hechos en /admin (productos, banners, promo).
// Solo funciona si quien llama es el administrador: se verifica su sesión en Supabase.
export async function POST(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '');
  const urlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!token || !urlRaw || !anonKey) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }

  const supabase = createClient(urlRaw.replace(/\/rest\/v1\/?$/, ''), anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await supabase.rpc('es_admin');
  if (error || data !== true) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  revalidatePath('/');
  return NextResponse.json({ ok: true });
}
