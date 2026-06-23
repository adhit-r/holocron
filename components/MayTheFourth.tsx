"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { X, Sparkle } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/**
 * Hook to detect if the current local date is May 4th (Star Wars Day).
 */
export function useMayTheFourth() {
  const [isMay4, setIsMay4] = useState(false);

  useEffect(() => {
    // Check if current date is May 4th
    const now = new Date();
    // getMonth() is 0-indexed, so 4 is May
    if (now.getMonth() === 4 && now.getDate() === 4) {
      setIsMay4(true);
    }
  }, []);

  return isMay4;
}

/**
 * A tiny dismissible banner for May 4th.
 */
export function MayTheFourthBanner() {
  const isMay4 = useMayTheFourth();
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const isDismissed = sessionStorage.getItem("may-4-dismissed") === "true";
      if (isDismissed) setDismissed(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    sessionStorage.setItem("may-4-dismissed", "true");
  };

  if (!isMay4 || !visible || dismissed) return null;

  return (
    <div className="relative z-50 flex w-full items-center justify-center bg-success/10 px-4 py-2 backdrop-blur-md border-b border-success/20 animate-in slide-in-from-top duration-500">
      <div className="flex items-center gap-3 text-xs font-medium text-success">
        <Sparkle size={14} weight="fill" className="animate-pulse" />
        <span className="tracking-tight">May the Fourth be with you.</span>
        <span className="hidden opacity-60 md:inline">|</span>
        <Link 
          href="/explore" 
          className="underline decoration-success/30 underline-offset-2 transition-colors hover:text-fg-strong hover:decoration-success"
        >
          Initialize random-vergence cross-pivot
        </Link>
      </div>
      <button
        onClick={handleDismiss}
        className="absolute right-4 p-1 text-success/60 transition-colors hover:text-success focus:outline-none"
        aria-label="Dismiss banner"
      >
        <X size={14} />
      </button>
    </div>
  );
}

/**
 * A tagline component that shifts text on May 4th.
 */
export function MayTheFourthTagline() {
  const isMay4 = useMayTheFourth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return <span className="text-fg-muted">Across space, time, and lineage.</span>;
  }
  
  if (isMay4) {
    return (
      <span className="text-success animate-in fade-in slide-in-from-bottom-1 duration-1000">
        May the Fourth be with you.
      </span>
    );
  }

  return (
    <span className="text-fg-muted">
      Across space, time, and lineage.
    </span>
  );
}

import { Wordmark } from "./Wordmark";

/**
 * A Wordmark component that automatically handles the green glyph color on May 4th.
 */
export function MayTheFourthWordmark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const isMay4 = useMayTheFourth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  return <Wordmark size={size} forceGreen={mounted && isMay4} />;
}

/**
 * A Crosshair component that automatically handles the green color on May 4th.
 */
export function MayTheFourthCrosshair({ className }: { className?: string }) {
  const isMay4 = useMayTheFourth();
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => setMounted(true), []);

  const color = mounted && isMay4 ? "oklch(0.30 0.05 155)" : "oklch(0.30 0.05 235)";
  const dotColor = mounted && isMay4 ? "oklch(0.72 0.13 155)" : "oklch(0.78 0.13 235)";

  return (
    <svg
      viewBox="0 0 80 80"
      width="80"
      height="80"
      className={className}
      aria-hidden
      fill="none"
      stroke="currentColor"
      strokeWidth="1"
      style={{ color }}
    >
      <circle cx="40" cy="40" r="22" />
      <line x1="40" y1="2" x2="40" y2="14" />
      <line x1="40" y1="66" x2="40" y2="78" />
      <line x1="2" y1="40" x2="14" y2="40" />
      <line x1="66" y1="40" x2="78" y2="40" />
      <circle cx="40" cy="40" r="1.5" fill={dotColor} />
    </svg>
  );
}

