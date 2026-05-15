"use client";

import { create } from "zustand";
import type { EntityType } from "./schema";

export type ViewMode = "galaxy" | "timeline" | "lineage";

export type RouteMode = "idle" | "picking-origin" | "picking-destination" | "shown";
export type GameDifficulty = "easy" | "medium" | "legends";

export type GameState = {
  active: boolean;
  difficulty: GameDifficulty;
  currentRound: number;
  score: number;
  targetId: string | null;
  feedback: {
    active: boolean;
    lastGuessId: string | null;
    isCorrect: boolean;
  };
};

export type RouteState = {
  mode: RouteMode;
  originId: string | null;
  destinationId: string | null;
};

export type StoryState = {
  /** Active story id (e.g. "rise-of-vader"), or null when no story is playing. */
  playingStoryId: string | null;
  /** Zero-based beat index. -1 = intro card. beats.length = outro card. */
  beatIndex: number;
  paused: boolean;
};

export type CinematicState = {
  /** Active interrupt id, or null. The dispatcher sets this; the overlay clears it after duration. */
  activeId: string | null;
  /** Set of cinematic ids that have already fired this session/story run. */
  fired: ReadonlySet<string>;
};

export type SelectionState = {
  entityId: string | null;
  entityType: EntityType | null;
  era: number;
  view: ViewMode;
  showLegends: boolean;
  atlasMode: boolean;
  searchOpen: boolean;
  pivoting: boolean;
  holoStage: boolean;
  route: RouteState;
  story: StoryState;
  cinematic: CinematicState;
  game: GameState;
};

type SelectionActions = {
  select: (id: string, type: EntityType) => void;
  clearSelection: () => void;
  setEra: (year: number) => void;
  setView: (view: ViewMode) => void;
  toggleLegends: () => void;
  toggleAtlas: () => void;
  setSearchOpen: (open: boolean) => void;
  setPivoting: (pivoting: boolean) => void;
  setHoloStage: (open: boolean) => void;
  startRoute: () => void;
  pickEndpoint: (planetId: string) => void;
  clearRoute: () => void;
  reverseRoute: () => void;
  // Story Mode
  playStory: (id: string, initialBeat?: number) => void;
  pauseStory: () => void;
  resumeStory: () => void;
  setStoryBeat: (i: number) => void;
  endStory: () => void;
  // Cinematic interrupts
  fireCinematic: (id: string) => void;
  clearCinematic: () => void;
  resetCinematicFired: () => void;
  // Memory Palace Game
  startGame: (difficulty: GameDifficulty, targetId: string) => void;
  submitGuess: (planetId: string, isCorrect: boolean) => void;
  nextRound: (targetId: string) => void;
  stopGame: () => void;
  clearFeedback: () => void;
};

const INITIAL_ROUTE: RouteState = {
  mode: "idle",
  originId: null,
  destinationId: null
};

const INITIAL_STORY: StoryState = {
  playingStoryId: null,
  beatIndex: -1,
  paused: false
};

const INITIAL_CINEMATIC: CinematicState = {
  activeId: null,
  fired: new Set<string>()
};

const INITIAL_GAME: GameState = {
  active: false,
  difficulty: "easy",
  currentRound: 0,
  score: 0,
  targetId: null,
  feedback: {
    active: false,
    lastGuessId: null,
    isCorrect: false
  }
};

const INITIAL: SelectionState = {
  entityId: null,
  entityType: null,
  era: 0,
  view: "galaxy",
  showLegends: false,
  atlasMode: false,
  searchOpen: false,
  pivoting: false,
  holoStage: false,
  route: INITIAL_ROUTE,
  story: INITIAL_STORY,
  cinematic: INITIAL_CINEMATIC,
  game: INITIAL_GAME
};

export const useSelection = create<SelectionState & SelectionActions>((set) => ({
  ...INITIAL,
  select: (id, type) => set({ entityId: id, entityType: type, pivoting: true }),
  clearSelection: () => set({ entityId: null, entityType: null, pivoting: false }),
  setEra: (year) => set({ era: year }),
  setView: (view) => set({ view, pivoting: true }),
  toggleLegends: () => set((s) => ({ showLegends: !s.showLegends })),
  toggleAtlas: () => set((s) => ({ atlasMode: !s.atlasMode })),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setPivoting: (pivoting) => set({ pivoting }),
  setHoloStage: (open) => set({ holoStage: open }),
  startRoute: () =>
    set({
      route: { mode: "picking-origin", originId: null, destinationId: null }
    }),
  pickEndpoint: (planetId) =>
    set((s) => {
      const { mode, originId } = s.route;
      if (mode === "picking-origin") {
        return {
          route: { mode: "picking-destination", originId: planetId, destinationId: null }
        };
      }
      if (mode === "picking-destination") {
        if (planetId === originId) return s; // ignore self-pick
        return {
          route: { mode: "shown", originId, destinationId: planetId }
        };
      }
      return s;
    }),
  clearRoute: () => set({ route: { ...INITIAL_ROUTE } }),
  reverseRoute: () =>
    set((s) => {
      const { mode, originId, destinationId } = s.route;
      if (mode !== "shown" || !originId || !destinationId) return s;
      return {
        route: { mode: "shown", originId: destinationId, destinationId: originId }
      };
    }),

  // Story Mode ──────────────────────────────────────────────────────────────
  playStory: (id, initialBeat = -1) =>
    set({
      story: { playingStoryId: id, beatIndex: initialBeat, paused: false },
      cinematic: { activeId: null, fired: new Set<string>() }
    }),
  pauseStory: () =>
    set((s) => ({ story: { ...s.story, paused: true } })),
  resumeStory: () =>
    set((s) => ({ story: { ...s.story, paused: false } })),
  setStoryBeat: (i) =>
    set((s) => ({ story: { ...s.story, beatIndex: i } })),
  endStory: () =>
    set({
      story: { playingStoryId: null, beatIndex: -1, paused: false },
      cinematic: { activeId: null, fired: new Set<string>() }
    }),

  // Cinematic interrupts ────────────────────────────────────────────────────
  fireCinematic: (id) =>
    set((s) => {
      if (s.cinematic.fired.has(id)) return s;
      const next = new Set(s.cinematic.fired);
      next.add(id);
      return { cinematic: { activeId: id, fired: next } };
    }),
  clearCinematic: () =>
    set((s) => ({ cinematic: { ...s.cinematic, activeId: null } })),
  resetCinematicFired: () =>
    set({ cinematic: { activeId: null, fired: new Set<string>() } }),

  // Memory Palace Game ──────────────────────────────────────────────────────
  startGame: (difficulty, targetId) =>
    set({
      game: {
        ...INITIAL_GAME,
        active: true,
        difficulty,
        targetId,
        currentRound: 1
      },
      view: "galaxy"
    }),
  submitGuess: (planetId, isCorrect) =>
    set((s) => ({
      game: {
        ...s.game,
        score: isCorrect ? s.game.score + 1 : s.game.score,
        feedback: {
          active: true,
          lastGuessId: planetId,
          isCorrect
        }
      }
    })),
  nextRound: (targetId) =>
    set((s) => ({
      game: {
        ...s.game,
        targetId,
        currentRound: s.game.currentRound + 1,
        feedback: {
          active: false,
          lastGuessId: null,
          isCorrect: false
        }
      }
    })),
  stopGame: () => set({ game: INITIAL_GAME }),
  clearFeedback: () =>
    set((s) => ({
      game: {
        ...s.game,
        feedback: { ...s.game.feedback, active: false }
      }
    }))
}));
