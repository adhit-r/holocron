"use client";

import { useEffect } from "react";
import { motion, AnimatePresence, useReducedMotion } from "motion/react";
import type { Battle, Entity, Hyperlane, TimelineEvent, War } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { LineageGraph } from "@/lib/data/loadLineage";
import type { PlanetImage } from "@/lib/data/loadPlanetImages";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { useSelection } from "@/lib/store";
import dynamic from "next/dynamic";
import { GalaxyCanvas } from "@/components/galaxy/GalaxyCanvas";
import { TimelineView } from "@/components/timeline/TimelineView";

const LineageView = dynamic(
  () => import("@/components/lineage").then((m) => m.LineageView),
  {
    ssr: false,
    loading: () => null
  }
);
import { NavRail } from "./NavRail";
import { Datapad } from "./Datapad";
import { DatapadDrawer } from "./DatapadDrawer";
import { TimelineScrubber } from "./TimelineScrubber";
import { LineagePlaceholder } from "./LineagePlaceholder";
import { SearchPalette } from "./SearchPalette";
import { HyperspaceOverlay } from "./HyperspaceOverlay";
import { AudioCueDispatcher } from "./AudioCueDispatcher";
import { HoloStage } from "@/components/holostage";
import { EventInterruptDispatcher, EventInterruptOverlay, StoryMode, TimeMachine } from "@/components/cinematic";

type Props = {
  entities: Entity[];
  planets: PlacedPlanet[];
  lanes: Hyperlane[];
  events: TimelineEvent[];
  lineage: LineageGraph | null;
  wars?: War[];
  battles?: Battle[];
  planetImages?: Map<string, PlanetImage> | null;
  personImages?: Map<string, PersonImage> | null;
};

// Animation choreography
// ──────────────────────
// Chrome (NavRail / Datapad / TimelineScrubber) slides into place once on
// mount with a 60-90ms stagger. View swaps (Galaxy ↔ Timeline ↔ Lineage)
// crossfade with a small scale to telegraph "depth swap" — distinct from
// the entity-level hyperspace streak. Reduced-motion bypasses both with
// `initial={false}` and zero-duration transitions.
const EASE_OUT_QUART = [0.16, 1, 0.3, 1] as const;

const VIEW_TRANSITION = { duration: 0.32, ease: EASE_OUT_QUART };
const VIEW_VARIANTS = {
  initial: { opacity: 0, scale: 1.02 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 }
};

export function AppShell({
  entities,
  planets,
  lanes,
  events,
  lineage,
  wars = [],
  battles = [],
  planetImages = null,
  personImages = null
}: Props) {
  const view = useSelection((s) => s.view);
  const setSearchOpen = useSelection((s) => s.setSearchOpen);
  const startRoute = useSelection((s) => s.startRoute);
  const clearRoute = useSelection((s) => s.clearRoute);
  const routeMode = useSelection((s) => s.route.mode);
  const reduceMotion = useReducedMotion();

  // Build Motion props for chrome regions. Reduced-motion → `initial={false}`
  // skips the entrance entirely and zero-duration ensures no transition.
  const chrome = (axis: "x" | "y", from: number, delay: number) => ({
    initial: reduceMotion ? (false as const) : { opacity: 0, [axis]: from },
    animate: { opacity: 1, x: 0, y: 0 },
    transition: {
      duration: reduceMotion ? 0 : 0.36,
      delay: reduceMotion ? 0 : delay,
      ease: EASE_OUT_QUART
    }
  });
  const viewTransition = reduceMotion ? { duration: 0 } : VIEW_TRANSITION;

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && !isTypingTarget(e.target)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen(true);
      }
      // 'r' toggles plot-route mode in galaxy view; safe to ignore in other
      // views since the HUD only renders inside GalaxyCanvas.
      if (
        (e.key === "r" || e.key === "R") &&
        !e.metaKey &&
        !e.ctrlKey &&
        !e.altKey &&
        !isTypingTarget(e.target)
      ) {
        e.preventDefault();
        startRoute();
      }
      if (e.key === "Escape" && routeMode !== "idle") {
        e.preventDefault();
        clearRoute();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setSearchOpen, startRoute, clearRoute, routeMode]);

  return (
    <div id="main-content" className="relative h-[100dvh] w-full bg-bg-canvas">
      <h1 className="sr-only">Holocron — Star Wars universe explorer</h1>
      {/* Desktop layout (md+): three-column grid + timeline row */}
      <div className="hidden h-full flex-col md:flex">
        <div className="grid min-h-0 flex-1 grid-cols-[64px_1fr_360px] overflow-hidden">
          <motion.div {...chrome("x", -32, 0)}>
            <NavRail />
          </motion.div>
          <motion.div className="relative overflow-hidden" {...chrome("y", 16, 0.18)}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={view}
                variants={VIEW_VARIANTS}
                initial={reduceMotion ? false : "initial"}
                animate="animate"
                exit="exit"
                transition={viewTransition}
                className="absolute inset-0"
              >
                {view === "galaxy" && (
                  <GalaxyCanvas
                    planets={planets}
                    lanes={lanes}
                    entities={entities}
                    lineage={lineage}
                  />
                )}
                {view === "timeline" && (
                  <TimelineView
                    planets={planets}
                    lanes={lanes}
                    events={events}
                    entities={entities}
                    wars={wars}
                    battles={battles}
                  />
                )}
                {view === "lineage" &&
                  (lineage ? <LineageView graph={lineage} /> : <LineagePlaceholder />)}
              </motion.div>
            </AnimatePresence>
          </motion.div>
          <motion.div {...chrome("x", 32, 0.06)}>
            <Datapad
              entities={entities}
              planetImages={planetImages}
              personImages={personImages}
            />
          </motion.div>
        </div>
        <motion.div {...chrome("y", 24, 0.12)}>
          <TimelineScrubber />
        </motion.div>
      </div>

      {/* Mobile layout (< md): stacked column */}
      <div className="flex h-full flex-col md:hidden">
        <motion.div {...chrome("y", -16, 0)}>
          <NavRail />
        </motion.div>
        <motion.div className="relative min-h-0 flex-1 overflow-hidden" {...chrome("y", 16, 0.12)}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={view}
              variants={VIEW_VARIANTS}
              initial={reduceMotion ? false : "initial"}
              animate="animate"
              exit="exit"
              transition={viewTransition}
              className="absolute inset-0"
            >
              {view === "galaxy" && (
                <GalaxyCanvas
                  planets={planets}
                  lanes={lanes}
                  entities={entities}
                  lineage={lineage}
                  mobile
                />
              )}
              {view === "timeline" && (
                <TimelineView
                  planets={planets}
                  lanes={lanes}
                  events={events}
                  entities={entities}
                  wars={wars}
                  battles={battles}
                />
              )}
              {view === "lineage" && <LineagePlaceholder />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
        <motion.div {...chrome("y", 24, 0.18)}>
          <TimelineScrubber />
        </motion.div>
        <DatapadDrawer
          entities={entities}
          planetImages={planetImages}
          personImages={personImages}
        />
      </div>

      <SearchPalette entities={entities} />
      <HyperspaceOverlay />
      <AudioCueDispatcher />
      <HoloStage entities={entities} lineage={lineage} personImages={personImages} />
      <EventInterruptDispatcher />
      <EventInterruptOverlay />
      <StoryMode />
      <TimeMachine />
    </div>
  );
}

function isTypingTarget(t: EventTarget | null): boolean {
  if (!(t instanceof HTMLElement)) return false;
  const tag = t.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || t.isContentEditable;
}
