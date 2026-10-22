"use client";

import { motion, AnimatePresence } from "motion/react";
import { useEffect, useRef, useState, useCallback } from "react";
import { MagnifyingGlass, Command } from "@phosphor-icons/react";
import type { Entity } from "@/lib/schema";
import { useSelection } from "@/lib/store";
import {
  runHybridSearch,
  loadSemanticIndex,
  type SearchHit,
  type SearchSource
} from "@/lib/search";
import { cn } from "@/lib/utils";

type Props = { entities: Entity[] };

type IndexStatus = "idle" | "loading" | "ready" | "error";

// Module-scope cache: last 10 query → results entries.
const queryCache = new Map<string, SearchHit[]>();
const QUERY_CACHE_LIMIT = 10;

function cacheGet(key: string): SearchHit[] | undefined {
  return queryCache.get(key);
}
function cacheSet(key: string, hits: SearchHit[]): void {
  if (queryCache.has(key)) queryCache.delete(key);
  queryCache.set(key, hits);
  while (queryCache.size > QUERY_CACHE_LIMIT) {
    const firstKey = queryCache.keys().next().value;
    if (firstKey === undefined) break;
    queryCache.delete(firstKey);
  }
}

// Module-scope index status — survives palette open/close.
let indexStatus: IndexStatus = "idle";
const indexListeners = new Set<(s: IndexStatus) => void>();
function setIndexStatus(s: IndexStatus): void {
  indexStatus = s;
  for (const fn of indexListeners) fn(s);
}

function startSemanticWarmup(): void {
  if (indexStatus === "ready" || indexStatus === "loading") return;
  setIndexStatus("loading");
  loadSemanticIndex()
    .then(() => setIndexStatus("ready"))
    .catch(() => setIndexStatus("error"));
}

type FilterableType = Entity["type"];

const FILTER_TYPES: Array<{ id: FilterableType; label: string }> = [
  { id: "person", label: "People" },
  { id: "planet", label: "Planets" },
  { id: "ship", label: "Ships" },
  { id: "vehicle", label: "Vehicles" },
  { id: "species", label: "Species" },
  { id: "film", label: "Films" },
  { id: "comic", label: "Comics" },
  { id: "game", label: "Games" },
  { id: "event", label: "Events" }
];

export function SearchPalette({ entities }: Props) {
  const open = useSelection((s) => s.searchOpen);
  const setOpen = useSelection((s) => s.setSearchOpen);
  const select = useSelection((s) => s.select);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHit[]>([]);
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<IndexStatus>(indexStatus);
  const [typeFilter, setTypeFilter] = useState<Set<FilterableType>>(new Set());
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter hits client-side after the search returns. Filter resets on close.
  const filteredHits =
    typeFilter.size === 0 ? hits : hits.filter((h) => typeFilter.has(h.type));

  function toggleType(t: FilterableType) {
    setTypeFilter((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
    setActive(0);
  }

  function clearFilter() {
    setTypeFilter(new Set());
    setActive(0);
  }

  // Subscribe to module-level status changes so all opens see fresh state.
  useEffect(() => {
    const fn = (s: IndexStatus) => setStatus(s);
    indexListeners.add(fn);
    return () => {
      indexListeners.delete(fn);
    };
  }, []);

  useEffect(() => {
    if (open) {
      requestAnimationFrame(() => inputRef.current?.focus());
      // Kick off semantic warmup the first time the palette opens.
      startSemanticWarmup();
    } else {
      setQuery("");
      setHits([]);
      setActive(0);
      setTypeFilter(new Set());
    }
  }, [open]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setHits([]);
      return;
    }
    // Cache key includes status so results swap from lex-only → hybrid once warm.
    const cacheKey = `${status === "ready" ? "h" : "l"}:${trimmed.toLowerCase()}`;
    const cached = cacheGet(cacheKey);
    if (cached) {
      setHits(cached);
      setActive(0);
      return;
    }
    let cancelled = false;
    setBusy(true);
    runHybridSearch(entities, trimmed, 14)
      .then((r) => {
        if (cancelled) return;
        cacheSet(cacheKey, r);
        setHits(r);
        setActive(0);
      })
      .finally(() => {
        if (!cancelled) setBusy(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, entities, status]);

  const choose = useCallback(
    (hit: SearchHit) => {
      select(hit.id, hit.type);
      setOpen(false);
    },
    [select, setOpen]
  );

  const onKey = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((a) => Math.min(a + 1, filteredHits.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((a) => Math.max(a - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        const h = filteredHits[active];
        if (h) choose(h);
      } else if (e.key === "Escape") {
        e.preventDefault();
        setOpen(false);
      }
    },
    [filteredHits, active, choose, setOpen]
  );

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="scrim"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="fixed inset-0 z-40 bg-bg-deep/70 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <motion.dialog
            key="palette"
            open
            initial={{ opacity: 0, y: 8, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.99 }}
            transition={{ type: "spring", stiffness: 220, damping: 26 }}
            aria-label="Search the archive"
            className="fixed left-1/2 top-[14vh] z-50 w-[min(720px,92vw)] -translate-x-1/2 overflow-hidden rounded-2xl border border-border-line bg-bg-overlay/95 p-0 shadow-[0_30px_80px_-20px_oklch(0.05_0.005_240/0.6)]"
          >
            <div className="flex items-center gap-3 border-b border-border-faint px-4 py-3">
              <MagnifyingGlass size={16} weight="regular" className="text-fg-dim" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={onKey}
                placeholder='Search the archive — planets, people, events, "Order 66"…'
                className="flex-1 bg-transparent text-base text-fg-primary placeholder:text-fg-dim focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <kbd className="hidden items-center gap-1 rounded border border-border-faint px-1.5 py-0.5 font-mono text-2xs text-fg-dim md:inline-flex">
                <Command size={10} weight="regular" />K
              </kbd>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded border border-border-faint px-2 py-1 font-mono text-2xs uppercase tracking-wider text-fg-muted transition-colors hover:border-border-line hover:text-fg-primary md:hidden"
                aria-label="Close search"
              >
                Done
              </button>
            </div>

            <SemanticStatusRow status={status} />

            <div className="flex flex-wrap items-center gap-1.5 border-b border-border-faint px-4 py-2">
              <span className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
                Filter
              </span>
              {FILTER_TYPES.map((t) => {
                const active = typeFilter.has(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => toggleType(t.id)}
                    className={cn(
                      "rounded-full border px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.12em] transition-colors",
                      active
                        ? "border-accent-faint bg-accent-bg/50 text-fg-strong"
                        : "border-border-faint text-fg-muted hover:border-border-line hover:text-fg-primary"
                    )}
                    aria-pressed={active}
                  >
                    {t.label}
                  </button>
                );
              })}
              {typeFilter.size > 0 && (
                <button
                  type="button"
                  onClick={clearFilter}
                  className="ml-auto font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim transition-colors hover:text-fg-primary"
                >
                  Clear
                </button>
              )}
            </div>

            <div className="max-h-[55vh] overflow-y-auto">
              {!query.trim() && <SearchEmpty />}
              {query.trim() && filteredHits.length === 0 && !busy && (
                <SearchNoMatch query={query} filtered={typeFilter.size > 0} />
              )}

              {filteredHits.length > 0 && (
                <ul role="listbox" aria-label="Search results">
                  {filteredHits.map((hit, i) => (
                    <li key={hit.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={i === active}
                        onMouseEnter={() => setActive(i)}
                        onClick={() => choose(hit)}
                        className={cn(
                          "flex w-full items-center justify-between gap-4 border-l-2 px-4 py-2.5 text-left transition-colors",
                          i === active
                            ? "border-accent bg-accent-bg/40"
                            : "border-transparent hover:bg-bg-panel/40"
                        )}
                      >
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm text-fg-strong">{hit.name}</span>
                            <span
                              className={
                                hit.canonicity === "canon"
                                  ? "text-canon-glyph font-mono text-2xs uppercase tracking-[0.16em] text-canon"
                                  : "text-legends-glyph font-mono text-2xs uppercase tracking-[0.16em] text-legends"
                              }
                            >
                              {hit.canonicity}
                            </span>
                          </div>
                          {hit.short && (
                            <span className="truncate text-xs text-fg-muted">{hit.short}</span>
                          )}
                        </div>
                        <span className="flex items-center gap-3">
                          <SourceChip source={hit.source} />
                          <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
                            {hit.type}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <footer className="flex items-center justify-between border-t border-border-faint px-4 py-2 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
              <span>
                {hits.length > 0
                  ? typeFilter.size > 0 && filteredHits.length !== hits.length
                    ? `${filteredHits.length} of ${hits.length} matches`
                    : `${hits.length} matches`
                  : "type to search"}
              </span>
              <span className="flex items-center gap-3">
                <span>↑↓ navigate</span>
                <span>↵ select</span>
                <span>esc close</span>
              </span>
            </footer>
          </motion.dialog>
        </>
      )}
    </AnimatePresence>
  );
}

function SemanticStatusRow({ status }: { status: IndexStatus }) {
  if (status === "idle" || status === "ready") return null;
  const text =
    status === "loading"
      ? "Loading semantic index. ~3s, first open only."
      : "Semantic index unavailable — using lexical search only.";
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-2 border-b border-border-faint bg-bg-panel/30 px-4 py-1.5 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"
    >
      <span
        aria-hidden
        className={cn(
          "inline-block h-1 w-1 rounded-full",
          status === "loading" ? "bg-accent motion-safe:animate-pulse" : "bg-fg-dim"
        )}
      />
      <span>{text}</span>
    </div>
  );
}

function SourceChip({ source }: { source: SearchSource }) {
  const label = source;
  return (
    <span
      aria-label={`match source: ${label}`}
      className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"
    >
      {label}
    </span>
  );
}

function SearchEmpty() {
  return (
    <div className="px-4 py-8">
      <p className="font-mono text-2xs uppercase tracking-[0.18em] text-fg-dim">
        Quick examples
      </p>
      <ul className="mt-3 grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-fg-muted">
        <li>tatooine</li>
        <li>luke skywalker</li>
        <li>millennium falcon</li>
        <li>obi-wan</li>
        <li>death star</li>
        <li>wookiee</li>
      </ul>
    </div>
  );
}

function SearchNoMatch({ query, filtered }: { query: string; filtered: boolean }) {
  return (
    <div className="px-4 py-6">
      <p className="text-sm text-fg-primary">
        No archive match for <span className="text-accent">"{query}"</span>
        {filtered ? <span className="text-fg-muted"> in the active filter</span> : null}.
      </p>
      <p className="mt-1 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        {filtered ? "Clear the filter or try a broader query." : "Try a planet, person, ship, or event."}
      </p>
    </div>
  );
}
