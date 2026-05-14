"use client";

import { motion, AnimatePresence } from "motion/react";
import { useMemo, useState, useEffect, useRef } from "react";
import { GlobeHemisphereWest, Clock, TreeStructure, Play, Path, FilmStrip } from "@phosphor-icons/react";
import type { Entity } from "@/lib/schema";
import { useSelection, type ViewMode } from "@/lib/store";
import { formatYear, cn } from "@/lib/utils";
import { EntityCrawl } from "@/components/EntityCrawl";
import { loadAllQuotesFor } from "@/lib/data/loadQuotes";
import { CLIP_LINKS_MAP } from "@/lib/data/clip-links";
import type { Quote } from "@/lib/data/quotes";
import type { PlanetImage } from "@/lib/data/loadPlanetImages";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { PlanetDetail } from "@/components/planet/PlanetDetail";
import { HoloStageButton } from "@/components/holostage";
import { Aurebesh } from "@/components/Aurebesh";

type Props = {
  entities: Entity[];
  planetImages?: Map<string, PlanetImage> | null;
  personImages?: Map<string, PersonImage> | null;
};

const LORE_SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;
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

export function Datapad({ entities, planetImages = null, personImages = null }: Props) {
  const selectedId = useSelection((s) => s.entityId);
  const currentView = useSelection((s) => s.view);
  const setView = useSelection((s) => s.setView);
  const [crawlOpen, setCrawlOpen] = useState(false);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const isShipLike = (type: Entity["type"] | undefined) => type === "ship" || type === "vehicle";

  const entityMap = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  const entity = selectedId ? entityMap.get(selectedId) : null;

  useEffect(() => {
    if (!entity) setCrawlOpen(false);
  }, [entity]);

  // Reset scroll position when the entity changes — otherwise the planet
  // detail's scroll-collapse can land in a half-collapsed state on pivot.
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [entity?.id]);

  return (
    <aside
      className="flex h-full flex-col border-l border-border-faint bg-bg-panel/40 backdrop-blur-md"
      aria-label="Entity datapad"
    >
      <header className="flex items-center justify-between border-b border-border-faint px-5 py-3">
        <h2 className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">Datapad</h2>
        <div className="flex items-center gap-2">
          {entity && (
            <button
              type="button"
              onClick={() => setCrawlOpen(true)}
              aria-label="Play opening crawl for this entity"
              title="Play crawl"
              className="flex h-9 items-center gap-1.5 rounded border border-border-faint px-2.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
            >
              <Play size={11} weight="regular" />
              <span className="font-mono text-2xs uppercase tracking-[0.14em]">Crawl</span>
            </button>
          )}
          {entity && entity.type === "film" && CLIP_LINKS_MAP.get(entity.id) && (
            <a
              href={CLIP_LINKS_MAP.get(entity.id)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Watch official clip on YouTube"
              title="Watch official clip"
              className="flex h-9 items-center gap-1.5 rounded border border-border-faint px-2.5 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary"
            >
              <FilmStrip size={12} weight="regular" />
              <span className="font-mono text-2xs uppercase tracking-[0.14em]">Clip</span>
            </a>
          )}
          {entity && (
            <button
              type="button"
              onClick={() => setView("galaxy")}
              aria-label="Show ship voyage on galaxy"
              aria-hidden={!isShipLike(entity.type)}
              tabIndex={isShipLike(entity.type) ? 0 : -1}
              title="Show voyage"
              className={cn(
                "flex h-7 items-center gap-1.5 rounded border border-border-faint px-2 text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary",
                !isShipLike(entity.type) && "pointer-events-none invisible"
              )}
            >
              <Path size={11} weight="regular" />
              <span className="font-mono text-2xs uppercase tracking-[0.14em]">Voyage</span>
            </button>
          )}
          {entity && (
            <div className="flex items-center gap-1">
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
                    <Icon size={13} weight="regular" />
                  </button>
                );
              })}
            </div>
          )}
          {entity?.type === "person" && <HoloStageButton />}
          {entity && (
            <span
              className={
                entity.canonicity === "canon"
                  ? "font-mono text-2xs uppercase tracking-[0.16em] text-canon"
                  : entity.canonicity === "legends"
                  ? "font-mono text-2xs uppercase tracking-[0.16em] text-legends"
                  : "font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"
              }
            >
              {entity.canonicity}
            </span>
          )}
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {!entity ? (
            <EmptyState key="empty" />
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
              className="flex flex-col gap-5 px-6 py-6"
            >
              <div className="flex flex-col gap-1">
                <span className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
                  {entity.type}
                </span>
                <h3
                  className="text-2xl font-medium tracking-tight text-fg-strong"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  {entity.name}
                </h3>
                {entity.aliases.length > 0 && (
                  <p className="text-xs text-fg-muted">also {entity.aliases.join(" · ")}</p>
                )}
              </div>

              {entity.short && <p className="text-base text-fg-primary/85">{entity.short}</p>}

              {entity.long && <LoreSection long={entity.long} entityId={entity.id} />}

              {entity.era && (
                <div className="flex flex-col gap-1 border-t border-border-faint pt-4">
                  <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                    <Aurebesh char="E" />ra
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
                    <Aurebesh char="R" />elations
                  </span>
                  <ul className="flex flex-col divide-y divide-border-faint/60">
                    {entity.relations.slice(0, 14).map((r, i) => {
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
                  {entity.relations.length > 14 && (
                    <p className="font-mono text-2xs text-fg-dim">
                      + {entity.relations.length - 14} more
                    </p>
                  )}
                </div>
              )}

              {entity.sources.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border-faint pt-4">
                  <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                    <Aurebesh char="S" />ources
                  </span>
                  <ul className="flex flex-wrap gap-x-3 gap-y-1 font-mono text-2xs text-fg-muted">
                    {entity.sources.map((s) => (
                      <li key={s} className="truncate">
                        <a href={s} target="_blank" rel="noopener noreferrer" className="hover:text-fg-primary">
                          {new URL(s).hostname}
                        </a>
                      </li>
                    ))}
                  </ul>
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
    </aside>
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
      <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"><Aurebesh char="L" />ore</span>
      <motion.div layout transition={LORE_SPRING} className="overflow-hidden">
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

function EmptyState() {
  return (
    <motion.div
      key="empty"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="flex h-full flex-col items-start justify-center gap-3 px-6 py-12"
    >
      <span className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
        Empty datapad
      </span>
      <p className="text-base text-fg-primary/85">
        Pick a planet, person, ship, or event. The archive responds across space, time, and lineage.
      </p>
      <p className="font-mono text-2xs text-fg-dim">
        Tip: press <kbd className="border border-border-faint px-1">/</kbd> to search.
      </p>
    </motion.div>
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
