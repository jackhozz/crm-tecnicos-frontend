import { createClient } from '@supabase/supabase-js'

// Estas variables las configuraremos en un archivo .env en el siguiente paso
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Exportamos esta instancia para usarla en cualquier parte de la app o backend
export const supabase = createClient(supabaseUrl, supabaseAnonKey)