import { createBrowserClient } from '@supabase/ssr'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

// Cookie-backed client so the session is visible to middleware/server code,
// not just the browser tab that signed in.
export const supabase = createBrowserClient(
  supabaseUrl,
  supabaseAnonKey
)