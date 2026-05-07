"use client";

import { useCallback, useMemo, useRef } from "react";
import { useSelection } from "@/lib/store";
import { formatYear, clamp } from "@/lib/utils";

const MIN_YEAR = -25025;
const MAX_YEAR = 35;

const ERA_BANDS: Array<{ start: number; end: number; label: string; tone: "muted" | "dim" }> = [
  { start: -25025, end: -5000, label: "Pre-Republic", tone: "dim" },
  { start: -5000, end: -1000, label: "Old Republic", tone: "muted" },
  { start: -1000, end: -19, label: "Galactic Republic", tone: "dim" },
  { start: -19, end: 4, label: "Imperial era", tone: "muted" },
  { start: 4, end: 35, label: "New Republic", tone: "dim" }
];

const ANCHORS: Array<{ year: number; label: string; mobileHidden?: boolean }> = [
  { year: -25025, label: "Republic founding" },
  { year: -3956, label: "Mandalorian Wars", mobileHidden: true },
  { year: -1000, label: "Ruusan Reformation", mobileHidden: true },
  { year: -22, label: "Clone Wars begin", mobileHidden: true },
  { year: -19, label: "Order 66", mobileHidden: true },
  { year: 0, label: "Battle of Yavin" },
  { year: 4, label: "Battle of Endor", mobileHidden: true },
  { year: 34, label: "Starkiller Base", mobileHidden: true }
];

export function TimelineScrubber() {
  const era = useSelection((s) => s.era);
  const setEra = useSelection((s) => s.setEra);
  const trackRef = useRef<HTMLDivElement>(null);

  const t = useMemo(() => yearToT(era), [era]);

  const handlePointer = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!trackRef.current) return;
      const rect = trackRef.current.getBoundingClientRect();
      const ratio = clamp((e.clientX - rect.left) / rect.width, 0, 1);
      const year = Math.round(tToYear(ratio));
      setEra(year);
    },
    [setEra]
  );

  return (
    <section
      className="border-t border-border-faint bg-bg-canvas/85 px-6 py-3 backdrop-blur-md"
      aria-label="Galactic timeline"
    >
      <div className="flex items-center justify-between pb-1">
        <span className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">Timeline</span>
        <span className="font-mono text-sm text-fg-strong">{formatYear(era)}</span>
      </div>

      <div
        ref={trackRef}
        role="slider"
        aria-label="Era scrubber"
        aria-valuemin={MIN_YEAR}
        aria-valuemax={MAX_YEAR}
        aria-valuenow={era}
        aria-valuetext={formatYear(era)}
        tabIndex={0}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePointer(e);
        }}
        onPointerMove={(e) => {
          if (e.buttons === 1) handlePointer(e);
        }}
        onKeyDown={(e) => {
          const step = e.shiftKey ? 1000 : 100;
          if (e.key === "ArrowLeft") setEra(clamp(era - step, MIN_YEAR, MAX_YEAR));
          if (e.key === "ArrowRight") setEra(clamp(era + step, MIN_YEAR, MAX_YEAR));
        }}
        className="relative h-10 cursor-ew-resize select-none"
      >
        <div className="absolute inset-x-0 top-1/2 h-px -translate-y-1/2 bg-border-faint" />

        <div className="absolute inset-0 flex">
          {ERA_BANDS.map((band) => {
            const left = yearToT(band.start) * 100;
            const right = yearToT(band.end) * 100;
            return (
              <div
                key={band.label}
                className="absolute top-1/2 h-[2px] -translate-y-1/2"
                style={{
                  left: `${left}%`,
                  width: `${right - left}%`,
                  background:
                    band.tone === "muted" ? "var(--color-border-line)" : "var(--color-border-faint)"
                }}
                aria-hidden
              />
            );
          })}
        </div>

        {ANCHORS.map((a) => {
          const left = yearToT(a.year) * 100;
          return (
            <div key={a.year} className={`absolute top-0 -translate-x-1/2 ${a.mobileHidden ? "hidden md:block" : ""}`} style={{ left: `${left}%` }}>
              <div className="h-2 w-px bg-fg-dim" aria-hidden />
              <span className="absolute left-1/2 top-3 -translate-x-1/2 whitespace-nowrap font-mono text-[10px] uppercase tracking-[0.08em] text-fg-dim">
                {a.label}
              </span>
            </div>
          );
        })}

        <div
          aria-hidden
          className="absolute top-0 h-full w-px bg-accent"
          style={{ left: `${t * 100}%` }}
        />
        <div
          aria-hidden
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${t * 100}%` }}
        >
          <div className="h-3 w-3 rounded-full bg-accent" />
        </div>
      </div>
    </section>
  );
}

function yearToT(year: number): number {
  return clamp((year - MIN_YEAR) / (MAX_YEAR - MIN_YEAR), 0, 1);
}
function tToYear(t: number): number {
  return MIN_YEAR + t * (MAX_YEAR - MIN_YEAR);
}
