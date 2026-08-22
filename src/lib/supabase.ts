import { createClient } from '@supabase/supabase-js'
import { cookieStorage } from './cookie-storage'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY. Copy .env.example to .env.local and fill it in.',
  )
}

// Sessão via cookie no domínio raiz (.placehub.app) para que o login feito em
// qualquer subdomínio (plataforma ou tenant) valha para todos os outros.
// Ver docs/ARCHITECTURE.md — item "Login único / SSO entre subdomínios".
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: cookieStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})
