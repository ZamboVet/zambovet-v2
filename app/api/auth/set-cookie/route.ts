import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { access_token, refresh_token, expires_in } = await req.json();
    if (!access_token || !refresh_token) {
      return NextResponse.json({ ok: false, error: "MISSING_TOKENS" }, { status: 400 });
    }
    const maxAge = typeof expires_in === 'number' && expires_in > 0 ? expires_in : 60 * 60; // 1h default
    const secure = process.env.NODE_ENV === 'production';

    const res = NextResponse.json({ ok: true });
    // Primary cookies used by middleware
    res.cookies.set('sb-access-token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge,
    });
    res.cookies.set('sb-refresh-token', refresh_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
    // Backward-compat cookie name fallback
    res.cookies.set('sb:token', access_token, {
      httpOnly: true,
      sameSite: 'lax',
      secure,
      path: '/',
      maxAge,
    });
    return res;
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message || 'INTERNAL' }, { status: 500 });
  }
}
