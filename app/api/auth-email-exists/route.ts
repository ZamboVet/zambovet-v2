import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const email = String(searchParams.get('email') || '').trim().toLowerCase();
  if (!email) return NextResponse.json({ ok: false, exists: false, error: 'Missing email' }, { status: 400 });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string | undefined;
  if (!supabaseUrl) return NextResponse.json({ ok: false, exists: false, error: 'Supabase URL not configured' }, { status: 500 });

  try {
    if (serviceKey) {
      const admin = createClient(supabaseUrl, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });
      const { data, error } = await (admin as any).auth.admin.getUserByEmail(email);
      if (!error && data?.user) return NextResponse.json({ ok: true, exists: true });
      if (error && String(error?.message || '').includes('User not found')) return NextResponse.json({ ok: true, exists: false });
    }
  } catch (e: any) {
    // fall through to public check
  }

  try {
    // Fallback: check profiles table (case-insensitive)
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;
    const client = createClient(supabaseUrl, anonKey, { auth: { autoRefreshToken: false, persistSession: false } });
    const { data } = await client.from('profiles').select('id').ilike('email', email).maybeSingle();
    return NextResponse.json({ ok: true, exists: !!data });
  } catch (e: any) {
    return NextResponse.json({ ok: false, exists: false, error: e?.message || 'Unknown error' }, { status: 500 });
  }
}
