import type { Metadata } from "next";
import { Suspense, type ReactNode } from "react";
import "./globals.css";
import { SiteHeader } from "@/components/site-header";
import { SignupBar } from "@/components/signup-bar";
import { AppChrome } from "@/components/app-chrome";

export const metadata: Metadata = {
  title: "82 Startup",
  description: "Events and community for Korean founders, investors and builders.",
};

export default function RootLayout({ children, modal }: { children: ReactNode; modal: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=Noto+Sans+KR:wght@400;500;600;700&display=swap" />
      </head>
      <body className="min-h-full flex flex-col">
        {/* The fallback is a plain paper screen: drawing the old public header here flashed the previous design on every load. */}
        <Suspense fallback={<div className="app-fallback" aria-busy="true" />}>
          <AppChrome header={<SiteHeader />} signup={<SignupBar />} overlay={modal}>{children}</AppChrome>
        </Suspense>
      </body>
    </html>
  );
}
