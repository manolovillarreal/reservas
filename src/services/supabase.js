import { createClient } from '@supabase/supabase-js'
import { OFFLINE_MUTATION_MESSAGE, isOnlineNow } from '../composables/useConnectivity'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('Faltan variables de entorno de Supabase.')
}

const nativeFetch = (...args) => globalThis.fetch(...args)

const offlineAwareFetch = async (input, init = {}) => {
  const requestMethod = String(init?.method || input?.method || 'GET').toUpperCase()
  const isReadOnlyRequest = requestMethod === 'GET' || requestMethod === 'HEAD'

  if (!isReadOnlyRequest && !isOnlineNow()) {
    throw new Error(OFFLINE_MUTATION_MESSAGE)
  }

  return nativeFetch(input, init)
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder',
  {
    global: {
      fetch: offlineAwareFetch,
    }
  }
)
