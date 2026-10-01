import { createClient } from '@supabase/supabase-js'

const supabaseUrlRaw = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrlRaw || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno obligatorias de Supabase en el cliente.')
}

// Clean url to remove any trailing rest/v1/ path
const supabaseUrl = supabaseUrlRaw.replace(/\/rest\/v1\/?$/, '');

// Cliente seguro para operaciones públicas controladas por RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  // Siempre datos frescos: el panel no debe mostrar respuestas guardadas por el navegador
  global: { fetch: (input, init) => fetch(input, { ...init, cache: 'no-store' }) },
})
