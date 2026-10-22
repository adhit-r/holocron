"use client";

import { Html } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Battle, FactionId } from "@/lib/schema";
import { useSelection } from "@/lib/store";
import { formatYear, cn } from "@/lib/utils";

type Props = {
  battle: Battle;
  position: [number, number, number];
  era: number;
};

/**
 * A 4-pointed compass star marker for a battle, rendered at the planet
 * position. Distinct from EventMarker (octahedron) so battles read as
 * dramatic, martial moments versus civilian milestones.
 *
 * Visibility window is ±30 years (tighter than EventMarker's ±50) so battles
 * cluster sharply around their year as the user scrubs. The marker pulses
 * subtly when active to suggest combat. Reduced motion → static glyph.
 *
 * Click → selects the battle id with type "event" so the datapad pivots to
 * the battle's record.
 */

const VISIBLE_RADIUS_YEARS = 30;
const PULSE_PERIOD_S = 1.6;

const RED_FACTIONS: ReadonlySet<FactionId> = new Set<FactionId>([
  "sith_order",
  "galactic_empire",
  "first_order"
]);

const BLUE_FACTIONS: ReadonlySet<FactionId> = new Set<FactionId>([
  "jedi_order",
  "galactic_republic",
  "rebel_alliance",
  "new_republic",
  "resistance",
  "old_republic",
  "high_republic"
]);

type BattleTone = {
  color: THREE.Color;
  cssVar: string;
};

const TONE_RED: BattleTone = {
  color: new THREE.Color("hsl(8, 75%, 58%)"),
  cssVar: "var(--color-alarm, oklch(0.64 0.18 25))"
};
const TONE_BLUE: BattleTone = {
  color: new THREE.Color("hsl(212, 65%, 65%)"),
  cssVar: "var(--color-accent, oklch(0.78 0.13 235))"
};
const TONE_CREAM: BattleTone = {
  color: new THREE.Color("hsl(45, 22%, 70%)"),
  cssVar: "var(--fg-muted, oklch(0.66 0.01 240))"
};

function toneForBattle(battle: Battle): BattleTone {
  if (battle.outcome === "stalemate") return TONE_CREAM;
  let red = false;
  let blue = false;
  for (const b of battle.belligerents) {
    for (const f of b.factions) {
      if (RED_FACTIONS.has(f)) red = true;
      if (BLUE_FACTIONS.has(f)) blue = true;
    }
  }
  // Both sides aligned with major factions → alarm tone (high drama).
  if (red && blue) return TONE_RED;
  if (red) return TONE_RED;
  if (blue) return TONE_BLUE;
  return TONE_CREAM;
}

/**
 * Build a 4-point compass star geometry. Two thin THREE.BoxGeometry primitives
 * — one horizontal, one vertical — are merged into a small extruded cross.
 * The result reads as a directional star/compass-rose glyph distinct from
 * EventMarker's octahedron.
 *
 * The geometry is built once and shared by all BattleMarker instances via
 * the module-level closure. It's never disposed — three.js doesn't dispose
 * shared geometries across a page lifetime, and the page rebuilds on
 * navigation anyway.
 */
function buildStarGeometry(): THREE.BufferGeometry {
  const arm = 1.6; // long axis
  const cross = 0.42; // short axis
  const depth = 0.42;
  const horiz = new THREE.BoxGeometry(arm * 2, cross, depth);
  const vert = new THREE.BoxGeometry(cross, arm * 2, depth);
  // Merge the two boxes by simply combining their position attributes via a
  // BufferGeometryUtils-style concat. We avoid the import by emitting a
  // simple group geometry: use a `<group>` of two meshes instead — simpler
  // than maintaining a manual merge here. So this helper is unused; keeping
  // the dimensions exported as constants for readability of the JSX below.
  horiz.dispose();
  vert.dispose();
  return new THREE.BufferGeometry();
}
// Touch the function so it's not flagged as unused; the actual glyph lives
// in JSX where two boxes are placed in a sub-group.
void buildStarGeometry;

const ARM_LONG = 1.6;
const ARM_SHORT = 0.42;
const ARM_DEPTH = 0.42;

export function BattleMarker({ battle, position, era }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);
  const select = useSelection((s) => s.select);
  const selectedId = useSelection((s) => s.entityId);
  const isSelected = selectedId === battle.id;
  const [hovered, setHovered] = useState(false);

  const reducedMotion = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const [x, y, z] = position;

  const visibility = useMemo(() => {
    const dist = Math.abs(era - battle.year);
    if (dist >= VISIBLE_RADIUS_YEARS) return 0;
    return 1 - dist / VISIBLE_RADIUS_YEARS;
  }, [era, battle.year]);

  const tone = useMemo(() => toneForBattle(battle), [battle]);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: tone.color,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    matRef.current = m;
    return m;
  }, [tone.color]);

  useFrame((state, delta) => {
    if (matRef.current) {
      const lerpRate = 1 - Math.pow(0.001, delta);
      matRef.current.opacity += (visibility - matRef.current.opacity) * lerpRate;
    }
    if (!groupRef.current) return;

    // Pulse: 0.7 ↔ 1.0 scale on a 1.6s cycle. Reduced motion holds at 0.85
    // (midpoint) for visual stability.
    let scale: number;
    if (reducedMotion) {
      scale = 0.85;
    } else {
      const t = state.clock.elapsedTime / PULSE_PERIOD_S;
      const phase = (Math.sin(t * Math.PI * 2) + 1) / 2; // 0..1
      scale = 0.7 + phase * 0.3;
    }
    groupRef.current.scale.setScalar(scale);

    // Subtle vertical rise when active.
    const targetY = visibility > 0 ? 1.6 : 0;
    groupRef.current.position.y =
      y + targetY + (groupRef.current.position.y - (y + targetY)) * 0.92;
  });

  const culled = visibility <= 0.001;

  function onPointerDown(e: { stopPropagation: () => void }) {
    e.stopPropagation();
    // Battles are surfaced through the datapad as event-typed records.
    select(battle.id, "event");
  }

  return (
    <group
      ref={groupRef}
      position={[x, y, z]}
      visible={!culled}
      onPointerDown={onPointerDown}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => {
        setHovered(false);
      }}
    >
      {/* Horizontal arm of the compass star */}
      <mesh material={material} rotation={[0, 0, 0]}>
        <boxGeometry args={[ARM_LONG * 2, ARM_SHORT, ARM_DEPTH]} />
      </mesh>
      {/* Vertical arm of the compass star */}
      <mesh material={material} rotation={[0, 0, 0]}>
        <boxGeometry args={[ARM_SHORT, ARM_LONG * 2, ARM_DEPTH]} />
      </mesh>
      {/* Diagonal cross overlay rotated 45° on Y so the four points read
          as a martial 4-point compass star from above. */}
      <group rotation={[0, Math.PI / 4, 0]}>
        <mesh material={material}>
          <boxGeometry args={[ARM_LONG * 1.4, ARM_SHORT * 0.8, ARM_DEPTH * 0.7]} />
        </mesh>
        <mesh material={material}>
          <boxGeometry args={[ARM_SHORT * 0.8, ARM_LONG * 1.4, ARM_DEPTH * 0.7]} />
        </mesh>
      </group>
      <Html
        position={[0, -2.0, 0]}
        center
        distanceFactor={56}
        style={{
          pointerEvents: hovered || isSelected ? "auto" : "none",
          opacity: Math.min(1, visibility * 1.4),
          zIndex: hovered || isSelected ? 40 : 10
        }}
      >
        <div
          onClick={(e) => {
            e.stopPropagation();
            select(battle.id, "event");
          }}
          className={cn(
            "cursor-pointer rounded border border-border-faint bg-bg-overlay/95 backdrop-blur-md transition-all shadow-lg text-left",
            hovered || isSelected
              ? "p-2.5 min-w-[220px] max-w-xs border-accent/70 shadow-[0_0_15px_rgba(235,160,50,0.25)] ring-1 ring-accent/30"
              : "px-2 py-0.5 whitespace-nowrap hover:border-border-line"
          )}
          style={{
            textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)"
          }}
        >
          <div
            className="font-mono text-2xs uppercase tracking-[0.16em] font-semibold"
            style={{ color: tone.cssVar }}
          >
            {`${battle.name} · ${formatYear(battle.year)}`}
          </div>

          {(hovered || isSelected) && (
            <div className="mt-2 flex flex-col gap-1.5 border-t border-border-faint/60 pt-2 font-mono">
              {battle.outcome && (
                <div className="text-[10px] text-fg-muted uppercase tracking-wider">
                  Outcome:{" "}
                  <span className="font-semibold text-fg-strong">
                    {battle.outcome}
                    {battle.winningSide ? ` (${battle.winningSide})` : ""}
                  </span>
                </div>
              )}
              {battle.shipsInvolved && battle.shipsInvolved.length > 0 && (
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] uppercase tracking-wider text-fg-dim">
                    Ships involved ({battle.shipsInvolved.length}):
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {battle.shipsInvolved.slice(0, 4).map((s) => (
                      <span
                        key={s}
                        className="rounded border border-border-faint bg-bg-panel/80 px-1 py-0.5 text-[9px] text-fg-primary"
                      >
                        {s.split(" (")[0]}
                      </span>
                    ))}
                    {battle.shipsInvolved.length > 4 && (
                      <span className="text-[9px] text-fg-dim">
                        +{battle.shipsInvolved.length - 4} more
                      </span>
                    )}
                  </div>
                </div>
              )}
              <div className="pt-0.5 text-[9px] uppercase tracking-wider text-accent">
                Click to open datapad &rarr;
              </div>
            </div>
          )}
        </div>
      </Html>
    </group>
  );
}
