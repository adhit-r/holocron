"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Crosshair, Shield, Question, ArrowSquareOut } from "@phosphor-icons/react";
import type { Battle, Entity } from "@/lib/schema";
import { useSelection } from "@/lib/store";
import { formatYear, cn } from "@/lib/utils";
import { resolveShip } from "@/lib/data/resolveShip";

type Props = {
  battle: Battle;
  entities: Entity[];
};

export function BattleDetail({ battle, entities }: Props) {
  return (
    <article className="flex flex-col gap-6 px-6 py-6" aria-label={`Battle detail: ${battle.name}`}>
      {/* Entity header / title card */}
      <header className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <span className="rounded border border-accent/40 bg-accent-bg/40 px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.16em] text-accent">
            Battle &middot; {battle.canonicity}
          </span>
          <span className="font-mono text-2xs text-fg-dim">
            {formatYear(battle.year)}
          </span>
        </div>
        <h1 className="font-mono text-2xl font-bold tracking-tight text-fg-strong">
          {battle.name}
        </h1>
        {battle.outcome && (
          <div className="flex items-center gap-2 font-mono text-2xs uppercase tracking-wider text-fg-muted">
            <Shield size={13} className="text-accent" />
            <span>Outcome: {battle.outcome}</span>
            {battle.winningSide && (
              <span className="text-fg-strong">({battle.winningSide})</span>
            )}
          </div>
        )}
      </header>

      {/* Belligerents */}
      {battle.belligerents.length > 0 && (
        <div className="flex flex-col gap-1.5 border-t border-border-faint pt-4">
          <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
            Belligerents
          </span>
          <div className="flex flex-col gap-1 text-sm text-fg-primary/90">
            {battle.belligerents.map((b, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-border-line" />
                <span>{b.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Ships Involved - Interactive Chips Row */}
      {battle.shipsInvolved && battle.shipsInvolved.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border-faint pt-4">
          <div className="flex items-center justify-between">
            <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
              Ships Involved ({battle.shipsInvolved.length})
            </span>
            <span className="font-mono text-[10px] text-fg-dim">
              Click to cross-pivot
            </span>
          </div>

          {/* Horizontally scrollable row on mobile */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 pt-1 no-scrollbar -mx-1 px-1">
            {battle.shipsInvolved.map((shipName) => (
              <ShipChip
                key={shipName}
                shipName={shipName}
                entities={entities}
              />
            ))}
          </div>
        </div>
      )}

      {/* Summary / Lore */}
      <div className="flex flex-col gap-1.5 border-t border-border-faint pt-4">
        <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
          Tactical Summary
        </span>
        <p className="text-sm leading-relaxed text-fg-primary/85">
          {battle.summary}
        </p>
      </div>

      {/* Sources */}
      {battle.sources.length > 0 && (
        <div className="flex flex-col gap-2 border-t border-border-faint pt-4">
          <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
            Archive Sources
          </span>
          <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs text-fg-muted">
            {battle.sources.map((s) => (
              <li key={s} className="truncate">
                <a
                  href={s}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 hover:text-fg-primary hover:underline"
                >
                  <span>{new URL(s).hostname.replace("www.", "")}</span>
                  <ArrowSquareOut size={10} />
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </article>
  );
}

/**
 * Individual ship chip with hover tooltip for unmatched ships and cross-pivot for matched ships.
 */
export function ShipChip({
  shipName,
  entities
}: {
  shipName: string;
  entities: Entity[];
}) {
  const select = useSelection((s) => s.select);
  const matchedEntity = resolveShip(shipName, entities);
  const [showTooltip, setShowTooltip] = useState(false);

  // Shorten display name if it has long parens description (e.g. "Death Star (DS-1 Orbital Battle Station)" -> "Death Star")
  const displayName = matchedEntity ? matchedEntity.name : (shipName.includes(" (") ? shipName.split(" (")[0] : shipName);

  if (matchedEntity) {
    return (
      <button
        type="button"
        onClick={() => select(matchedEntity.id, matchedEntity.type)}
        className={cn(
          "group relative flex shrink-0 items-center gap-1.5 rounded-full border border-border-faint bg-bg-panel/60 px-3 py-1 font-mono text-2xs tracking-wide text-fg-primary transition-all",
          "hover:border-accent/70 hover:bg-accent-bg/40 hover:text-accent hover:shadow-[0_0_10px_rgba(235,160,50,0.15)]"
        )}
        title={`Cross-pivot to ${matchedEntity.name} (${matchedEntity.type})`}
      >
        <Crosshair size={11} className="text-accent/80 group-hover:text-accent" />
        <span className="whitespace-nowrap font-medium">{displayName}</span>
      </button>
    );
  }

  return (
    <div
      className="relative shrink-0"
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      onClick={() => setShowTooltip((v) => !v)}
    >
      <div
        className="flex items-center gap-1.5 rounded-full border border-border-faint/60 bg-bg-panel/20 px-3 py-1 font-mono text-2xs text-fg-dim transition-colors cursor-help hover:border-border-line hover:text-fg-muted"
        aria-label={`${displayName} — Ship not in archive yet`}
      >
        <Question size={11} className="text-fg-dim" />
        <span className="whitespace-nowrap">{displayName}</span>
      </div>

      <AnimatePresence>
        {showTooltip && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 2, scale: 0.95 }}
            transition={{ duration: 0.14 }}
            className="absolute bottom-full left-1/2 z-30 mb-1.5 -translate-x-1/2 whitespace-nowrap rounded border border-border-line bg-bg-overlay/95 px-2 py-1 font-mono text-[10px] text-fg-primary shadow-lg backdrop-blur-md"
            role="tooltip"
          >
            Ship not in archive yet
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
