"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import { useSelection } from "@/lib/store";
import { EVENT_CINEMATICS } from "@/lib/data/event-cinematics";
import { cn } from "@/lib/utils";

const START_YEAR = -25025;
const END_YEAR = 35;
const TOTAL_YEARS = END_YEAR - START_YEAR;
const TARGET_DURATION_SEC = 120;
const REDUCED_MOTION_DURATION_SEC = 3;

const EVENT_SLOWDOWN_FACTOR = 5;
const EVENT_WINDOW_WIDTH = 15; // years for the Gaussian slowdown

/**
 * Cinematic Time Machine: auto-scrubs from 25,000 BBY to 35 ABY.
 *
 * Variable speed:
 * - Base speed is calculated to fit ~120s total.
 * - Near canonical events (EVENT_CINEMATICS), speed drops by 5x.
 * - Smooth Gaussian falloff ensures no abrupt step-changes.
 */
export function TimeMachine() {
  const { active, paused } = useSelection((s) => s.timeMachine);
  const stop = useSelection((s) => s.stopTimeMachine);
  const togglePause = useSelection((s) => s.toggleTimeMachinePause);
  const setEra = useSelection((s) => s.setEra);
  const eraInStore = useSelection((s) => s.era);
  const reduceMotion = useReducedMotion();

  const [currentEra, setCurrentEra] = useState(START_YEAR);
  const [nextEventYear, setNextEventYear] = useState<number | null>(null);

  const requestRef = useRef<number>();
  const lastTimeRef = useRef<number>();
  const eraRef = useRef(START_YEAR);

  // Sync internal ref with store era when starting or when changed externally
  useEffect(() => {
    if (active) {
      // If the store era is far from our internal era, sync them (e.g. manual scrub)
      if (Math.abs(eraRef.current - eraInStore) > 1) {
        eraRef.current = eraInStore;
        setCurrentEra(eraInStore);
      }
    } else {
      eraRef.current = START_YEAR;
    }
  }, [active, eraInStore]);

  useEffect(() => {
    if (!active || paused) {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      lastTimeRef.current = undefined;
      return;
    }

    const animate = (time: number) => {
      if (lastTimeRef.current === undefined) {
        lastTimeRef.current = time;
        requestRef.current = requestAnimationFrame(animate);
        return;
      }

      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;

      let next: number;
      if (reduceMotion) {
        const dEra = (TOTAL_YEARS / REDUCED_MOTION_DURATION_SEC) * dt;
        next = eraRef.current + dEra;
      } else {
        let slowdown = 1;
        let nearestYear: number | null = null;
        let minDist = Infinity;

        for (const ev of EVENT_CINEMATICS) {
          const dist = Math.abs(eraRef.current - ev.triggerYear);
          const contrib = (EVENT_SLOWDOWN_FACTOR - 1) * Math.exp(-Math.pow(dist / EVENT_WINDOW_WIDTH, 2));
          slowdown += contrib;

          if (ev.triggerYear > eraRef.current && ev.triggerYear - eraRef.current < minDist) {
            minDist = ev.triggerYear - eraRef.current;
            nearestYear = ev.triggerYear;
          }
        }
        
        setNextEventYear(nearestYear);

        const baseSpeed = 225; 
        const dEra = (baseSpeed / slowdown) * dt;
        next = eraRef.current + dEra;
      }

      if (next >= END_YEAR) {
        eraRef.current = END_YEAR;
        setEra(END_YEAR);
        setCurrentEra(END_YEAR);
        stop();
      } else {
        eraRef.current = next;
        // Batch these updates
        setEra(next);
        setCurrentEra(next);
        requestRef.current = requestAnimationFrame(animate);
      }
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [active, paused, reduceMotion, setEra, stop]); // currentEra removed from deps

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (!active) return;
      if (e.key === "Escape") {
        stop();
      }
      if (e.key === " " && !isTypingTarget(e.target)) {
        e.preventDefault();
        togglePause();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [active, stop, togglePause]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="pointer-events-none fixed inset-0 z-[80] flex flex-col items-center justify-end pb-24"
        >
          {/* Subtle vignette/overlay during time travel */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,oklch(0.06_0.005_240/0.4)_100%)]"
          />

          {/* Ticker UI */}
          <div className="pointer-events-auto relative flex flex-col items-center gap-4">
            <div 
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border px-6 py-4 backdrop-blur-xl transition-all duration-500",
                paused ? "border-accent/40 bg-accent-bg/20 scale-95" : "border-white/10 bg-black/40"
              )}
            >
              <div className="flex items-center gap-3">
                <span className={cn(
                  "font-mono text-[10px] uppercase tracking-[0.3em]",
                  paused ? "text-accent animate-pulse" : "text-fg-dim"
                )}>
                  {paused ? "Time Machine Paused" : "Time Machine Active"}
                </span>
                {paused && (
                  <button 
                    onClick={togglePause}
                    className="rounded bg-accent/20 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-accent hover:bg-accent/30"
                  >
                    Resume
                  </button>
                )}
              </div>
              
              <div className="flex items-baseline gap-3">
                <span className="font-mono text-4xl font-light tracking-tighter text-fg-strong">
                  {Math.abs(Math.round(currentEra)).toLocaleString()}
                </span>
                <span className="font-mono text-xl font-medium text-fg-muted">
                  {currentEra < 0 ? "BBY" : "ABY"}
                </span>
              </div>

              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/5">
                <motion.div 
                  className="h-full bg-accent"
                  initial={{ width: 0 }}
                  animate={{ width: `${((currentEra - START_YEAR) / TOTAL_YEARS) * 100}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                />
              </div>

              {nextEventYear !== null && (
                <div className="mt-4 flex items-center gap-2 border-t border-white/5 pt-3 w-full">
                  <span className="font-mono text-[9px] uppercase tracking-widest text-fg-dim">
                    Next:
                  </span>
                  <span className="font-mono text-[10px] font-bold text-accent">
                    {Math.abs(nextEventYear)} {nextEventYear < 0 ? "BBY" : "ABY"}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={togglePause}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-fg-muted transition-all hover:bg-white/10 hover:text-fg-primary"
              >
                {paused ? "Resume" : "Pause"} <span className="text-fg-dim group-hover:text-fg-muted">(SPACE)</span>
              </button>

              <button
                onClick={stop}
                className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[10px] font-mono uppercase tracking-widest text-fg-muted transition-all hover:bg-white/10 hover:text-fg-primary"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-red-500/80 group-hover:bg-red-500" />
                Exit <span className="text-fg-dim group-hover:text-fg-muted">(ESC)</span>
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}

function formatYear(y: number): string {
  if (y === 0) return "0 ABY";
  return y < 0 ? `${Math.abs(Math.round(y))} BBY` : `${Math.abs(Math.round(y))} ABY`;
}
