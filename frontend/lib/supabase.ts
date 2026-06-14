import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Faltan las variables de entorno obligatorias de Supabase en el cliente.')
}

// Cliente seguro para operaciones públicas controladas por RLS
export const supabase = createClient(supabaseUrl, supabaseAnonKey)
