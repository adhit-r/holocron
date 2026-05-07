"use client";

import { motion, AnimatePresence } from "motion/react";
import { useCallback, useEffect, useState } from "react";
import type { Entity } from "@/lib/schema";
import { useSelection } from "@/lib/store";
import { buildEntityCrawl } from "@/lib/utils";

// Phase durations (milliseconds)
const LEAD_MS = 3000;
const TITLE_MS = 2800;
const CRAWL_MS = 24000;
const FADE_MS = 1000;
const TOTAL_MS = LEAD_MS + TITLE_MS + CRAWL_MS;

type Phase = "lead" | "title" | "crawl" | "fade";

type Props = {
  entity: Entity | null;
  entities: Entity[];
  open: boolean;
  onClose: () => void;
};

export function EntityCrawl({ entity, entities, open, onClose }: Props) {
  const setGlobalCrawlOpen = useSelection((s) => s.setCrawlOpen);
  const [phase, setPhase] = useState<Phase>("lead");

  const finish = useCallback(() => {
    onClose();
    setGlobalCrawlOpen(false);
  }, [onClose, setGlobalCrawlOpen]);

  // Reset phase each time the overlay opens
  useEffect(() => {
    if (!open || !entity) return;

    // Reduced motion: close immediately, no crawl
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      const id = window.setTimeout(finish, 80);
      return () => window.clearTimeout(id);
    }

    setPhase("lead");
    setGlobalCrawlOpen(true);

    const t1 = window.setTimeout(() => setPhase("title"), LEAD_MS);
    const t2 = window.setTimeout(() => setPhase("crawl"), LEAD_MS + TITLE_MS);
    const t3 = window.setTimeout(() => setPhase("fade"), TOTAL_MS);
    const t4 = window.setTimeout(() => finish(), TOTAL_MS + FADE_MS);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      window.clearTimeout(t4);
    };
  }, [open, entity, finish]);

  // Keyboard skip: Esc, Enter, Space
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" || e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        finish();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, finish]);

  if (!open || !entity) return null;

  const crawlContent = buildEntityCrawl(entity, entities);

  return (
    <AnimatePresence>
      <motion.div
        key={`entity-crawl-${entity.id}`}
        initial={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        animate={phase === "fade" ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: FADE_MS / 1000, ease: [0.16, 1, 0.3, 1] }}
        className="fixed inset-0 z-[90] bg-bg-deep"
        aria-label={`Dossier sequence: ${entity.name}`}
        role="dialog"
        aria-modal="true"
        onClick={() => finish()}
      >
        <SkipButton onSkip={finish} />

        <div className="absolute inset-0">
          <AnimatePresence mode="wait">
            {phase === "lead" && (
              <LeadCard key="entity-lead" />
            )}
            {phase === "title" && (
              <TitleCard
                key="entity-title"
                title={crawlContent.title}
                subtitle={crawlContent.subtitle}
              />
            )}
            {phase === "crawl" && (
              <CrawlCard
                key="entity-crawl"
                title={crawlContent.title}
                subtitle={crawlContent.subtitle}
                paragraphs={crawlContent.paragraphs}
              />
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}

function LeadCard() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: [0, 1, 1, 0] }}
      transition={{
        duration: LEAD_MS / 1000,
        ease: "easeOut",
        times: [0, 0.18, 0.78, 1],
      }}
      className="absolute inset-0 grid place-items-center px-6"
    >
      <p
        className="max-w-[60ch] text-center font-sans text-2xl font-light leading-snug tracking-wide md:text-3xl"
        style={{ color: "oklch(0.78 0.13 235)" }}
      >
        A long time ago, in this archive....
      </p>
    </motion.div>
  );
}

type TitleCardProps = {
  title: string;
  subtitle: string;
};

function TitleCard({ title, subtitle }: TitleCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 6 }}
      animate={{ opacity: [0, 1, 1, 0], scale: [6, 1.6, 0.4, 0.05] }}
      transition={{
        duration: TITLE_MS / 1000,
        ease: [0.16, 1, 0.3, 1],
        times: [0, 0.22, 0.7, 1],
      }}
      className="absolute inset-0 grid place-items-center"
      style={{ willChange: "transform, opacity" }}
    >
      <div className="flex flex-col items-center gap-4">
        <h2
          className="font-sans font-medium"
          style={{
            fontSize: "clamp(48px, 10vw, 180px)",
            color: "oklch(0.94 0.005 80)",
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          {title}
        </h2>
        <p className="font-mono text-2xs uppercase tracking-[0.42em] text-fg-muted md:text-xs">
          {subtitle}
        </p>
      </div>
    </motion.div>
  );
}

type CrawlCardProps = {
  title: string;
  subtitle: string;
  paragraphs: string[];
};

function CrawlCard({ title, subtitle, paragraphs }: CrawlCardProps) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Top fade mask so text vanishes smoothly at the top edge */}
      <div
        aria-hidden
        className="absolute inset-0 z-10 pointer-events-none"
        style={{
          background:
            "linear-gradient(180deg, oklch(0.09 0.005 240) 0%, oklch(0.09 0.005 240 / 0.85) 22%, transparent 52%)",
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          perspective: "420px",
          perspectiveOrigin: "50% 100%",
        }}
      >
        <motion.div
          initial={{ y: "60vh", opacity: 0 }}
          animate={{ y: ["60vh", "-220vh"], opacity: [0, 1, 1, 0.85] }}
          transition={{
            duration: CRAWL_MS / 1000,
            ease: "linear",
            times: [0, 0.06, 0.92, 1],
          }}
          className="absolute left-1/2 top-0 -translate-x-1/2"
          style={{
            transform: "rotateX(25deg)",
            transformOrigin: "50% 100%",
            willChange: "transform, opacity",
            width: "min(720px, 80vw)",
          }}
        >
          <div className="flex flex-col items-center gap-12 text-center">
            {/* Title block */}
            <div className="flex flex-col items-center gap-4">
              <p
                className="font-sans text-2xl font-medium uppercase tracking-[0.18em]"
                style={{ color: "oklch(0.94 0.005 80)" }}
              >
                {subtitle}
              </p>
              <p
                className="font-sans text-3xl font-semibold uppercase tracking-[0.06em] md:text-5xl"
                style={{ color: "oklch(0.94 0.005 80)" }}
              >
                {title}
              </p>
            </div>

            {/* Body paragraphs */}
            {paragraphs.map((paragraph, i) => (
              <p
                key={i}
                className="font-sans text-2xl font-medium leading-[1.45] md:text-3xl"
                style={{
                  color: "oklch(0.94 0.005 80)",
                  textWrap: "balance" as never,
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
      aria-label="Skip dossier sequence"
    >
      Skip crawl
      <kbd className="rounded border border-border-faint px-1 py-0.5 text-[9px]">esc</kbd>
    </button>
  );
}
