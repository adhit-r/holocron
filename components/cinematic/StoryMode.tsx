"use client";

import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Pause, Play, X, SkipForward, SkipBack, ShareNetwork, Check } from "@phosphor-icons/react";
import { useSelection } from "@/lib/store";
import { findStory, type StoryBeat } from "@/lib/data/stories";

const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/**
 * Story orchestrator. When `playingStoryId` is set in the store:
 *  - Walks beats sequentially, dispatching selection / era / quote
 *  - Animates era between beats (linear interpolation, frame-tick driven)
 *  - The era animation crosses canonical event years which auto-fires the
 *    EventInterrupt registry — that's the hybrid composition
 *  - Renders intro / outro title cards bookending the story
 *  - Floating control bar with play/pause/skip/end
 *  - Esc ends the story; space toggles pause; arrows skip beats
 *
 * Reduced motion: era jumps instantly between beats (no animation), but the
 * beat hold timing is preserved so quotes still get reading time.
 */
export function StoryMode() {
  const playingId = useSelection((s) => s.story.playingStoryId);
  const beatIndex = useSelection((s) => s.story.beatIndex);
  const paused = useSelection((s) => s.story.paused);
  const setStoryBeat = useSelection((s) => s.setStoryBeat);
  const pauseStory = useSelection((s) => s.pauseStory);
  const resumeStory = useSelection((s) => s.resumeStory);
  const endStory = useSelection((s) => s.endStory);
  const select = useSelection((s) => s.select);
  const clearSelection = useSelection((s) => s.clearSelection);
  const setEra = useSelection((s) => s.setEra);
  const era = useSelection((s) => s.era);

  const reduceMotion = useReducedMotion();
  const story = playingId ? findStory(playingId) : null;
  const totalBeats = story?.beats.length ?? 0;
  /** beatIndex meanings: -1 = intro card; 0..N-1 = beats; N = outro card. */
  const inIntro = beatIndex === -1;
  const inOutro = story !== null && beatIndex >= totalBeats;
  const currentBeat: StoryBeat | null =
    story && !inIntro && !inOutro ? story.beats[beatIndex] ?? null : null;
  
  // Sync state to URL deeplink.
  useEffect(() => {
    const url = new URL(window.location.href);
    if (playingId) {
      url.searchParams.set("story", playingId);
      url.searchParams.set("beat", beatIndex.toString());
      if (paused) url.searchParams.set("paused", "true");
      else url.searchParams.delete("paused");
    } else {
      url.searchParams.delete("story");
      url.searchParams.delete("beat");
      url.searchParams.delete("paused");
    }
    window.history.replaceState(null, "", url.toString());
  }, [playingId, beatIndex, paused]);

  // Advance timer — runs while a beat is active and not paused.
  useEffect(() => {
    if (!story || paused) return;
    let durationMs: number;
    if (inIntro) durationMs = story.introMs;
    else if (inOutro) durationMs = story.outroMs;
    else durationMs = currentBeat?.durationMs ?? 4000;

    const t = window.setTimeout(() => {
      const next = beatIndex + 1;
      if (next > totalBeats) {
        endStory();
      } else {
        setStoryBeat(next);
      }
    }, durationMs);
    return () => window.clearTimeout(t);
  }, [story, beatIndex, paused, currentBeat, inIntro, inOutro, totalBeats, setStoryBeat, endStory]);

  // Apply beat dispatch (selection + era animation).
  const targetEraRef = useRef<number | null>(null);
  const eraStartRef = useRef<number>(era);
  const eraStartTimeRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!currentBeat) return;
    if (currentBeat.entityId && currentBeat.entityType) {
      select(currentBeat.entityId, currentBeat.entityType);
    }
    if (currentBeat.era !== undefined) {
      const target = currentBeat.era;
      const start = era;
      const span = currentBeat.durationMs;
      if (reduceMotion || start === target) {
        setEra(target);
      } else {
        targetEraRef.current = target;
        eraStartRef.current = start;
        eraStartTimeRef.current = performance.now();
        const tick = () => {
          const t = (performance.now() - eraStartTimeRef.current) / span;
          if (t >= 1 || targetEraRef.current === null) {
            setEra(target);
            rafRef.current = null;
            return;
          }
          // Quart ease-out for the temporal sweep.
          const eased = 1 - Math.pow(1 - t, 4);
          const value = eraStartRef.current + (target - eraStartRef.current) * eased;
          setEra(value);
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
        return () => {
          if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
          targetEraRef.current = null;
        };
      }
    }
    // Note: intentionally not depending on `era` — only kicks animation on beat change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentBeat, select, setEra, reduceMotion]);

  // Keyboard controls.
  useEffect(() => {
    if (!story) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement) {
        const tag = e.target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || e.target.isContentEditable) return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        endStory();
        clearSelection();
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        paused ? resumeStory() : pauseStory();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        if (beatIndex + 1 <= totalBeats) setStoryBeat(beatIndex + 1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        if (beatIndex - 1 >= -1) setStoryBeat(beatIndex - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [story, beatIndex, paused, totalBeats, endStory, pauseStory, resumeStory, setStoryBeat, clearSelection]);

  // Cleanup on unmount or story end — cancel any in-flight era animation.
  useEffect(() => {
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  if (!story) return null;

  return (
    <>
      {/* Intro / Outro title cards */}
      <AnimatePresence>
        {inIntro && (
          <CinematicTitleCard
            key="intro"
            title={story.title}
            subtitle={story.blurb}
            kicker="A guided cinematic"
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
        {inOutro && (
          <CinematicTitleCard
            key="outro"
            title="End"
            subtitle={`The archive remembers. ${story.title}.`}
            kicker={null}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
      </AnimatePresence>

      {/* Active beat overlay (quote + caption) */}
      <AnimatePresence mode="wait">
        {currentBeat && (
          <BeatOverlay
            key={beatIndex}
            beat={currentBeat}
            reduceMotion={Boolean(reduceMotion)}
          />
        )}
      </AnimatePresence>

      {/* Floating controls — always visible while story plays */}
      <StoryControls
        beatIndex={beatIndex}
        totalBeats={totalBeats}
        paused={paused}
        onTogglePause={() => (paused ? resumeStory() : pauseStory())}
        onPrev={() => beatIndex - 1 >= -1 && setStoryBeat(beatIndex - 1)}
        onNext={() => beatIndex + 1 <= totalBeats && setStoryBeat(beatIndex + 1)}
        onEnd={() => {
          endStory();
          clearSelection();
        }}
      />
    </>
  );
}

function CinematicTitleCard({
  title,
  subtitle,
  kicker,
  reduceMotion
}: {
  title: string;
  subtitle: string;
  kicker: string | null;
  reduceMotion: boolean;
}) {
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
      className="pointer-events-none fixed inset-0 z-[88] flex items-center justify-center bg-bg-deep/85 backdrop-blur-md"
    >
      <motion.div
        initial={reduceMotion ? false : { y: 16, scale: 0.98 }}
        animate={{ y: 0, scale: 1 }}
        transition={{ duration: reduceMotion ? 0 : 0.6, ease: EASE_OUT }}
        className="flex max-w-[720px] flex-col items-center gap-4 px-8 text-center"
      >
        {kicker && (
          <span className="font-mono text-2xs uppercase tracking-[0.4em] text-fg-dim">
            {kicker}
          </span>
        )}
        <h2
          className="font-sans font-medium tracking-[-0.02em] text-fg-strong"
          style={{ fontSize: "clamp(40px, 8vw, 96px)", lineHeight: 1.04 }}
        >
          {title}
        </h2>
        <p
          className="max-w-[44ch] text-fg-primary/85"
          style={{ fontSize: "clamp(15px, 1.6vw, 20px)" }}
        >
          {subtitle}
        </p>
      </motion.div>
    </motion.div>
  );
}

function BeatOverlay({ beat, reduceMotion }: { beat: StoryBeat; reduceMotion: boolean }) {
  const hasQuote = Boolean(beat.quote);
  const hasCaption = Boolean(beat.caption);
  if (!hasQuote && !hasCaption) return null;
  return (
    <motion.div
      initial={reduceMotion ? false : { opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10 }}
      transition={{ duration: reduceMotion ? 0 : 0.36, ease: EASE_OUT }}
      className="pointer-events-none fixed inset-x-0 bottom-32 z-[82] flex justify-center px-6"
    >
      <div className="flex max-w-[720px] flex-col items-center gap-3 rounded-2xl border border-border-line bg-bg-overlay/85 px-6 py-5 text-center backdrop-blur-md">
        {beat.caption && (
          <span className="font-mono text-2xs uppercase tracking-[0.32em] text-fg-dim">
            {beat.caption}
          </span>
        )}
        {beat.quote && (
          <>
            <p
              className="font-sans italic text-fg-strong"
              style={{ fontSize: "clamp(17px, 2.1vw, 24px)", lineHeight: 1.42 }}
            >
              &ldquo;{beat.quote.text}&rdquo;
            </p>
            <span className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-muted">
              — {beat.quote.speaker}
            </span>
          </>
        )}
      </div>
    </motion.div>
  );
}

function StoryControls({
  beatIndex,
  totalBeats,
  paused,
  onTogglePause,
  onPrev,
  onNext,
  onEnd
}: {
  beatIndex: number;
  totalBeats: number;
  paused: boolean;
  onTogglePause: () => void;
  onPrev: () => void;
  onNext: () => void;
  onEnd: () => void;
}) {
  // Progress: -1 (intro) → 0/totalBeats; outro at totalBeats. Treat intro as 0%.
  const progress = beatIndex < 0 ? 0 : Math.min(beatIndex / totalBeats, 1);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.32, ease: EASE_OUT }}
      className="fixed inset-x-0 bottom-6 z-[86] flex justify-center px-4"
    >
      <div className="pointer-events-auto flex items-center gap-2 rounded-full border border-border-line bg-bg-overlay/90 px-3 py-2 backdrop-blur-md">
        <ControlButton onClick={onPrev} ariaLabel="Previous beat" disabled={beatIndex < 0}>
          <SkipBack size={16} weight="regular" />
        </ControlButton>
        <ControlButton onClick={onTogglePause} ariaLabel={paused ? "Resume" : "Pause"}>
          {paused ? <Play size={16} weight="fill" /> : <Pause size={16} weight="regular" />}
        </ControlButton>
        <ControlButton onClick={onNext} ariaLabel="Next beat" disabled={beatIndex >= totalBeats}>
          <SkipForward size={16} weight="regular" />
        </ControlButton>

        <div className="mx-2 h-1 w-40 overflow-hidden rounded-full bg-border-faint">
          <motion.div
            className="h-full bg-accent"
            initial={{ width: 0 }}
            animate={{ width: `${progress * 100}%` }}
            transition={{ duration: 0.4, ease: "linear" }}
          />
        </div>
        <span className="hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:inline">
          {beatIndex < 0 ? "intro" : beatIndex >= totalBeats ? "end" : `${beatIndex + 1} / ${totalBeats}`}
        </span>

        <span aria-hidden className="mx-1 h-5 w-px bg-border-faint" />
        <ShareButton />
        <ControlButton onClick={onEnd} ariaLabel="End story">
          <X size={16} weight="regular" />
        </ControlButton>
      </div>
    </motion.div>
  );
}

function ShareButton() {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
    }
  };

  return (
    <ControlButton onClick={handleShare} ariaLabel="Share this beat">
      <AnimatePresence mode="wait" initial={false}>
        {copied ? (
          <motion.div
            key="check"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
            className="text-accent"
          >
            <Check size={16} weight="bold" />
          </motion.div>
        ) : (
          <motion.div
            key="share"
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.5, opacity: 0 }}
          >
            <ShareNetwork size={16} weight="regular" />
          </motion.div>
        )}
      </AnimatePresence>
    </ControlButton>
  );
}

function ControlButton({
  onClick,
  ariaLabel,
  disabled = false,
  children
}: {
  onClick: () => void;
  ariaLabel: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-9 w-9 items-center justify-center rounded-full text-fg-muted transition-colors hover:bg-bg-panel/60 hover:text-fg-primary disabled:pointer-events-none disabled:opacity-30"
    >
      {children}
    </button>
  );
}
