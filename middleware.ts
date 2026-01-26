import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const { nextUrl } = req;

  const redirectToLogin = () => {
    // Prevent redirect loops: if already redirecting to login, don't redirect again
    const redirectParam = nextUrl.searchParams.get('redirect');
    if (redirectParam && redirectParam === nextUrl.pathname) {
      // Already in a redirect loop, break it by redirecting to login without params
      return NextResponse.redirect(new URL('/login', req.url));
    }
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
    // Add timeout to prevent middleware from hanging
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

    try {
      const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: SUPABASE_ANON_KEY,
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!userRes.ok) {
        // Token is invalid or expired
        return redirectToLogin();
      }
      const user = await userRes.json();

      // Check profile role via PostgREST with RLS using the user's token
      const profileController = new AbortController();
      const profileTimeoutId = setTimeout(() => profileController.abort(), 3000);
      
      const profileRes = await fetch(
        `${SUPABASE_URL}/rest/v1/profiles?select=user_role&id=eq.${encodeURIComponent(user.id)}`,
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            apikey: SUPABASE_ANON_KEY,
            Accept: "application/json",
          },
          signal: profileController.signal,
        }
      );
      
      clearTimeout(profileTimeoutId);
      
      if (!profileRes.ok) {
        return redirectToLogin();
      }
      const profiles = await profileRes.json();
      const role = Array.isArray(profiles) && profiles[0]?.user_role;
      
      // RBAC: Check if user has the required role for this path
      if (requiredRole && role !== requiredRole) {
        // User is authenticated but doesn't have the right role
        // Redirect to their appropriate dashboard instead of login
        const userDashboard = role === "admin" ? "/admin" : 
                            role === "pet_owner" ? "/pet_owner" : 
                            role === "veterinarian" ? "/veterinarian" : "/";
        return NextResponse.redirect(new URL(userDashboard, req.url));
      }
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // Network error or timeout - redirect to login
      console.error('Middleware fetch error:', fetchError.name);
      return redirectToLogin();
    }
  } catch (error) {
    // Unexpected error - redirect to login to be safe
    console.error('Middleware error:', error);
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
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder files (images, etc.)
     * - api routes (handled separately)
     */
    "/admin/:path*",
    "/pet_owner/:path*",
    "/veterinarian/:path*",
  ],
};
