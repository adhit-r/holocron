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
            <CaretLeft size={18} weight="regular" />
          </Link>

          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-md border border-border-faint bg-bg-panel/40 p-2.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
            aria-label="Open search"
            title="Search · /"
          >
            <MagnifyingGlass size={18} weight="regular" />
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
                  "rounded-md p-2.5 transition-colors",
                  view === id
                    ? "bg-accent-bg/60 text-fg-strong"
                    : "text-fg-muted hover:bg-bg-panel/40 hover:text-fg-primary"
                )}
              >
                <Icon size={18} weight="regular" />
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
            <Path size={18} weight="regular" />
          </button>

          <button
            type="button"
            onClick={() => {
              if (view !== "galaxy") setView("galaxy");
              playStory("rise-of-vader");
            }}
            className={cn(
              "rounded-md border p-2.5 transition-colors",
              storyActive
                ? "border-accent/60 bg-accent-bg/50 text-fg-strong"
                : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
            )}
            aria-pressed={storyActive}
            aria-label="Play story: Rise of Vader"
            title="Play story · Rise of Vader"
          >
            <Play size={16} weight="regular" />
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
        className="flex h-14 w-full items-center justify-between border-b border-border-faint bg-bg-canvas/80 px-3 backdrop-blur-md md:hidden"
        aria-label="Holocron navigation"
      >
        <div className="flex items-center gap-0.5 min-w-0 flex-1">
          <Link
            href="/"
            className="flex-shrink-0 rounded-md p-2.5 text-fg-muted transition-colors hover:text-fg-primary"
            aria-label="Back to landing"
          >
            <CaretLeft size={20} weight="regular" />
          </Link>
          
          <div
            className="flex items-center gap-0.5"
            role="tablist"
            aria-label="View"
          >
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
                  "flex flex-shrink-0 items-center justify-center rounded-md p-2.5 transition-colors",
                  view === id
                    ? "bg-accent-bg/60 text-fg-strong"
                    : "text-fg-muted hover:bg-bg-panel/40 hover:text-fg-primary"
                )}
              >
                <Icon size={20} weight="regular" />
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-shrink-0 items-center gap-0.5">
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="rounded-md p-2.5 text-fg-muted transition-colors hover:text-fg-primary"
            aria-label="Open search"
          >
            <MagnifyingGlass size={20} weight="regular" />
          </button>
          
          {/* Mobile More Menu Placeholder - for now just keep them but more compact */}
          <div className="flex items-center gap-0.5">
            <button
              type="button"
              onClick={() => {
                if (view !== "galaxy") setView("galaxy");
                startRoute();
              }}
              className={cn(
                "rounded-md p-2.5 transition-colors",
                routeActive
                  ? "bg-accent-bg/50 text-fg-strong"
                  : "text-fg-muted hover:text-fg-primary"
              )}
              aria-pressed={routeActive}
              aria-label="Plot a hyperspace route"
            >
              <Path size={20} weight="regular" />
            </button>
            <AtlasToggle size="mini" />
            <AudioToggle size="mini" />
          </div>
        </div>
      </nav>
    </>
  );
}
