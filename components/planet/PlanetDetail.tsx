"use client";

import { motion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
import type { Entity } from "@/lib/schema";
import type { PlanetImage } from "@/lib/data/loadPlanetImages";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { PlanetHero } from "./PlanetHero";
import { StatDashboard } from "./StatDashboard";
import { NotableResidents } from "./NotableResidents";
import { FilmAppearances } from "./FilmAppearances";
import { formatYear } from "@/lib/utils";
import { Aurebesh } from "@/components/Aurebesh";

/**
 * <PlanetDetail /> — wiki-style detail surface for a planet entity.
 *
 * Composition (top → bottom):
 *   1. <PlanetHero /> — full-bleed hero with shader backdrop, Wikipedia
 *      thumbnail behind a holographic mask, headline + caption.
 *   2. <StatDashboard /> — climate/terrain chips + numeric instruments.
 *   3. Lore section (Wikipedia long text, expandable) — same UX as the
 *      generic datapad path, but rendered inline so we don't double-import.
 *   4. <NotableResidents /> — horizontal portrait scroller.
 *   5. <FilmAppearances /> — film chips.
 *   6. Era + Sources rows for parity with the generic datapad surface.
 *
 * Header chrome (pivot/crawl buttons + canonicity glyph) lives in the parent
 * Datapad; this component owns only the article body.
 */

type Props = {
  entity: Entity;
  entities: Entity[];
  planetImages: Map<string, PlanetImage> | null;
  personImages: Map<string, PersonImage> | null;
  /**
   * Ref to the scrollable container around this article. The hero's
   * scroll-collapse hook needs this to bind `useScroll({ container })`.
   */
  scrollContainer: RefObject<HTMLElement | null>;
};

const LORE_PREVIEW_LEN = 480;
const LORE_SPRING = { type: "spring", stiffness: 240, damping: 28 } as const;

export function PlanetDetail({
  entity,
  entities,
  planetImages,
  personImages,
  scrollContainer
}: Props) {
  const heroImage = planetImages?.get(entity.id) ?? null;

  return (
    <motion.article
      key={entity.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col"
    >
      <PlanetHero entity={entity} image={heroImage} scrollContainer={scrollContainer} />

      <div className="flex flex-col gap-5 px-6 py-5">
        <StatDashboard entity={entity} />

        {entity.long && <LoreSection long={entity.long} entityId={entity.id} />}

        <NotableResidents
          planet={entity}
          entities={entities}
          personImages={personImages}
        />

        <FilmAppearances planet={entity} entities={entities} />

        {entity.era && (entity.era.firstAppearance != null || entity.era.lastAppearance != null) && (
          <div className="flex flex-col gap-1 border-t border-border-faint pt-4">
            <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim"><Aurebesh char="E" />ra</span>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-sm">
              {entity.era.firstAppearance != null && (
                <Row label="first seen" value={formatYear(entity.era.firstAppearance)} />
              )}
              {entity.era.lastAppearance != null && (
                <Row label="last seen" value={formatYear(entity.era.lastAppearance)} />
              )}
            </dl>
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
                  <a
                    href={s}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-fg-primary"
                  >
                    {hostnameOf(s)}
                  </a>
                </li>
              ))}
              {heroImage && (
                <li className="truncate">
                  <a
                    href={heroImage.wikipediaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-fg-primary"
                  >
                    {hostnameOf(heroImage.wikipediaUrl)}
                  </a>
                </li>
              )}
            </ul>
          </div>
        )}
      </div>
    </motion.article>
  );
}

function hostnameOf(s: string): string {
  try {
    return new URL(s).hostname;
  } catch {
    return s;
  }
}

// Local copy of the generic LoreSection — kept inline so PlanetDetail isn't
// coupled to Datapad's internal exports.
function LoreSection({ long, entityId }: { long: string; entityId: string }) {
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    setExpanded(false);
  }, [entityId]);

  const needsTruncation = long.length > LORE_PREVIEW_LEN;
  const displayText =
    expanded || !needsTruncation ? long : long.slice(0, LORE_PREVIEW_LEN).trimEnd() + "…";

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

function Row({ label, value }: { label: string; value: string }) {
  return (
    <>
      <dt className="text-fg-dim">{label}</dt>
      <dd className="text-right text-fg-primary">{value}</dd>
    </>
  );
}

// Quietly suppress the otherwise-unused warning for the wrapping ref import
// that we expose on Props. Reading `scrollContainer` here would be needless.
export type { Props as PlanetDetailProps };
