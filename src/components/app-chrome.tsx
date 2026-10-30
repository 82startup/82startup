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
  const [requests, setRequests] = useState(0); // connection requests waiting for my answer, shown on Connections
  const [unread, setUnread] = useState(0); // unread messages across conversations, shown on Messages

  useEffect(() => {
    if (!isCommunityRoute(pathname)) return;

    let current = true;
    const supabase = createClient();
    async function checkAdmin() {
      try {
        const { data: claims, error: claimsError } = await supabase.auth.getClaims();
        if (claimsError || !claims?.claims.sub) {
          if (current) { setIsAdmin(false); setRequests(0); setUnread(0); }
          return;
        }
        // Counts only: the same small functions the public header uses, not the full lists.
        const [admin, waiting, unreadCount] = await Promise.all([
          supabase.rpc("is_admin"),
          supabase.rpc("pending_request_count"),
          supabase.rpc("unread_message_count"),
        ]);
        if (!current) return;
        setIsAdmin(!admin.error && admin.data === true);
        setRequests(waiting.error ? 0 : Number(waiting.data) || 0);
        setUnread(unreadCount.error ? 0 : Number(unreadCount.data) || 0);
      } catch {
        if (current) { setIsAdmin(false); setRequests(0); setUnread(0); }
      }
    }

    void checkAdmin();
    // Keep the request and unread badges current while the tab is open and visible.
    const poll = () => { if (document.visibilityState === "visible") void checkAdmin(); };
    const timer = window.setInterval(poll, 15_000);
    document.addEventListener("visibilitychange", poll);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT") {
        setIsAdmin(false);
        setRequests(0);
        setUnread(0);
        return;
      }
      queueMicrotask(() => { void checkAdmin(); });
    });
    return () => {
      current = false;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", poll);
      subscription.unsubscribe();
    };
  }, [pathname]);

  // /login (the page and the Summit sign-in iframe) draws its own Summit layout, never the public header or signup bar.
  if (pathname === "/login") return <>{children}{overlay}</>;
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
        {/* Mobile only: profile and settings as icons in the brand row, so the tabs never scroll. */}
        <div className="community-mobile-actions">
          <Link href="/profile" className="community-icon-action" aria-label="My profile" title="My profile" aria-current={pathname.startsWith("/profile") ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="8.5" r="3.8" /><path d="M4.8 20c.9-3.9 3.7-6 7.2-6s6.3 2.1 7.2 6" /></svg>
          </Link>
          <Link href="/settings" className="community-icon-action" aria-label="Settings" title="Settings" aria-current={pathname.startsWith("/settings") ? "page" : undefined}>
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z" /></svg>
          </Link>
        </div>
        <div className="community-nav-label">NETWORK</div>
        <nav className="community-nav">
          {navigation.filter(({ href }) => href !== "/admin/events" || isAdmin).map(({ href, label, marker }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            const badge = href === "/connections" ? requests : href === "/messages" ? unread : 0;
            const badgeLabel = href === "/connections" ? "new connection request" : "unread message";
            const iconOnMobile = href === "/profile" || href === "/settings"; // shown as top-right icons on mobile instead
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={iconOnMobile ? "community-nav-link community-nav-desktop" : "community-nav-link"} aria-label={badge ? `${label}, ${badge} ${badgeLabel}${badge === 1 ? "" : "s"}` : undefined}>
                <span className="community-nav-marker">{marker}</span>{label}
                {badge > 0 && <span className="community-nav-badge" aria-hidden="true">{badge > 99 ? "99+" : badge}</span>}
                <span className="community-nav-arrow" aria-hidden="true">↗</span>
              </Link>
            );
          })}
        </nav>
        <Link className="community-back" href="/">← Summit home</Link>
      </aside>
      <div className="community-content">
        {children}
        {overlay}
      </div>
    </div>
  );
}
