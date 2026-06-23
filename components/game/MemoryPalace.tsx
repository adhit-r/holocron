"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Brain, Trophy, X, Play, SkipForward } from "@phosphor-icons/react";
import { useSelection, type GameDifficulty } from "@/lib/store";
import { MEMORY_HINTS, type MemoryHint } from "@/lib/data/memory-hints";
import { cn } from "@/lib/utils";

/**
 * <MemoryPalace /> — Game orchestrator for the "Memory Palace" geography game.
 *
 * This component handles:
 * 1. Difficulty selection and game initialization.
 * 2. Round progression and randomized hint selection.
 * 3. High score persistence to localStorage.
 * 4. UI overlays for game state (start screen, HUD, feedback).
 *
 * Local Storage:
 * - 'holocron:memory_palace_highscore' stores the best score.
 */
export function MemoryPalace() {
  const game = useSelection((s) => s.game);
  const startGame = useSelection((s) => s.startGame);
  const nextRound = useSelection((s) => s.nextRound);
  const stopGame = useSelection((s) => s.stopGame);
  const clearFeedback = useSelection((s) => s.clearFeedback);

  const [highScore, setHighScore] = useState(0);
  const [showStartScreen, setShowStartScreen] = useState(false);

  // Sync high score on mount
  useEffect(() => {
    const saved = localStorage.getItem("holocron:memory_palace_highscore");
    if (saved) setHighScore(parseInt(saved, 10));

    const handleOpen = () => setShowStartScreen(true);
    window.addEventListener("holocron:open-game", handleOpen);
    return () => window.removeEventListener("holocron:open-game", handleOpen);
  }, []);

  // Update high score when score changes
  useEffect(() => {
    if (game.score > highScore) {
      setHighScore(game.score);
      localStorage.setItem("holocron:memory_palace_highscore", game.score.toString());
    }
  }, [game.score, highScore]);

  const selectNewTarget = useCallback((difficulty: GameDifficulty, usedIds: Set<string> = new Set()) => {
    const pool = MEMORY_HINTS.filter((h) => h.difficulty === difficulty && !usedIds.has(h.id));
    if (pool.length === 0) {
      // Pool exhausted, reset used tracking or just pick any from difficulty
      const anyPool = MEMORY_HINTS.filter((h) => h.difficulty === difficulty);
      return anyPool[Math.floor(Math.random() * anyPool.length)];
    }
    return pool[Math.floor(Math.random() * pool.length)];
  }, []);

  const handleStart = (difficulty: GameDifficulty) => {
    const hint = selectNewTarget(difficulty);
    if (hint) {
      startGame(difficulty, hint.targetId);
      setShowStartScreen(false);
    }
  };

  const handleNext = () => {
    const hint = selectNewTarget(game.difficulty);
    if (hint) nextRound(hint.targetId);
  };

  const currentHint = useMemo(() => {
    if (!game.active || !game.targetId) return null;
    return MEMORY_HINTS.find((h) => h.targetId === game.targetId && h.difficulty === game.difficulty) || null;
  }, [game.active, game.targetId, game.difficulty]);

  return (
    <>
      {/* Start Screen / Difficulty Picker */}
      <AnimatePresence>
        {showStartScreen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-bg-deep/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-md rounded-xl border border-border-faint bg-bg-panel p-8 shadow-2xl"
            >
              <button
                onClick={() => setShowStartScreen(false)}
                className="absolute right-4 top-4 text-fg-dim hover:text-fg-primary"
              >
                <X size={20} />
              </button>

              <div className="mb-6 flex flex-col items-center text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-bg/40 text-accent">
                  <Brain size={32} weight="duotone" />
                </div>
                <h2 className="mb-2 font-sans text-2xl font-bold tracking-tight text-fg-strong">
                  Memory Palace
                </h2>
                <p className="text-sm text-fg-muted">
                  Test your galactic geography. Find the planets based on lore hints.
                </p>
              </div>

              <div className="space-y-3">
                {(["easy", "medium", "legends"] as GameDifficulty[]).map((d) => (
                  <button
                    key={d}
                    onClick={() => handleStart(d)}
                    className="flex w-full items-center justify-between rounded-lg border border-border-faint bg-bg-canvas/50 px-5 py-4 transition-all hover:border-accent/40 hover:bg-accent-bg/10 group"
                  >
                    <div className="text-left">
                      <span className="block font-mono text-xs uppercase tracking-widest text-fg-dim">
                        {d}
                      </span>
                      <span className="text-sm font-medium text-fg-primary group-hover:text-accent">
                        {d === "easy" && "Core World Knowledge"}
                        {d === "medium" && "Expanded Lore"}
                        {d === "legends" && "Grand Admiral Level"}
                      </span>
                    </div>
                    <Play size={16} weight="fill" className="text-fg-dim group-hover:text-accent" />
                  </button>
                ))}
              </div>

              {highScore > 0 && (
                <div className="mt-8 flex items-center justify-center gap-2 border-t border-border-faint pt-6 font-mono text-xs uppercase tracking-widest text-fg-dim">
                  <Trophy size={14} className="text-accent" />
                  High Score: <span className="text-fg-primary">{highScore}</span>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Active Game HUD */}
      <AnimatePresence>
        {game.active && (
          <GameOverlay 
            game={game} 
            hint={currentHint} 
            onNext={handleNext} 
            onQuit={stopGame}
            clearFeedback={clearFeedback}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function GameOverlay({ 
  game, 
  hint, 
  onNext, 
  onQuit,
  clearFeedback
}: { 
  game: any; 
  hint: MemoryHint | null; 
  onNext: () => void; 
  onQuit: () => void;
  clearFeedback: () => void;
}) {
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center p-8">
      {/* Feedback Banner */}
      <AnimatePresence>
        {game.feedback.active && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn(
              "pointer-events-auto mb-6 flex items-center gap-4 rounded-full px-8 py-4 shadow-xl backdrop-blur-md border",
              game.feedback.isCorrect 
                ? "border-accent/40 bg-accent-bg/80 text-fg-strong" 
                : "border-error/40 bg-error-bg/80 text-fg-strong"
            )}
          >
            <span className="font-sans font-bold">
              {game.feedback.isCorrect ? "MISSION SUCCESS" : "MISSION FAILED"}
            </span>
            <div className="h-4 w-px bg-fg-strong/20" />
            <button
              onClick={onNext}
              className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest hover:underline"
            >
              Next Round <SkipForward size={14} weight="fill" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Game HUD */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="pointer-events-auto flex w-full max-w-2xl flex-col gap-4"
      >
        <div className="flex items-center justify-between rounded-t-xl border-x border-t border-border-faint bg-bg-panel/90 px-6 py-3 backdrop-blur-md">
          <div className="flex items-center gap-6">
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-widest text-fg-dim">Round</span>
              <span className="font-sans font-bold text-fg-primary">{game.currentRound}</span>
            </div>
            <div className="flex flex-col">
              <span className="font-mono text-[10px] uppercase tracking-widest text-fg-dim">Score</span>
              <span className="font-sans font-bold text-accent">{game.score}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="rounded border border-accent/30 bg-accent-bg/20 px-2 py-0.5 font-mono text-[10px] uppercase tracking-widest text-accent">
              {game.difficulty}
            </span>
            <button
              onClick={onQuit}
              className="flex h-8 w-8 items-center justify-center rounded border border-border-faint text-fg-dim hover:border-error/40 hover:text-error transition-colors"
              title="Quit Game"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="rounded-b-xl border border-border-faint bg-bg-panel/95 p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-widest text-fg-dim">Target Hint</span>
            <p className="font-sans text-lg font-medium leading-relaxed text-fg-primary">
              {hint?.hint ?? "Target lost. Initializing new round..."}
            </p>
          </div>
          
          {!game.feedback.active && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-6 flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-accent animate-pulse"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-accent" />
              Identify target on the galaxy map
            </motion.div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
