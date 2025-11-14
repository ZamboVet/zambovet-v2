import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL as string | undefined;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string | undefined;

if (!url || !anon) {
  // Surface a precise error early to avoid opaque 'Failed to fetch' from auth refresh
  // Ensure you have a .env.local with NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY defined
  // Example:
  // NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
  // NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
  // Also run the app via http://localhost (not file://)
  // eslint-disable-next-line no-console
  console.error(
    '[Supabase] Missing configuration. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in your environment.'
  );
}

export const supabase = createClient(url || '', anon || '', {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});
