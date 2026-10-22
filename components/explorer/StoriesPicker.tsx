"use client";

import { useEffect, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { Play, Pause, X, Clock, FilmStrip, Stop } from "@phosphor-icons/react";
import { STORIES, type Story } from "@/lib/data/stories";
import { useSelection } from "@/lib/store";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onClose: () => void;
};

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function StoriesPicker({ open, onClose }: Props) {
  const reduceMotion = useReducedMotion();
  const playStory = useSelection((s) => s.playStory);
  const pauseStory = useSelection((s) => s.pauseStory);
  const resumeStory = useSelection((s) => s.resumeStory);
  const endStory = useSelection((s) => s.endStory);
  const playingStoryId = useSelection((s) => s.story.playingStoryId);
  const isPaused = useSelection((s) => s.story.paused);
  const currentView = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, handleKeyDown]);

  const handleSelectStory = (story: Story) => {
    if (playingStoryId === story.id) {
      if (isPaused) {
        resumeStory();
      } else {
        pauseStory();
      }
      return;
    }
    if (currentView !== "galaxy") {
      setView("galaxy");
    }
    playStory(story.id);
    onClose();
  };

  const sheetTransition = reduceMotion
    ? { duration: 0 }
    : { type: "spring", stiffness: 320, damping: 30 };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop Scrim */}
          <motion.div
            key="stories-scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-bg-deep/70 backdrop-blur-sm"
            onClick={onClose}
            aria-hidden
          />

          {/* Stories Side Sheet / Popover panel */}
          <motion.aside
            key="stories-sheet"
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -24, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -20, scale: 0.98 }}
            transition={sheetTransition}
            role="dialog"
            aria-modal="true"
            aria-label="Cinematic Stories Library"
            className={cn(
              "fixed z-50 flex flex-col border border-border-faint bg-bg-panel/95 backdrop-blur-xl shadow-2xl",
              // Desktop: docked near nav rail
              "md:left-18 md:top-4 md:bottom-4 md:w-96 md:rounded-xl",
              // Mobile: bottom sheet style
              "max-md:inset-x-2 max-md:bottom-2 max-md:max-h-[85vh] max-md:rounded-xl"
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border-faint px-5 py-4">
              <div className="flex items-center gap-2">
                <FilmStrip size={18} weight="regular" className="text-accent" />
                <div>
                  <h2 className="font-mono text-xs uppercase tracking-[0.18em] text-fg-strong">
                    Cinematic Stories
                  </h2>
                  <p className="font-mono text-2xs text-fg-muted">
                    Curated galactic narratives
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close stories picker"
                className="rounded-md border border-border-faint p-1.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
              >
                <X size={15} />
              </button>
            </div>

            {/* Stories List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {STORIES.map((story) => {
                const isPlaying = playingStoryId === story.id;
                return (
                  <div
                    key={story.id}
                    className={cn(
                      "group relative flex flex-col gap-2.5 rounded-lg border p-4 transition-all text-left",
                      isPlaying
                        ? "border-accent/70 bg-accent-bg/40 shadow-[0_0_15px_rgba(235,160,50,0.1)]"
                        : "border-border-faint bg-bg-panel/40 hover:border-border-line hover:bg-bg-panel/70"
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-mono text-sm font-semibold tracking-wide text-fg-strong">
                            {story.title}
                          </h3>
                          {isPlaying && (
                            <span className="flex items-center gap-1 rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-wider text-accent border border-accent/40">
                              <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                              {isPaused ? "Paused" : "Playing"}
                            </span>
                          )}
                        </div>

                        {/* Story meta chips */}
                        <div className="mt-1 flex items-center gap-3 font-mono text-2xs text-fg-muted">
                          <span className="flex items-center gap-1">
                            <Clock size={11} />
                            {formatDuration(story.estimatedSec)}
                          </span>
                          <span>·</span>
                          <span>{story.beats.length} beats</span>
                        </div>
                      </div>

                      {/* Play / Toggle Button */}
                      <button
                        type="button"
                        onClick={() => handleSelectStory(story)}
                        aria-label={isPlaying ? (isPaused ? "Resume story" : "Pause story") : `Play ${story.title}`}
                        className={cn(
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition-colors",
                          isPlaying
                            ? "border-accent bg-accent text-accent-fg hover:opacity-90"
                            : "border-border-faint text-fg-muted hover:border-accent/60 hover:text-fg-strong hover:bg-accent-bg/30"
                        )}
                      >
                        {isPlaying ? (
                          isPaused ? <Play size={14} weight="fill" /> : <Pause size={14} weight="fill" />
                        ) : (
                          <Play size={14} weight="regular" />
                        )}
                      </button>
                    </div>

                    {/* Blurb */}
                    <p className="text-xs leading-relaxed text-fg-muted line-clamp-3">
                      {story.blurb}
                    </p>

                    {/* Footer action for playing state */}
                    {isPlaying && (
                      <div className="mt-1 flex items-center justify-between border-t border-accent/20 pt-2 font-mono text-2xs">
                        <span className="text-fg-muted">Currently active</span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            endStory();
                          }}
                          className="flex items-center gap-1 text-accent hover:underline"
                        >
                          <Stop size={11} />
                          Stop story
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Footer Tip */}
            <div className="border-t border-border-faint px-5 py-3 font-mono text-2xs text-fg-dim">
              Press <kbd className="rounded border border-border-faint px-1">Esc</kbd> to dismiss or stop playback.
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
