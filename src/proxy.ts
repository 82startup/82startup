import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (process.env.NODE_ENV === "development" && process.env.COMMUNITY_LOCAL_PREVIEW === "1") {
    return updateSession(request);
  }
  // The Summit is public and must also work without a community session/database.
  if (pathname === "/" || pathname === "/index.html" ||
      /^\/(?:schedule|speakers|venue|tickets)\.html$/.test(pathname) ||
      /^\/(?:assets|venue-map|licenses)(?:\/|$)/.test(pathname) ||
      /^\/(?:app|event-data|event-photos|glyph-ember-preview|hero-glitch|company-logos)\.js$/.test(pathname) ||
      pathname === "/style.css") {
    return NextResponse.next();
  }
  // Temporary launch gate: retain the community implementation for later integration.
  if (/^\/(?:events|members|connections|messages|profile|settings|login|admin|speakers|sponsors)(?:\/|$)/.test(pathname)) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
