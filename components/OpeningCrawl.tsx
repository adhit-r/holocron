"use client";

import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import { useSelection } from "@/lib/store";

const LEAD_HOLD_MS = 4200;
const TITLE_HOLD_MS = 3300;
const CRAWL_DURATION_MS = 38000;
const TOTAL_MS = LEAD_HOLD_MS + TITLE_HOLD_MS + CRAWL_DURATION_MS;

const STORAGE_KEY = "holocron:intro_seen";

const CRAWL_TITLE = "EPISODE 0";
const CRAWL_SUBTITLE = "THE OPEN ARCHIVE";

const CRAWL_BODY: string[] = [
  "It is a period of fragmented memory. Twenty-five thousand years of galactic history sit scattered across canon and Legends, mirrored in rival archives, contradicted in older records.",
  "In a quiet study, the keepers have begun a unification. The work is not yet complete, but the first console is now open. A single surface for navigating the galaxy across space, time, and lineage.",
  "Pursued by the noise of incompatible sources, the keepers race to keep the archive coherent. Pick anything. See it everywhere. The Holocron responds...."
];

type Phase = "init" | "lead" | "title" | "crawl" | "done";

export function OpeningCrawl() {
  const setGlobalCrawlOpen = useSelection((s) => s.setCrawlOpen);
  const [show, setShow] = useState(false);
  const [phase, setPhase] = useState<Phase>("init");

  const finish = useCallback(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
    setShow(false);
    setPhase("done");
    setGlobalCrawlOpen(false);
  }, [setGlobalCrawlOpen]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const intent = params.get("intro");

    if (intent === "skip") {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      return;
    }

    let seen = false;
    try {
      seen = window.localStorage.getItem(STORAGE_KEY) === "1";
    } catch {}

    if (intent !== "force" && seen) return;

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      try {
        window.localStorage.setItem(STORAGE_KEY, "1");
      } catch {}
      return;
    }

    setShow(true);
    setPhase("lead");
    setGlobalCrawlOpen(true);

    const t1 = window.setTimeout(() => setPhase("title"), LEAD_HOLD_MS);
    const t2 = window.setTimeout(() => setPhase("crawl"), LEAD_HOLD_MS + TITLE_HOLD_MS);
    const t3 = window.setTimeout(() => finish(), TOTAL_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
    };
  }, [finish]);

  useEffect(() => {
    if (!show) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [show, finish]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="crawl-overlay"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.1, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-bg-deep"
          aria-label="Opening sequence"
          role="dialog"
        >
          <SkipButton onSkip={finish} />

          <div
            className="absolute inset-0"
            onClick={(e) => {
              if (phase !== "lead") {
                e.stopPropagation();
                finish();
              }
            }}
          >
            <AnimatePresence mode="wait">
              {phase === "lead" && <LeadCard key="lead" />}
              {phase === "title" && <TitleCard key="title" />}
              {phase === "crawl" && <CrawlCard key="crawl" />}
            </AnimatePresence>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function LeadCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{ duration: LEAD_HOLD_MS / 1000, ease: "easeOut", times: [0, 0.18, 0.78, 1] }}
      className="absolute inset-0 grid place-items-center px-6"
    >
      <p
        className="max-w-[60ch] text-center font-sans text-2xl font-light leading-snug tracking-wide md:text-3xl"
        style={{ color: "oklch(0.78 0.13 235)" }}
      >
        A long time ago in a galaxy far, far away....
      </p>
    </motion.div>
  );
}

function TitleCard() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [6, 1.6, 0.4, 0.05] }}
      transition={{
        duration: TITLE_HOLD_MS / 1000,
        ease: [0.16, 1, 0.3, 1],
        times: [0, 0.22, 0.7, 1]
      }}
      className="absolute inset-0 grid place-items-center"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="flex flex-col items-center gap-4" role="presentation">
        <p
          aria-hidden
          className="font-sans font-medium tracking-[-0.04em]"
          style={{
            fontSize: "clamp(64px, 12vw, 200px)",
            color: "oklch(0.94 0.005 80)",
            letterSpacing: "-0.04em",
            lineHeight: 1
          }}
        >
          HOLOCRON
        </p>
        <p className="font-mono text-2xs uppercase tracking-[0.42em] text-fg-muted md:text-xs">
          Archive of the galaxy
        </p>
      </div>
    </motion.div>
  );
}

function CrawlCard() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div
        aria-hidden
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.09 0.005 240) 0%, oklch(0.09 0.005 240 / 0.85) 26%, transparent 56%)"
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          perspective: "420px",
          perspectiveOrigin: "50% 100%"
        }}
      >
        <motion.div
          initial={{ y: "60vh", opacity: 0 }}
          animate={{ y: ["60vh", "-220vh"], opacity: [0, 1, 1, 0.85] }}
          transition={{
            duration: CRAWL_DURATION_MS / 1000,
            ease: "linear",
            times: [0, 0.06, 0.92, 1]
          }}
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            transform: "rotateX(25deg)",
            transformOrigin: "50% 100%",
            willChange: "transform, opacity",
            width: "min(720px, 80vw)"
          }}
        >
          <div className="flex flex-col items-center gap-12 text-center">
            <div className="flex flex-col items-center gap-4">
              <p
                className="font-sans text-2xl font-medium uppercase tracking-[0.18em]"
                style={{ color: "oklch(0.94 0.005 80)" }}
              >
                {CRAWL_TITLE}
              </p>
              <p
                className="font-sans text-3xl font-semibold uppercase tracking-[0.06em] md:text-5xl"
                style={{ color: "oklch(0.94 0.005 80)" }}
              >
                {CRAWL_SUBTITLE}
              </p>
            </div>
            {CRAWL_BODY.map((paragraph, i) => (
              <p
                key={i}
                className="font-sans text-2xl font-medium leading-[1.45] md:text-3xl"
                style={{
                  color: "oklch(0.94 0.005 80)",
                  textWrap: "balance" as never
                }}
              >
                {paragraph}
              </p>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}

function SkipButton({ onSkip }: { onSkip: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSkip();
      }}
      className="fixed right-5 top-8 z-[91] inline-flex items-center gap-2 rounded-full border border-border-faint bg-bg-canvas/60 px-4 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted backdrop-blur-md transition-colors hover:border-border-line hover:text-fg-primary"
      aria-label="Skip opening sequence"
    >
      Skip intro
      <kbd className="rounded border border-border-faint px-1 py-0.5 text-[9px]">esc</kbd>
    </button>
  );
}
