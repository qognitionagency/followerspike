import { createBrowserClient } from '@supabase/ssr'
import { optionalEnv } from '@/lib/env'

export function createClient() {
  return createBrowserClient(
    optionalEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co'),
    optionalEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'example-anon-key')
  )
}
