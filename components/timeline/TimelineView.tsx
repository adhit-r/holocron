"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { Battle, Entity, Hyperlane, TimelineEvent, War } from "@/lib/schema";
import type { PlacedPlanet } from "@/lib/data/positions";
import { Starfield } from "@/components/Starfield";
import { SectorGrid } from "@/components/galaxy/SectorGrid";
import { useSelection } from "@/lib/store";
import { formatYear } from "@/lib/utils";
import { Lane } from "./Lane";
import { EraPlanet } from "./EraPlanet";
import { EventMarker } from "./EventMarker";
import { FactionTerritory } from "./FactionTerritory";
import { WarTheatre } from "./WarTheatre";
import { BattleMarker } from "./BattleMarker";

type Props = {
  planets: PlacedPlanet[];
  lanes: Hyperlane[];
  events: TimelineEvent[];
  entities: Entity[];
  wars?: War[];
  battles?: Battle[];
};

export function TimelineView({
  planets,
  lanes,
  events,
  entities,
  wars = [],
  battles = []
}: Props) {
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null);
  const era = useSelection((s) => s.era);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      setSupportsWebGL(Boolean(gl));
    } catch {
      setSupportsWebGL(false);
    }
  }, []);

  // Resolve planet → entity once, so EraPlanet can read the entity.era.
  const entityById = useMemo(() => {
    const m = new Map<string, Entity>();
    for (const e of entities) m.set(e.id, e);
    return m;
  }, [entities]);

  // Resolve event → planet position once. Events without a known planet
  // location render at galactic origin (slightly above so they're legible
  // against the sector grid).
  const eventPositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const ev of events) {
      const pid = ev.locationId;
      const p = pid ? planets.find((pl) => pl.id === pid) : undefined;
      if (p) {
        map.set(ev.id, [p.position[0], p.position[1] + 1.4, p.position[2]]);
      } else {
        map.set(ev.id, [0, 1.4, 0]);
      }
    }
    return map;
  }, [events, planets]);

  // Resolve battle → planet position. Battles whose `planetId` is null or
  // missing from the placed-planet set are skipped (no fallback to origin —
  // unanchored battles would clutter the galactic core).
  const battlePositions = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    for (const b of battles) {
      if (!b.planetId) continue;
      const p = planets.find((pl) => pl.id === b.planetId);
      if (!p) continue;
      map.set(b.id, [p.position[0], p.position[1] + 1.4, p.position[2]]);
    }
    return map;
  }, [battles, planets]);

  if (supportsWebGL === false) {
    return <FallbackTimeline planets={planets} era={era} />;
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 280, 0], fov: 45, near: 0.1, far: 4000 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 200, 0]} intensity={0.6} color="#5fbfff" />
          <Starfield count={3000} radius={900} speed={0.0001} />
          <SectorGrid size={520} divisions={14} />

          <FactionTerritory era={era} />

          <WarTheatre wars={wars} planets={planets} era={era} />

          {lanes.map((lane) => (
            <Lane key={lane.id} lane={lane} era={era} />
          ))}

          <PlanetField planets={planets} entityById={entityById} era={era} />

          {events.map((ev) => {
            const pos = eventPositions.get(ev.id);
            if (!pos) return null;
            return <EventMarker key={ev.id} event={ev} position={pos} era={era} />;
          })}

          {battles.map((b) => {
            const pos = battlePositions.get(b.id);
            if (!pos) return null;
            return <BattleMarker key={b.id} battle={b} position={pos} era={era} />;
          })}

          <TopDownController planets={planets} />
        </Suspense>
      </Canvas>
      <CornerHud era={era} />
    </div>
  );
}

function PlanetField({
  planets,
  entityById,
  era
}: {
  planets: PlacedPlanet[];
  entityById: Map<string, Entity>;
  era: number;
}) {
  return (
    <group>
      {planets.map((p) => (
        <EraPlanet key={p.id} planet={p} entity={entityById.get(p.id)} era={era} />
      ))}
    </group>
  );
}

/**
 * Camera controller for the top-down timeline projection.
 *
 * Locks polar angle near 0 so the user can never tilt the view away from
 * a strict overhead projection. Allows azimuth rotation around the Y axis
 * and zoom (clamped to a sensible range). When a planet is selected via
 * cross-pivot, the camera dollies the orbit target to that planet, keeping
 * the same overhead vantage.
 */
function TopDownController({ planets }: { planets: PlacedPlanet[] }) {
  const selectedId = useSelection((s) => s.entityId);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetCam = useRef(new THREE.Vector3(0, 280, 0));
  const animating = useRef(false);

  useEffect(() => {
    if (!selectedId) return;
    const p = planets.find((pl) => pl.id === selectedId);
    if (!p) return;
    const [px, py, pz] = p.position;
    targetPos.current.set(px, py, pz);
    // Keep the camera strictly overhead — only the X/Z component shifts to
    // re-center the planet under the orthographic-style top-down view.
    targetCam.current.set(px, 280, pz);
    animating.current = true;
  }, [selectedId, planets]);

  useFrame((_, delta) => {
    if (!animating.current || !controlsRef.current) return;
    const lerpRate = 1 - Math.pow(0.001, delta);
    camera.position.lerp(targetCam.current, lerpRate);
    controlsRef.current.target.lerp(targetPos.current, lerpRate);
    controlsRef.current.update();

    if (
      camera.position.distanceTo(targetCam.current) < 0.5 &&
      controlsRef.current.target.distanceTo(targetPos.current) < 0.5
    ) {
      animating.current = false;
    }
  });

  return (
    <OrbitControls
      ref={controlsRef}
      enablePan={false}
      enableDamping
      dampingFactor={0.08}
      minDistance={80}
      maxDistance={500}
      // Lock to top-down: the polar angle range collapses to ~0–9°. Users
      // can still rotate around Y (azimuth) and zoom, but cannot tilt the
      // camera off-axis, preserving the galactic-projection feel.
      minPolarAngle={0}
      maxPolarAngle={Math.PI * 0.05}
    />
  );
}

function CornerHud({ era }: { era: number }) {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-4 top-4 hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:block">
        Timeline view · top-down
      </div>
      <div className="absolute right-4 top-4 hidden font-mono text-sm text-fg-strong tabular-nums sm:block">
        {formatYear(era)}
      </div>
      <div className="absolute bottom-4 left-4 hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:block">
        Click a planet · scrub to seek
      </div>
      <div className="absolute bottom-4 right-4 hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:block">
        Hyperspace lanes · 5 routes
      </div>
    </div>
  );
}

function FallbackTimeline({ planets, era }: { planets: PlacedPlanet[]; era: number }) {
  return (
    <div className="grid h-full w-full place-items-center bg-bg-deep p-6">
      <div className="max-w-md">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
          Timeline view · {formatYear(era)}
        </p>
        <p className="mt-2 text-sm text-fg-primary/85">
          This device does not support WebGL. Showing a 2D archive list of {planets.length}{" "}
          known planets.
        </p>
        <ul className="mt-4 grid grid-cols-2 gap-x-4 gap-y-1 font-mono text-2xs text-fg-muted">
          {planets.map((p) => (
            <li key={p.id} className="truncate">
              {p.name}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
