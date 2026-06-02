"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function useHeaderScrollState() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const headerClassName = cn(
    "sticky top-0 z-50 w-full border-b transition-all duration-200 pt-[env(safe-area-inset-top,0px)]",
    scrolled
      ? "bg-card/80 backdrop-blur-md shadow-sm border-border"
      : "bg-card border-border",
  );

  return { scrolled, headerClassName };
}
