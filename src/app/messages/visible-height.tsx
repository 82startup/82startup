"use client";

import { useEffect } from "react";

// iPhone keeps the page height when the keyboard opens, so the composer at the bottom ends up under the keyboard.
// While Messages is open, --visible-height follows the area actually visible above the keyboard (the mobile CSS
// sizes the page to it) and the page is held at the top so nothing scrolls away under the community header.
export function VisibleHeight() {
  useEffect(() => {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const root = document.documentElement;
    const update = () => {
      root.style.setProperty("--visible-height", `${Math.round(viewport.height)}px`);
      if (window.scrollY !== 0) window.scrollTo(0, 0);
    };
    update();
    viewport.addEventListener("resize", update);
    viewport.addEventListener("scroll", update);
    return () => {
      viewport.removeEventListener("resize", update);
      viewport.removeEventListener("scroll", update);
      root.style.removeProperty("--visible-height");
    };
  }, []);
  return null;
}
