"use client";

import { motion, AnimatePresence } from "motion/react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { X } from "@phosphor-icons/react";
import * as THREE from "three";
import type { Entity } from "@/lib/schema";
import type { LineageGraph } from "@/lib/data/loadLineage";
import type { PersonImage } from "@/lib/data/loadPersonImages";
import { useSelection } from "@/lib/store";
import { loadAllQuotesFor } from "@/lib/data/loadQuotes";
import { HolographicFigure } from "@/components/galaxy/HolographicFigure";
import { CosmicDust } from "./CosmicDust";
import { HyperspaceStreaks } from "./HyperspaceStreaks";
import { QuoteTrack } from "./QuoteTrack";

/**
 * <HoloStage /> — full-bleed cinematic projection mode for a single person.
 *
 * Activates when `useSelection.holoStage === true` AND the selected entity is
 * a person. Renders a dedicated R3F canvas filling the viewport with:
 *
 *   - Cosmic dust field (4000 Brownian-drift particles)
 *   - Hyperspace streaks (~12 drifting lines, lifecycle-managed)
 *   - Stage floor (faint grid disc with radial fade)
 *   - Vertical projection beam (additive cone, pulsing)
 *   - Hero <HolographicFigure /> at scale 6, with mount-time projector warm-up
 *   - Optional projected portrait plane (when person-images.json has the entity)
 *   - Floating HTML panels: identification, side classification, quote ticker,
 *     and a "resolved by" footer
 *   - Camera dolly: starts at z=120, eases in to z=40 over 1.6s
 *
 * Closes via Esc, the X button, or backdrop click. AnimatePresence handles the
 * fade-in/out at the React layer; the camera dolly + projector warm-up are
 * driven inside the R3F canvas.
 */
type Side = "jedi" | "sith" | "civilian";

type Props = {
  entities: Entity[];
  lineage: LineageGraph | null;
  personImages?: Map<string, PersonImage> | null;
};

export function HoloStage({ entities, lineage, personImages }: Props) {
  const open = useSelection((s) => s.holoStage);
  const setHoloStage = useSelection((s) => s.setHoloStage);
  const selectedId = useSelection((s) => s.entityId);

  const entity = useMemo(() => {
    if (!selectedId) return null;
    return entities.find((e) => e.id === selectedId) ?? null;
  }, [selectedId, entities]);

  const visible = open && entity?.type === "person";

  // Esc to close.
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setHoloStage(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, setHoloStage]);

  // Auto-close if the selection drops below "person".
  useEffect(() => {
    if (open && entity && entity.type !== "person") {
      setHoloStage(false);
    }
    if (open && !entity) setHoloStage(false);
  }, [open, entity, setHoloStage]);

  return (
    <AnimatePresence>
      {visible && entity && (
        <motion.div
          key="holostage"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-0 z-[80]"
          aria-modal="true"
          role="dialog"
          aria-label={`Hologram of ${entity.name}`}
          style={{ background: "oklch(0.07 0.005 240)" }}
        >
          {/* Backdrop click target — sits behind the canvas. The 3D canvas
              receives pointer events but Three.js objects below let the click
              fall through to this layer when the user clicks empty space. */}
          <button
            type="button"
            aria-label="Close hologram"
            onClick={() => setHoloStage(false)}
            className="absolute inset-0 cursor-default focus-visible:outline-none"
            tabIndex={-1}
          />

          <StageCanvas
            entity={entity}
            lineage={lineage}
            personImages={personImages ?? null}
          />

          <StageOverlay
            entity={entity}
            lineage={lineage}
            onClose={() => setHoloStage(false)}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

// ---------------------------------------------------------------------------
// Canvas — Three.js scene
// ---------------------------------------------------------------------------

function StageCanvas({
  entity,
  lineage,
  personImages
}: {
  entity: Entity;
  lineage: LineageGraph | null;
  personImages: Map<string, PersonImage> | null;
}) {
  const portrait = personImages?.get(entity.id) ?? null;

  return (
    <Canvas
      camera={{ position: [0, 4, 120], fov: 38, near: 0.1, far: 800 }}
      gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
      dpr={[1, 2]}
      style={{ position: "absolute", inset: 0, background: "transparent" }}
    >
      <Suspense fallback={null}>
        <ambientLight intensity={0.35} />
        <pointLight position={[0, 30, 30]} intensity={0.8} color="#7fcaff" />

        <CosmicDust count={4000} bound={80} agitation={0.12} />
        <HyperspaceStreaks count={12} radius={60} />

        <StageFloor />
        <ProjectorBeam />

        {portrait && <ProjectedPortrait portrait={portrait} />}

        <HeroFigure entity={entity} lineage={lineage ?? undefined} />

        <CameraDolly />
      </Suspense>
    </Canvas>
  );
}

// ---------------------------------------------------------------------------
// Camera dolly — eases from z=120 to z=40 over 1.6s on mount.
// ---------------------------------------------------------------------------

function CameraDolly() {
  const { camera } = useThree();
  const t0 = useRef(0);
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  useEffect(() => {
    if (reduce) {
      camera.position.set(0, 4, 40);
      camera.lookAt(0, 0, 0);
    } else {
      camera.position.set(0, 4, 120);
      camera.lookAt(0, 0, 0);
    }
    t0.current = 0;
  }, [camera, reduce]);

  useFrame((_, delta) => {
    if (reduce) return;
    t0.current += delta;
    const T = 1.6;
    const t = Math.min(1, t0.current / T);
    // Ease-out-expo: 1 - 2^(-10t)
    const eased = t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
    const z = 120 + (40 - 120) * eased;
    camera.position.set(0, 4, z);
    camera.lookAt(0, 0, 0);
  });

  return null;
}

// ---------------------------------------------------------------------------
// Stage floor — faint grid disc with radial fade.
// ---------------------------------------------------------------------------

function StageFloor() {
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uColor: { value: new THREE.Color(0.32, 0.62, 0.92) }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          vUv = uv;
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
          // Polar grid: radial rings + 12 spokes.
          vec2 c = vUv - 0.5;
          float r = length(c) * 2.0;
          float a = atan(c.y, c.x);

          float rings = 1.0 - smoothstep(0.04, 0.06, abs(fract(r * 5.0) - 0.5));
          float spokes = 1.0 - smoothstep(0.02, 0.04, abs(fract(a * 6.0 / 3.14159) - 0.5));
          float grid = max(rings, spokes) * 0.55;

          // Soft inner pulse + outer fade-out.
          float pulse = 0.5 + 0.5 * sin(uTime * 1.2 - r * 6.0);
          float radialFade = 1.0 - smoothstep(0.65, 1.0, r);
          float intensity = grid * radialFade * (0.4 + 0.6 * pulse);

          if (intensity < 0.005) discard;
          gl_FragColor = vec4(uColor * intensity, intensity * 0.7);
        }
      `,
      transparent: true,
      depthWrite: false,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending
    });
  }, []);

  const geometry = useMemo(() => new THREE.CircleGeometry(20, 96), []);

  useFrame((_, delta) => {
    if (reduce) return;
    const u = material.uniforms.uTime;
    if (u) u.value += delta;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  return (
    <mesh
      geometry={geometry}
      material={material}
      position={[0, -5, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
    />
  );
}

// ---------------------------------------------------------------------------
// Vertical projection beam — tall thin cone, additive blend, pulsing.
// ---------------------------------------------------------------------------

function ProjectorBeam() {
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const ref = useRef<THREE.Mesh>(null);

  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.42, 0.78, 1.0),
        transparent: true,
        opacity: 0.16,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
      }),
    []
  );

  const geometry = useMemo(
    () => new THREE.ConeGeometry(2.4, 28, 32, 1, true),
    []
  );

  useFrame(({ clock }) => {
    if (reduce || !ref.current) return;
    // 0.6s cycle pulse: scale [0.96 .. 1.04], opacity 0.12..0.22.
    const t = clock.elapsedTime;
    const phase = (Math.sin((t / 0.6) * Math.PI * 2) + 1) * 0.5;
    const s = 1.0 + (phase - 0.5) * 0.08;
    ref.current.scale.set(s, 1, s);
    material.opacity = 0.12 + phase * 0.10;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
    };
  }, [geometry, material]);

  // Pivot the cone so its apex is at the top, base at the floor.
  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      position={[0, 9, 0]}
      rotation={[Math.PI, 0, 0]}
    />
  );
}

// ---------------------------------------------------------------------------
// Projected Wikipedia portrait — backdrop intelligence-file plane.
// Only renders when person-images.json has an entry for this person.
// ---------------------------------------------------------------------------

function ProjectedPortrait({ portrait }: { portrait: PersonImage }) {
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );

  const tintColor = useMemo(() => {
    const c = parseHexColor(portrait.dominantColor) ?? new THREE.Color(0.40, 0.78, 1.0);
    return c;
  }, [portrait.dominantColor]);

  const texture = useMemo(() => {
    const loader = new THREE.TextureLoader();
    const t = loader.load(portrait.src);
    t.colorSpace = THREE.SRGBColorSpace;
    t.minFilter = THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    t.anisotropy = 4;
    return t;
  }, [portrait.src]);

  const material = useMemo(() => {
    return new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uMap: { value: texture },
        uTint: { value: tintColor.clone() },
        uOpacity: { value: 0.55 }
      },
      vertexShader: /* glsl */ `
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;
        void main() {
          vUv = uv;
          vWorldNormal = normalize(mat3(modelMatrix) * normal);
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vViewDir = normalize(cameraPosition - wp.xyz);
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: /* glsl */ `
        precision highp float;
        uniform float uTime;
        uniform sampler2D uMap;
        uniform vec3 uTint;
        uniform float uOpacity;
        varying vec2 vUv;
        varying vec3 vWorldNormal;
        varying vec3 vViewDir;

        void main() {
          // Sample portrait, desaturate, tint with dominantColor.
          vec3 c = texture2D(uMap, vUv).rgb;
          float gray = dot(c, vec3(0.299, 0.587, 0.114));
          vec3 tinted = mix(vec3(gray) * 0.6, uTint, 0.55);

          // Scanlines tied to UV-Y so they ride with the plane.
          float scan = step(0.5, fract(vUv.y * 220.0 - uTime * 0.3));
          tinted *= mix(0.65, 1.0, scan);

          // Rim glow at plane edges so it reads as a holographic overlay.
          float edgeX = smoothstep(0.0, 0.06, vUv.x) * (1.0 - smoothstep(0.94, 1.0, vUv.x));
          float edgeY = smoothstep(0.0, 0.06, vUv.y) * (1.0 - smoothstep(0.94, 1.0, vUv.y));
          float interior = edgeX * edgeY;
          float rim = 1.0 - interior;
          tinted += uTint * rim * 0.3;

          // Subtle horizontal chromatic split — recolor to suggest CRT artifacts.
          float ca = sin(vUv.y * 80.0 + uTime * 2.0) * 0.005;
          float r = texture2D(uMap, vUv + vec2(ca, 0.0)).r;
          float b = texture2D(uMap, vUv - vec2(ca, 0.0)).b;
          tinted.r = mix(tinted.r, r * uTint.r, 0.25);
          tinted.b = mix(tinted.b, b * uTint.b, 0.25);

          float alpha = uOpacity * (0.6 + 0.4 * interior);
          gl_FragColor = vec4(tinted, alpha);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
  }, [texture, tintColor]);

  const geometry = useMemo(() => new THREE.PlaneGeometry(11, 14), []);

  useFrame((_, delta) => {
    if (reduce) return;
    const u = material.uniforms.uTime;
    if (u) u.value += delta;
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
    };
  }, [geometry, material, texture]);

  // Plane behind the figure at z=-15. Camera-facing rotation is implicit
  // because we don't tilt — the camera looks toward (0,0,0) so the plane
  // already faces it.
  return (
    <mesh geometry={geometry} material={material} position={[0, 1.5, -15]} />
  );
}

// ---------------------------------------------------------------------------
// Hero figure — scaled-up HolographicFigure with mount-time intensity ramp.
// ---------------------------------------------------------------------------

function HeroFigure({
  entity,
  lineage
}: {
  entity: Entity;
  lineage?: LineageGraph;
}) {
  const reduce = useMemo(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    []
  );
  const groupRef = useRef<THREE.Group>(null);
  const lifeRef = useRef(0);
  const [intensity, setIntensity] = useState(reduce ? 1 : 0.05);

  useFrame((_, delta) => {
    if (reduce) return;
    lifeRef.current += delta;

    // Projector warm-up: low → full over ~1.2s with light flicker bias.
    const T = 1.2;
    const t = Math.min(1, lifeRef.current / T);
    // Add a small flicker bias during warm-up only.
    const flicker = t < 1 ? Math.abs(Math.sin(lifeRef.current * 32)) * 0.08 : 0;
    const target = Math.min(1, 0.05 + (1.0 - 0.05) * Math.pow(t, 0.7) - flicker);
    if (Math.abs(target - intensity) > 0.01) setIntensity(target);

    if (groupRef.current) {
      // Gentle Z-axis lean as the camera moves in — sin-driven 0..0.06rad.
      const lean = Math.sin(lifeRef.current * 0.45) * 0.04;
      groupRef.current.rotation.z = lean;
    }
  });

  return (
    <group ref={groupRef} position={[0, 0, 0]}>
      <HolographicFigure
        entity={entity}
        scale={6}
        intensity={intensity}
        lineage={lineage}
      />
    </group>
  );
}

// ---------------------------------------------------------------------------
// Overlay — DOM panels around the canvas: identification, side, quotes, footer
// ---------------------------------------------------------------------------

function StageOverlay({
  entity,
  lineage,
  onClose
}: {
  entity: Entity;
  lineage: LineageGraph | null;
  onClose: () => void;
}) {
  const side = useMemo(() => classifySide(entity, lineage), [entity, lineage]);

  const quotes = useMemo(() => loadAllQuotesFor(entity.id), [entity.id]);
  const factionTags = useMemo(() => {
    return Array.from(new Set(entity.affiliations.map((a) => a.faction))).slice(0, 3);
  }, [entity.affiliations]);

  const wikiSource = entity.sources.find((s) => /wikipedia\.org/.test(s)) ?? null;

  const sideClass =
    side === "sith"
      ? "text-alarm border-alarm/60 bg-alarm/10"
      : side === "jedi"
      ? "text-accent border-accent-faint bg-accent-bg/40"
      : "text-fg-muted border-border-line bg-bg-overlay/40";

  const sideLabel = side.toUpperCase();

  return (
    <>
      {/* Top-left identification panel */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute left-4 top-4 flex max-w-[calc(100vw-70px)] flex-col gap-1 md:left-8 md:top-8 md:max-w-[40ch]"
      >
        <div className="flex items-center gap-2">
          <span className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
            Holocron projection · {entity.canonicity}
          </span>
          <span
            className={`pointer-events-auto inline-flex items-center rounded border px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] md:hidden ${sideClass}`}
          >
            {sideLabel}
          </span>
        </div>
        <h2 className="text-2xl font-medium leading-tight tracking-tight text-fg-strong md:text-3xl">
          {entity.name}
        </h2>
        {entity.aliases.length > 0 && (
          <p className="text-xs text-fg-muted">also {entity.aliases.slice(0, 3).join(" · ")}</p>
        )}
        {entity.era && <EraLine era={entity.era} />}
      </motion.div>

      {/* Top-right close button (always touch accessible) + side/factions on desktop */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.42, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute right-4 top-4 flex flex-col items-end gap-2 md:right-8 md:top-8"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close hologram"
          className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border-faint bg-bg-overlay/80 px-3 py-1.5 text-fg-muted backdrop-blur-md transition-colors hover:border-border-line hover:text-fg-primary md:rounded-md"
        >
          <kbd className="hidden font-mono text-2xs uppercase tracking-[0.16em] text-fg-dim md:inline">Esc</kbd>
          <X size={15} weight="regular" />
        </button>

        <span
          className={`pointer-events-auto hidden items-center rounded border px-3 py-1 font-mono text-2xs uppercase tracking-[0.2em] md:inline-flex ${sideClass}`}
        >
          {sideLabel}
        </span>
        {factionTags.length > 0 && (
          <div className="hidden flex-wrap justify-end gap-1 md:flex">
            {factionTags.map((f) => (
              <span
                key={f}
                className="rounded border border-border-faint bg-bg-overlay/40 px-2 py-0.5 font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted"
              >
                {f.replace(/_/g, " ")}
              </span>
            ))}
          </div>
        )}
      </motion.div>

      {/* Bottom-center quote ticker */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="pointer-events-none absolute bottom-12 left-1/2 -translate-x-1/2 w-[min(92vw,560px)] md:bottom-16"
      >
        <QuoteTrack quotes={quotes} />
      </motion.div>

      {/* Bottom-right "Resolved by" footer */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.32, ease: [0.16, 1, 0.3, 1] }}
        className="hidden absolute bottom-6 right-8 flex-col items-end gap-0.5 md:flex"
      >
        <span className="font-mono text-2xs uppercase tracking-[0.2em] text-fg-dim">
          Resolved by
        </span>
        {wikiSource ? (
          <a
            href={wikiSource}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-xs text-fg-muted transition-colors hover:text-fg-primary"
          >
            {hostnameOf(wikiSource)}
          </a>
        ) : (
          <span className="font-mono text-xs text-fg-dim">internal archive</span>
        )}
      </motion.div>
    </>
  );
}

function EraLine({ era }: { era: NonNullable<Entity["era"]> }) {
  const parts: string[] = [];
  if (era.birthYear != null) parts.push(`b. ${formatYearShort(era.birthYear)}`);
  if (era.deathYear != null) parts.push(`d. ${formatYearShort(era.deathYear)}`);
  if (parts.length === 0 && era.firstAppearance != null) {
    parts.push(`first seen ${formatYearShort(era.firstAppearance)}`);
  }
  if (parts.length === 0) return null;
  return (
    <p className="font-mono text-2xs uppercase tracking-[0.16em] text-fg-muted">
      {parts.join(" · ")}
    </p>
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SITH_ORIGINS = new Set<string>([
  "person/darth-bane",
  "person/darth-plagueis",
  "person/darth-revan"
]);

function classifySide(entity: Entity, graph: LineageGraph | null): Side {
  if (!graph) return "civilian";
  const sith = new Set<string>();
  for (const n of graph.nodes) {
    if (n.faction === "sith_order") sith.add(n.id);
    if (SITH_ORIGINS.has(n.id)) sith.add(n.id);
  }
  const masterFwd = new Map<string, string[]>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of") continue;
    const list = masterFwd.get(e.source) ?? [];
    list.push(e.target);
    masterFwd.set(e.source, list);
  }
  const queue = [...sith];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    const ds = masterFwd.get(cur);
    if (!ds) continue;
    for (const next of ds) {
      if (!sith.has(next)) {
        sith.add(next);
        queue.push(next);
      }
    }
  }
  if (sith.has(entity.id)) return "sith";
  const node = graph.nodes.find((n) => n.id === entity.id);
  if (node?.faction === "jedi_order") return "jedi";
  const inMaster = new Set<string>();
  for (const e of graph.edges) {
    if (e.kind !== "master_of") continue;
    inMaster.add(e.source);
    inMaster.add(e.target);
  }
  if (inMaster.has(entity.id)) return "jedi";
  return "civilian";
}

function formatYearShort(year: number): string {
  if (year < 0) return `${Math.abs(year)} BBY`;
  if (year > 0) return `${year} ABY`;
  return "0 BBY/ABY";
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

function parseHexColor(hex: string | null | undefined): THREE.Color | null {
  if (!hex) return null;
  const trimmed = hex.trim();
  if (!/^#?[0-9a-fA-F]{3,8}$/.test(trimmed)) return null;
  try {
    return new THREE.Color(trimmed.startsWith("#") ? trimmed : `#${trimmed}`);
  } catch {
    return null;
  }
}

