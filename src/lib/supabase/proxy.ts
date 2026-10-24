import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { GATE_COOKIE, GATE_COOKIE_MAX_AGE_SECONDS, cookieMatches, gateCookieValue, isGateOpenPath, setupRedirectPath } from "@/lib/profile/gate";
import { supabaseEnv } from "./env";

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });
  const { url, key } = supabaseEnv();
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  // Validates the token and refreshes it when it is close to expiry. Do not use getSession() here.
  const { data } = await supabase.auth.getClaims();

  // A signed-in member whose profile lacks the four required fields can only open the setup screen (and sign out).
  const sub = data?.claims.sub;
  const { pathname, search } = request.nextUrl;
  if (sub && !isGateOpenPath(pathname)) {
    const now = new Date();
    if (!cookieMatches(request.cookies.get(GATE_COOKIE)?.value, sub, now)) {
      const { data: complete } = await supabase.rpc("profile_is_complete");
      if (complete === true) {
        response.cookies.set(GATE_COOKIE, gateCookieValue(sub, now), {
          httpOnly: true,
          sameSite: "lax",
          secure: process.env.NODE_ENV === "production",
          path: "/",
          maxAge: GATE_COOKIE_MAX_AGE_SECONDS,
        });
      } else if (complete === false) {
        const redirect = NextResponse.redirect(new URL(setupRedirectPath(pathname, search), request.url));
        // Keep the refreshed sign-in cookies on the redirect too.
        response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
        return redirect;
      }
      // If the check itself failed (neither true nor false) the page is let through; the database rules still apply.
    }
  }
  return response;
}
