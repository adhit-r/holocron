"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import type { PlacedPlanet } from "@/lib/data/positions";
import type { Entity, Hyperlane } from "@/lib/schema";
import type { LineageGraph } from "@/lib/data/loadLineage";
import { Starfield } from "@/components/Starfield";
import { Planet } from "./Planet";
import { SectorGrid } from "./SectorGrid";
import { RouteOverlay } from "./RouteOverlay";
import { ShipVoyage } from "./ShipVoyage";
import { ShipTraffic } from "./ShipTraffic";
import { PlotRouteHud } from "./PlotRouteHud";
import { ConnectionWeb } from "./ConnectionWeb";
import { HolographicFigure } from "./HolographicFigure";
import { ForcePulse, type ForceSide } from "./ForcePulse";
import { Holocard } from "./Holocard";
import { AtlasMode } from "./AtlasMode";
import { findRoute } from "@/lib/data/lane-graph";
import { computeVoyage } from "@/lib/data/ship-voyage";
import { resolveAnchor } from "@/lib/data/relationGeometry";
import { sideAtEra } from "@/lib/data/force-transitions";
import { useSelection } from "@/lib/store";

type Props = {
  planets: PlacedPlanet[];
  entities?: Entity[];
  lineage?: LineageGraph | null;
  lanes?: Hyperlane[];
  mobile?: boolean;
};

const SITH_ORIGINS = new Set([
  "person/darth-bane",
  "person/darth-plagueis",
  "person/darth-revan"
]);

/**
 * Classify a person's Force alignment for use in GalaxyCanvas.
 *
 * When `era` is provided, the function first consults the declarative
 * FORCE_TRANSITIONS table via sideAtEra(). If the person has a known
 * transition arc, that result is returned directly. Otherwise the function
 * falls back to the BFS-from-Sith-origins algorithm.
 */
function classifySide(
  entityId: string,
  lineage: LineageGraph | null,
  era?: number
): ForceSide {
  // Era-aware override takes precedence over BFS when the person has
  // known transition data.
  if (era !== undefined) {
    const eraResolved = sideAtEra(entityId, era);
    if (eraResolved !== null) return eraResolved;
  }

  if (!lineage) return "civilian";
  const node = lineage.nodes.find((n) => n.id === entityId);
  if (!node) return "civilian";
  if (node.faction === "sith_order") return "sith";
  const sith = new Set<string>(SITH_ORIGINS);
  for (const n of lineage.nodes) if (n.faction === "sith_order") sith.add(n.id);
  const fwd = new Map<string, string[]>();
  for (const e of lineage.edges) {
    if (e.kind !== "master_of") continue;
    const list = fwd.get(e.source) ?? [];
    list.push(e.target);
    fwd.set(e.source, list);
  }
  const queue = [...sith];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const ds = fwd.get(cur);
    if (!ds) continue;
    for (const t of ds) if (!sith.has(t)) { sith.add(t); queue.push(t); }
  }
  if (sith.has(entityId)) return "sith";
  if (node.faction === "jedi_order") return "jedi";
  const inMaster = new Set<string>();
  for (const e of lineage.edges) {
    if (e.kind !== "master_of") continue;
    inMaster.add(e.source);
    inMaster.add(e.target);
  }
  return inMaster.has(entityId) ? "jedi" : "civilian";
}

export function GalaxyCanvas({
  planets,
  entities = [],
  lineage = null,
  lanes = [],
  mobile = false
}: Props) {
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const c = document.createElement("canvas");
      const gl = c.getContext("webgl2") || c.getContext("webgl");
      setSupportsWebGL(Boolean(gl));
    } catch {
      setSupportsWebGL(false);
    }
  }, []);

  if (supportsWebGL === false) {
    return <FallbackGalaxy planets={planets} />;
  }

  return (
    <div className="relative h-full w-full">
      <Canvas
        camera={{ position: [0, 90, 200], fov: 55, near: 0.1, far: 4000 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[0, 50, 0]} intensity={0.6} color="#5fbfff" />
          <Starfield count={mobile ? 3000 : 9000} radius={900} speed={0.0001} />
          <SectorGrid size={520} divisions={14} />
          <PlanetField planets={planets} />
          <RouteScene planets={planets} lanes={lanes} />
          <TrafficLayer lanes={lanes} />
          <ConnectionLayer entities={entities} planets={planets} />
          <VoyageLayer entities={entities} planets={planets} />
          <SelectionVisuals entities={entities} planets={planets} lineage={lineage} />
          <AtlasLayer entities={entities} planets={planets} lineage={lineage} />
          <SceneController planets={planets} />
        </Suspense>
      </Canvas>
      <CornerHud />
      <PlotRouteHud planets={planets} lanes={lanes} />
    </div>
  );
}

function PlanetField({ planets }: { planets: PlacedPlanet[] }) {
  return (
    <group>
      {planets.map((p) => (
        <Planet key={p.id} planet={p} />
      ))}
    </group>
  );
}

function ConnectionLayer({
  entities,
  planets
}: {
  entities: Entity[];
  planets: PlacedPlanet[];
}) {
  const selectedId = useSelection((s) => s.entityId);
  const selectedType = useSelection((s) => s.entityType);
  if (!entities.length) return null;
  return (
    <ConnectionWeb
      entities={entities}
      planets={planets}
      selectedId={selectedId}
      selectedType={selectedType}
    />
  );
}

/**
 * Renders the chronological voyage of the currently-selected ship or
 * vehicle through the galaxy. No-op for any other entity type, including
 * persons, planets, films, or events. Memoized on the (selectedId, ship,
 * planets, entities) tuple via `computeVoyage`'s internal cache.
 */
function VoyageLayer({
  entities,
  planets
}: {
  entities: Entity[];
  planets: PlacedPlanet[];
}) {
  const selectedId = useSelection((s) => s.entityId);
  const selectedType = useSelection((s) => s.entityType);

  const voyage = useMemo(() => {
    if (!selectedId) return null;
    if (selectedType !== "ship" && selectedType !== "vehicle") return null;
    const ship = entities.find((e) => e.id === selectedId);
    if (!ship) return null;
    return computeVoyage(ship, entities, planets);
  }, [selectedId, selectedType, entities, planets]);

  return <ShipVoyage voyage={voyage} />;
}

function SelectionVisuals({
  entities,
  planets,
  lineage
}: {
  entities: Entity[];
  planets: PlacedPlanet[];
  lineage: LineageGraph | null;
}) {
  const selectedId = useSelection((s) => s.entityId);
  const atlasMode = useSelection((s) => s.atlasMode);
  const era = useSelection((s) => s.era);

  const { entity, anchor, side } = useMemo(() => {
    if (!selectedId) return { entity: null, anchor: null, side: "civilian" as ForceSide };
    const e = entities.find((ent) => ent.id === selectedId) ?? null;
    if (!e) return { entity: null, anchor: null, side: "civilian" as ForceSide };
    const a = resolveAnchor(e, entities, planets);
    const s = e.type === "person" ? classifySide(e.id, lineage, era) : "civilian";
    return { entity: e, anchor: a, side: s };
  }, [selectedId, entities, planets, lineage, era]);

  if (!entity || !anchor) return null;

  const showDedicatedFigure = !atlasMode && entity.type === "person";
  const figurePos: [number, number, number] = [anchor[0], anchor[1] + 6, anchor[2]];

  return (
    <>
      {showDedicatedFigure && (
        <HolographicFigure
          entity={entity}
          lineage={lineage ?? undefined}
          position={figurePos}
          scale={2.4}
          intensity={1}
          side={side}
          era={era}
        />
      )}
      {entity.type === "person" && side !== "civilian" && (
        <ForcePulse entity={entity} anchorPosition={anchor} side={side} />
      )}
      <Holocard entity={entity} anchorPosition={anchor} entities={entities} />
    </>
  );
}

function AtlasLayer({
  entities,
  planets,
  lineage
}: {
  entities: Entity[];
  planets: PlacedPlanet[];
  lineage: LineageGraph | null;
}) {
  const enabled = useSelection((s) => s.atlasMode);
  const selectedId = useSelection((s) => s.entityId);
  if (!entities.length || !lineage) return null;
  return (
    <AtlasMode
      entities={entities}
      planets={planets}
      lineage={lineage}
      selectedId={selectedId}
      enabled={enabled}
    />
  );
}

/**
 * Subscribes to the global era scrubber and renders ambient ship traffic on
 * the hyperspace lane network. Era-aware: only ship classes whose
 * [activeFrom, activeTo] window includes the current era are spawned.
 * No-op when there are no lanes.
 */
function TrafficLayer({ lanes }: { lanes: Hyperlane[] }) {
  const era = useSelection((s) => s.era);
  if (!lanes.length) return null;
  return <ShipTraffic lanes={lanes} era={era} />;
}

function RouteScene({
  planets,
  lanes
}: {
  planets: PlacedPlanet[];
  lanes: Hyperlane[];
}) {
  const route = useSelection((s) => s.route);

  const computed = useMemo(() => {
    if (route.mode !== "shown" || !route.originId || !route.destinationId) return null;
    return findRoute(route.originId, route.destinationId, planets, lanes);
  }, [route.mode, route.originId, route.destinationId, planets, lanes]);

  if (!computed) return null;
  return <RouteOverlay route={computed} />;
}

function SceneController({ planets }: { planets: PlacedPlanet[] }) {
  const selectedId = useSelection((s) => s.entityId);
  const routeMode = useSelection((s) => s.route.mode);
  const { camera } = useThree();
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const targetPos = useRef(new THREE.Vector3());
  const targetCam = useRef(new THREE.Vector3());
  const animating = useRef(false);

  useEffect(() => {
    if (!selectedId) return;
    // While the user is picking endpoints or has a shown route, don't
    // hijack the camera — the route HUD is the focal point and the user
    // is likely orbiting to see the path.
    if (routeMode !== "idle") return;
    const p = planets.find((pl) => pl.id === selectedId);
    if (!p) return;

    const [px, py, pz] = p.position;
    targetPos.current.set(px, py, pz);
    const offset = new THREE.Vector3()
      .subVectors(camera.position, controlsRef.current?.target ?? new THREE.Vector3())
      .normalize()
      .multiplyScalar(40);
    targetCam.current.set(px + offset.x, py + 14, pz + offset.z);
    animating.current = true;
  }, [selectedId, planets, camera, routeMode]);

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
      minDistance={20}
      maxDistance={420}
      maxPolarAngle={Math.PI * 0.85}
    />
  );
}

function CornerHud() {
  return (
    <div className="pointer-events-none absolute inset-0">
      <div className="absolute left-6 top-6 hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:block">
        Galaxy view
      </div>
      <div className="absolute right-6 top-6 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        Sector grid · 1500 pc
      </div>
      <div className="absolute bottom-6 left-6 flex flex-col gap-1 font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">
        <span>Drag to orbit · scroll to zoom</span>
        <span className="hidden sm:inline">· R to plot route</span>
      </div>
      <div className="absolute bottom-6 right-6 hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim sm:block">
        WebGL2 · 60 fps
      </div>
    </div>
  );
}

function FallbackGalaxy({ planets }: { planets: PlacedPlanet[] }) {
  return (
    <div className="grid h-full w-full place-items-center bg-bg-deep p-6">
      <div className="max-w-md">
        <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim">3D unavailable</p>
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
