"use client";

import { motion, AnimatePresence } from "motion/react";
import { useState, useMemo, useEffect, useRef } from "react";
import { CaretUp, CaretDown, GlobeHemisphereWest, Clock, TreeStructure } from "@phosphor-icons/react";
import type { Entity } from "@/lib/schema";
import { useSelection, type ViewMode } from "@/lib/store";
import { formatYear, cn } from "@/lib/utils";
import { loadAllQuotesFor } from "@/lib/data/loadQuotes";
import type { Quote } from "@/lib/data/quotes";
import type { PlanetImage } from "@/lib/data/loadPlanetImages";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { PlanetDetail } from "@/components/planet/PlanetDetail";
import { HoloStageButton } from "@/components/holostage";
import { EntityCrawl } from "@/components/EntityCrawl";
import { Play } from "@phosphor-icons/react";

type Props = {
  entities: Entity[];
  planetImages?: Map<string, PlanetImage> | null;
  personImages?: Map<string, PersonImage> | null;
};

const SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;
const LORE_PREVIEW_LEN = 480;

const PIVOT_VIEWS: Array<{
  id: ViewMode;
  label: string;
  Icon: typeof GlobeHemisphereWest;
  personOnly?: boolean;
}> = [
  { id: "galaxy", label: "Show on galaxy", Icon: GlobeHemisphereWest },
  { id: "timeline", label: "Show on timeline", Icon: Clock },
  { id: "lineage", label: "Show on lineage", Icon: TreeStructure, personOnly: true }
];

export function DatapadDrawer({ entities, planetImages = null, personImages = null }: Props) {
  const [expanded, setExpanded] = useState(false);
  const selectedId = useSelection((s) => s.entityId);
  const currentView = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const [crawlOpen, setCrawlOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const entityMap = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  const entity = selectedId ? entityMap.get(selectedId) : null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
    setCrawlOpen(false);
  }, [entity?.id]);

  return (
    <motion.div
      className="relative z-20 border-t border-border-faint bg-bg-panel/95 backdrop-blur-md"
      animate={{ height: expanded ? "70vh" : "56px" }}
      transition={SPRING}
      style={{ overflow: "hidden" }}
    >
      {/* Drawer handle / peek row */}
      <div className="flex h-14 w-full items-center justify-between px-4">
        <button
          type="button"
          aria-expanded={expanded}
          aria-controls="datapad-drawer-content"
          aria-label={expanded ? "Collapse datapad" : "Expand datapad"}
          onClick={() => setExpanded((v) => !v)}
          className="flex min-w-0 flex-1 items-center gap-3 focus-visible:outline-1 focus-visible:outline-accent"
        >
          <div
            className="flex min-w-0 flex-1 flex-col items-start"
            aria-live="polite"
            aria-atomic="true"
          >
            {entity ? (
              <>
                <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
                  {entity.type}
                </span>
                <span className="truncate text-sm font-medium text-fg-strong">{entity.name}</span>
              </>
            ) : (
              <>
                <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
                  Datapad
                </span>
                <span className="text-sm text-fg-muted">Pick an entity to inspect</span>
              </>
            )}
          </div>
          <span className="flex-shrink-0 text-fg-dim">
            {expanded ? (
              <CaretDown size={14} weight="regular" />
            ) : (
              <CaretUp size={14} weight="regular" />
            )}
          </span>
        </button>

        {entity && (
          <div className="ml-3 flex items-center gap-1">
            {PIVOT_VIEWS.map(({ id, label, Icon, personOnly }) => {
              const disabled = personOnly && entity.type !== "person";
              const isActive = currentView === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-label={label}
                  title={label}
                  disabled={disabled}
                  onClick={() => setView(id)}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded border transition-colors",
                    isActive
                      ? "border-accent-faint bg-accent-bg/40 text-fg-strong"
                      : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary",
                    disabled && "pointer-events-none opacity-30"
                  )}
                >
                  <Icon size={16} weight="regular" />
                </button>
              );
            })}
            {entity.type === "film" && (
              <button
                type="button"
                onClick={() => setCrawlOpen(true)}
                className="flex h-9 items-center gap-2 rounded border border-border-faint bg-bg-panel/40 px-3 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
              >
                <Play size={14} weight="regular" />
                <span className="font-mono text-xs uppercase tracking-[0.08em]">Crawl</span>
              </button>
            )}
            {entity.type === "person" && <HoloStageButton />}
          </div>
        )}
      </div>

      {/* Drawer content */}
      <div
        ref={scrollRef}
        id="datapad-drawer-content"
        className="h-[calc(70vh-56px)] overflow-y-auto"
        hidden={!expanded}
        aria-hidden={!expanded}
      >
        <AnimatePresence mode="wait">
          {!entity ? (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col gap-3 px-5 py-6"
            >
              <p className="text-base text-fg-primary/85">
                Pick a planet, person, ship, or event. The archive responds across space, time, and
                lineage.
              </p>
              <p className="font-mono text-2xs text-fg-dim">
                Press <kbd className="border border-border-faint px-1">/</kbd> to search.
              </p>
            </motion.div>
          ) : entity.type === "planet" ? (
            <PlanetDetail
              key={entity.id}
              entity={entity}
              entities={entities}
              planetImages={planetImages}
              personImages={personImages}
              scrollContainer={scrollRef}
            />
          ) : (
            <motion.article
              key={entity.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col gap-5 px-5 py-5"
            >
              <div className="flex flex-col gap-1">
                {entity.short && (
                  <p className="text-base text-fg-primary/85">{entity.short}</p>
                )}
              </div>

              {entity.long && <LoreSection long={entity.long} entityId={entity.id} />}

              {entity.era && (
                <div className="flex flex-col gap-1 border-t border-border-faint pt-4">
                  <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                    Era
                  </span>
                  <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
                    {entity.era.birthYear != null && (
                      <Row label="born" value={formatYear(entity.era.birthYear)} />
                    )}
                    {entity.era.deathYear != null && (
                      <Row label="died" value={formatYear(entity.era.deathYear)} />
                    )}
                    {entity.era.firstAppearance != null && (
                      <Row
                        label="first seen"
                        value={
                          entity.type === "film"
                            ? `${entity.era.firstAppearance}`
                            : formatYear(entity.era.firstAppearance)
                        }
                      />
                    )}
                  </dl>
                </div>
              )}

              {entity.relations.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border-faint pt-4">
                  <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                    Relations
                  </span>
                  <ul className="flex flex-col divide-y divide-border-faint/60">
                    {entity.relations.slice(0, 8).map((r, i) => {
                      const target = entityMap.get(r.target);
                      return (
                        <RelationRow
                          key={`${r.kind}-${r.target}-${i}`}
                          kind={r.kind}
                          targetId={r.target}
                          targetName={target?.name ?? r.target}
                          targetType={target?.type}
                        />
                      );
                    })}
                  </ul>
                  {entity.relations.length > 8 && (
                    <p className="font-mono text-2xs text-fg-dim">
                      + {entity.relations.length - 8} more
                    </p>
                  )}
                </div>
              )}

              <QuotesSection entityId={entity.id} />
            </motion.article>
          )}
        </AnimatePresence>
      </div>
      <EntityCrawl
        entity={entity ?? null}
        entities={entities}
        open={crawlOpen}
        onClose={() => setCrawlOpen(false)}
      />
    </motion.div>
  );
}

function LoreSection({ long, entityId }: { long: string; entityId: string }) {
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    setExpanded(false);
  }, [entityId]);

  const needsTruncation = long.length > LORE_PREVIEW_LEN;
  const displayText = expanded || !needsTruncation ? long : long.slice(0, LORE_PREVIEW_LEN).trimEnd() + "…";

  return (
    <div className="flex flex-col gap-1 border-t border-border-faint pt-4">
      <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">Lore</span>
      <motion.div layout transition={SPRING} className="overflow-hidden">
        <p className="max-w-[65ch] text-base leading-relaxed text-fg-primary/85">{displayText}</p>
        {needsTruncation && (
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-fg-primary"
          >
            {expanded ? "Read less" : "Read more"}
          </button>
        )}
      </motion.div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-fg-dim">{label}</dt>
      <dd className="text-right text-fg-primary">{value}</dd>
    </>
  );
}

function RelationRow({
  kind,
  targetId,
  targetName,
  targetType
}: {
  kind: string;
  targetId: string;
  targetName: string;
  targetType?: string;
}) {
  const select = useSelection((s) => s.select);
  return (
    <li className="flex items-center justify-between gap-3 py-2">
      <span className="font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
        {kind.replace(/_/g, " ")}
      </span>
      <button
        type="button"
        onClick={() => select(targetId, (targetType ?? "person") as never)}
        className="truncate text-left text-sm text-fg-primary transition-colors hover:text-accent"
      >
        {targetName}
      </button>
    </li>
  );
}

const QUOTES_SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;
const QUOTES_INITIAL_LIMIT = 5;

function QuotesSection({ entityId }: { entityId: string }) {
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    setShowAll(false);
  }, [entityId]);

  const allQuotes = useMemo(() => loadAllQuotesFor(entityId), [entityId]);

  if (allQuotes.length === 0) return null;

  const visibleQuotes = showAll ? allQuotes : allQuotes.slice(0, QUOTES_INITIAL_LIMIT);

  return (
    <div className="flex flex-col gap-3 border-t border-border-faint pt-4">
      <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Memorable Quotes
      </span>
      <motion.ul layout transition={QUOTES_SPRING} className="flex flex-col gap-4">
        <AnimatePresence initial={false}>
          {visibleQuotes.map((quote) => (
            <QuoteItem key={quote.id} quote={quote} />
          ))}
        </AnimatePresence>
      </motion.ul>
      {allQuotes.length > QUOTES_INITIAL_LIMIT && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="self-start font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim transition-colors hover:text-fg-primary"
        >
          {showAll ? "Show less" : `Show all (${allQuotes.length})`}
        </button>
      )}
    </div>
  );
}

function QuoteItem({ quote }: { quote: Quote }) {
  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col gap-1"
    >
      <blockquote className="m-0 p-0">
        <p className="max-w-[60ch] text-base italic leading-relaxed text-fg-primary/90">
          <span className="not-italic text-fg-dim" aria-hidden="true">&ldquo;</span>
          {quote.text}
          <span className="not-italic text-fg-dim" aria-hidden="true">&rdquo;</span>
        </p>
        <footer className="mt-1 font-mono text-2xs uppercase tracking-[0.14em] text-fg-dim">
          &mdash; {quote.filmName} &middot; {formatYear(quote.year)}
        </footer>
      </blockquote>
    </motion.li>
  );
}
