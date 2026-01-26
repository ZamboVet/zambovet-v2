import { NextResponse } from "next/server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  
  // Clear all auth-related cookies
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0, // Expire immediately
  };

  res.cookies.set('sb-access-token', '', cookieOptions);
  res.cookies.set('sb-refresh-token', '', cookieOptions);
  res.cookies.set('sb:token', '', cookieOptions);
  res.cookies.set('supabase-auth-token', '', cookieOptions);
  
  return res;
}
