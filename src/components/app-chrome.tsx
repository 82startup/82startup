"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/browser";

const navigation = [
  { href: "/members", label: "Members", marker: "01" },
  { href: "/connections", label: "Connections", marker: "02" },
  { href: "/messages", label: "Messages", marker: "03" },
  { href: "/profile", label: "My profile", marker: "04" },
  { href: "/settings", label: "Settings", marker: "05" },
  { href: "/admin/events", label: "Admin", marker: "06" },
];

function isCommunityRoute(pathname: string): boolean {
  return /^\/(?:events|members|member|connections|messages|profile|settings|admin|speakers|sponsors)(?:\/|$)/.test(pathname);
}

export function AppChrome({ header, signup, children, overlay }: { header: ReactNode; signup: ReactNode; children: ReactNode; overlay: ReactNode }) {
  const pathname = usePathname();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!isCommunityRoute(pathname)) return;

    let current = true;
    const supabase = createClient();
    async function checkAdmin() {
      try {
        const { data: claims, error: claimsError } = await supabase.auth.getClaims();
        if (claimsError || !claims?.claims.sub) {
          if (current) setIsAdmin(false);
          return;
        }
        const { data, error } = await supabase.rpc("is_admin");
        if (current) setIsAdmin(!error && data === true);
      } catch {
        if (current) setIsAdmin(false);
      }
    }

    void checkAdmin();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        return;
      }
      queueMicrotask(() => { void checkAdmin(); });
    });
    return () => {
      current = false;
      subscription.unsubscribe();
    };
  }, [pathname]);

  if (!isCommunityRoute(pathname)) {
    return <>{header}{children}{signup}{overlay}</>;
  }

  return (
    <div className="community-shell">
      <aside className="community-sidebar" aria-label="Community navigation">
        <Link className="community-brand" href="/members">
          <span className="community-brand-mark" aria-hidden="true"><img src="/assets/82startup-symbol.svg" alt="" /></span>
          <span><strong>82 STARTUP WEEK</strong><small>COMMUNITY</small></span>
        </Link>
        <div className="community-nav-label">NETWORK</div>
        <nav className="community-nav">
          {navigation.filter(({ href }) => href !== "/admin/events" || isAdmin).map(({ href, label, marker }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return <Link key={href} href={href} aria-current={active ? "page" : undefined} className="community-nav-link"><span className="community-nav-marker">{marker}</span>{label}<span className="community-nav-arrow" aria-hidden="true">↗</span></Link>;
          })}
        </nav>
        <form action="/auth/signout" method="post" className="community-signout-form">
          <button type="submit" className="community-signout"><span aria-hidden="true">↗</span> Sign out</button>
        </form>
        <Link className="community-back" href="/">← Summit home</Link>
      </aside>
      <div className="community-content">
        {children}
        {overlay}
      </div>
    </div>
  );
}
