import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const redirectToLogin = () => {
    const loginUrl = new URL(`/login?redirect=${encodeURIComponent(nextUrl.pathname + nextUrl.search)}`, req.url);
    return NextResponse.redirect(loginUrl);
  };

  const accessToken =
    req.cookies.get("sb-access-token")?.value ||
    // Fallback cookie names used by older helper versions
    req.cookies.get("supabase-auth-token")?.value ||
    req.cookies.get("sb:token")?.value;

  if (!accessToken) {
    return redirectToLogin();
  }

  // Validate the access token with Supabase Auth; also confirm user has the required role for the path
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Fail-safe: if env is missing, do not allow access
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    return redirectToLogin();
  }

  // Determine which role is required based on path
  const path = nextUrl.pathname || "/";
  let requiredRole: "admin" | "pet_owner" | "veterinarian" | null = null;
  if (path.startsWith("/admin")) requiredRole = "admin";
  else if (path.startsWith("/pet_owner")) requiredRole = "pet_owner";
  else if (path.startsWith("/veterinarian")) requiredRole = "veterinarian";

  try {
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        apikey: SUPABASE_ANON_KEY,
      },
    });
    if (!userRes.ok) {
      return redirectToLogin();
    }
    const user = await userRes.json();

    // Check profile role via PostgREST with RLS using the user's token
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/profiles?select=user_role&id=eq.${encodeURIComponent(user.id)}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
          Accept: "application/json",
        },
      }
    );
    if (!profileRes.ok) {
      return redirectToLogin();
    }
    const profiles = await profileRes.json();
    const role = Array.isArray(profiles) && profiles[0]?.user_role;
    if (requiredRole && role !== requiredRole) {
      return redirectToLogin();
    }
  } catch {
    return redirectToLogin();
  }

  // Enforce no-cache to prevent back-button showing protected content
  const res = NextResponse.next();
  res.headers.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate"
  );
  res.headers.set("Pragma", "no-cache");
  res.headers.set("Expires", "0");
  res.headers.set("Surrogate-Control", "no-store");
  return res;
}

export const config = {
  matcher: ["/admin/:path*", "/pet_owner/:path*", "/veterinarian/:path*"],
};
