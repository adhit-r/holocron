"use client";

import { motion, useReducedMotion } from "motion/react";
import {
  GlobeHemisphereWest,
  Clock,
  TreeStructure,
  MagnifyingGlass,
  CaretLeft,
  Path,
  Play
} from "@phosphor-icons/react";
import Link from "next/link";
import { useSelection, type ViewMode } from "@/lib/store";
import { cn } from "@/lib/utils";
import { AtlasToggle } from "./AtlasToggle";
import { AudioToggle } from "./AudioToggle";
import { AnimatePresence } from "motion/react";
import { STORIES } from "@/lib/data/stories";

const STORY_ABBRS: Record<string, string> = {
  "rise-of-vader": "RoV",
  "order-of-the-sith": "OoS",
  "skywalker-family": "SkF",
  "clone-wars": "CW"
};

const TAB_SPRING = { type: "spring", stiffness: 380, damping: 32, mass: 0.8 } as const;

const VIEWS: Array<{ id: ViewMode; label: string; Icon: typeof GlobeHemisphereWest }> = [
  { id: "galaxy", label: "Galaxy", Icon: GlobeHemisphereWest },
  { id: "timeline", label: "Timeline", Icon: Clock },
  { id: "lineage", label: "Lineage", Icon: TreeStructure }
];

export function NavRail() {
  const view = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const setSearchOpen = useSelection((s) => s.setSearchOpen);
  const showLegends = useSelection((s) => s.showLegends);
  const toggleLegends = useSelection((s) => s.toggleLegends);
  const startRoute = useSelection((s) => s.startRoute);
  const routeMode = useSelection((s) => s.route.mode);
  const routeActive = routeMode !== "idle";
  const playStory = useSelection((s) => s.playStory);
  const playingStoryId = useSelection((s) => s.story.playingStoryId);
  const storyActive = playingStoryId !== null;
  const storyAbbr = playingStoryId ? STORY_ABBRS[playingStoryId] ?? STORIES.find(s => s.id === playingStoryId)?.title.split(' ').map(w => w[0]).join('').substring(0, 3).toUpperCase() : null;
  const reduceMotion = useReducedMotion();
  const tabTransition = reduceMotion ? { duration: 0 } : TAB_SPRING;

  return (
    <>
      {/* Desktop: vertical rail */}
      <aside
        className="hidden h-full flex-col items-center justify-between border-r border-border-faint bg-bg-canvas/80 py-4 backdrop-blur-md md:flex"
        aria-label="Holocron navigation rail"
      >
        <div className="flex flex-col items-center gap-5">
          <Link
            href="/"
            className="rounded-md p-2.5 text-fg-muted transition-colors hover:text-fg-primary"
            aria-label="Back to landing"
          >
            <CaretLeft size={16} weight="regular" />
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-md border border-border-faint bg-bg-panel/40 p-2.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
            aria-label="Open search"
            title="Search · /"
          >
            <MagnifyingGlass size={16} weight="regular" />
          </button>

          <div role="separator" className="h-px w-6 bg-border-faint" />

          <div className="flex flex-col items-center gap-2" role="tablist" aria-label="View">
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                aria-label={label}
                title={label}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "relative rounded-md p-2.5 transition-colors",
                  view === id ? "text-fg-strong" : "text-fg-muted hover:text-fg-primary"
                )}
              >
                {view === id && (
                  <motion.span
                    layoutId="nav-tab-indicator-desktop"
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-accent-bg/60"
                    transition={tabTransition}
                  />
                )}
                <Icon size={16} weight="regular" className="relative" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (view !== "galaxy") setView("galaxy");
              startRoute();
            }}
            className={cn(
              "rounded-md border p-2.5 transition-colors",
              routeActive
                ? "border-accent/60 bg-accent-bg/50 text-fg-strong"
                : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={routeActive}
            aria-label="Plot a hyperspace route"
            title="Plot a hyperspace route · R"
          >
            <Path size={16} weight="regular" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (view !== "galaxy") setView("galaxy");
              playStory("rise-of-vader");
            }}
            className={cn(
              "relative rounded-md border p-2.5 transition-colors",
              storyActive
                ? "border-accent/60 bg-accent-bg/50 text-fg-strong"
                : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={storyActive}
            aria-label="Play story: Rise of Vader"
            title="Play story · Rise of Vader"
          >
            <Play size={16} weight="regular" />
            <AnimatePresence>
              {storyAbbr && (
                <motion.span
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  className="absolute -bottom-1 -right-1 flex h-4 min-w-[1.2rem] items-center justify-center rounded-sm bg-accent px-0.5 font-mono text-[8px] font-bold uppercase leading-none text-accent-fg shadow-sm"
                  aria-live="polite"
                >
                  {storyAbbr}
                </motion.span>
              )}
            </AnimatePresence>
          </button>

          <button
            type="button"
            onClick={toggleLegends}
            className={cn(
              "flex h-10 w-10 flex-col items-center justify-center rounded-md border text-2xs font-mono uppercase tracking-[0.06em] transition-colors",
              showLegends
                ? "border-legends/50 bg-legends/10 text-legends"
                : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={showLegends}
            title={showLegends ? "Legends layer on" : "Legends layer off"}
            aria-label={showLegends ? "Legends layer on" : "Legends layer off"}
          >
            <span>L</span>
            <span className="text-[8px] tracking-[0.18em]">{showLegends ? "on" : "off"}</span>
          </button>

          <AtlasToggle size="rail" />
          <AudioToggle size="rail" />
        </div>
      </aside>

      {/* Mobile: horizontal mini-bar */}
      <nav
        className="flex h-12 w-full items-center justify-between border-b border-border-faint bg-bg-canvas/80 px-3 backdrop-blur-md md:hidden"
        aria-label="Holocron navigation"
      >
        <div className="flex items-center gap-1">
          <Link
            href="/"
            className="rounded-md p-2.5 text-fg-muted transition-colors hover:text-fg-primary"
            aria-label="Back to landing"
          >
            <CaretLeft size={16} weight="regular" />
          </Link>

          <div
            className="flex items-center gap-1 overflow-x-auto"
            role="tablist"
            aria-label="View"
            style={{ scrollbarWidth: "none" }}
          >
            {VIEWS.map(({ id, label, Icon }) => (
              <button
                key={id}
                role="tab"
                aria-selected={view === id}
                aria-label={label}
                type="button"
                onClick={() => setView(id)}
                className={cn(
                  "relative flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 transition-colors",
                  view === id ? "text-fg-strong" : "text-fg-muted hover:text-fg-primary"
                )}
              >
                {view === id && (
                  <motion.span
                    layoutId="nav-tab-indicator-mobile"
                    aria-hidden
                    className="absolute inset-0 rounded-md bg-accent-bg/60"
                    transition={tabTransition}
                  />
                )}
                <Icon size={14} weight="regular" className="relative" />
                <span className="relative font-mono text-2xs uppercase tracking-[0.12em]">{label}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-md border border-border-faint bg-bg-panel/40 p-2.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
            aria-label="Open search"
          >
            <MagnifyingGlass size={14} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (view !== "galaxy") setView("galaxy");
              startRoute();
            }}
            className={cn(
              "rounded-md border p-2.5 transition-colors",
              routeActive
                ? "border-accent/60 bg-accent-bg/50 text-fg-strong"
                : "border-border-faint bg-bg-panel/40 text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={routeActive}
            aria-label="Plot a hyperspace route"
          >
            <Path size={14} weight="regular" />
          </button>
          <button
            type="button"
            onClick={() => {
              if (view !== "galaxy") setView("galaxy");
              playStory("rise-of-vader");
            }}
            className={cn(
              "relative rounded-md border p-2.5 transition-colors",
              storyActive
                ? "border-accent/60 bg-accent-bg/50 text-fg-strong"
                : "border-border-faint bg-bg-panel/40 text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={storyActive}
            aria-label="Play story: Rise of Vader"
          >
            <Play size={14} weight="regular" />
            <AnimatePresence>
              {storyAbbr && (
                <motion.span
                  initial={reduceMotion ? { opacity: 1 } : { opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.8 }}
                  className="absolute -bottom-1 -right-1 flex h-4 min-w-[1.2rem] items-center justify-center rounded-sm bg-accent px-0.5 font-mono text-[8px] font-bold uppercase leading-none text-accent-fg shadow-sm"
                  aria-live="polite"
                >
                  {storyAbbr}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
          <button
            type="button"
            onClick={toggleLegends}
            className={cn(
              "rounded-md border px-2 py-1.5 font-mono text-2xs uppercase tracking-[0.08em] transition-colors",
              showLegends
                ? "border-legends/50 bg-legends/10 text-legends"
                : "border-border-faint text-fg-muted"
            )}
            aria-pressed={showLegends}
            aria-label={showLegends ? "Legends layer on" : "Legends layer off"}
          >
            {showLegends ? "+ Legends" : "Legends"}
          </button>
          <AtlasToggle size="mini" />
          <AudioToggle size="mini" />
        </div>
      </nav>
    </>
  );
}
