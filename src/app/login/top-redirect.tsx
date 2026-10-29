"use client";

import { useEffect } from "react";

/** Leaves the Summit sign-in iframe for the community page when the visitor is already signed in. */
export function TopRedirect({ href }: { href: string }) {
  useEffect(() => {
    (window.top ?? window).location.assign(href);
  }, [href]);
  return <p role="status"><a href={href} target="_top">Continue to the community</a></p>;
}
