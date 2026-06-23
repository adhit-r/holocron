"use client";

import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { TimelineEvent } from "@/lib/schema";

type Props = {
  event: TimelineEvent;
  position: [number, number, number];
  era: number;
};

/**
 * A small accent diamond rendered at the canonical event location with an
 * HTML label showing the event title in mono. The marker is visible only
 * when the global era is within ±50 years of the event year, so markers
 * appear as the user scrubs near them.
 *
 * Visibility transitions are smoothly faded via useFrame opacity lerps.
 * Reduced-motion users still get a fade because the GL property is not
 * controlled by CSS — the visibility correctness is preserved either way,
 * and the lerp window is short enough (~200ms) that it is unobtrusive.
 */

const VISIBLE_RADIUS_YEARS = 50;

export function EventMarker({ event, position, era }: Props) {
  const groupRef = useRef<THREE.Group>(null);
  const matRef = useRef<THREE.MeshBasicMaterial | null>(null);

  const [x, y, z] = position;
  
  // Deterministic stagger for events at the same location (e.g. origin)
  const staggerY = useMemo(() => {
    let h = 0;
    for (let i = 0; i < event.id.length; i++) {
      h = (Math.imul(31, h) + event.id.charCodeAt(i)) | 0;
    }
    return (Math.abs(h % 5) * 1.5);
  }, [event.id]);

  // Visibility scalar: 1 at exact year, 0 beyond ±VISIBLE_RADIUS_YEARS,
  // smooth linear in between.
  const visibility = useMemo(() => {
    const dist = Math.abs(era - event.year);
    if (dist >= VISIBLE_RADIUS_YEARS) return 0;
    return 1 - dist / VISIBLE_RADIUS_YEARS;
  }, [era, event.year]);

  const material = useMemo(() => {
    const m = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(0.59, 0.55, 0.62),
      transparent: true,
      opacity: 0,
      depthWrite: false
    });
    matRef.current = m;
    return m;
  }, []);

  useFrame((_, delta) => {
    if (matRef.current) {
      const lerpRate = 1 - Math.pow(0.001, delta);
      matRef.current.opacity += (visibility - matRef.current.opacity) * lerpRate;
    }
    if (groupRef.current) {
      // Subtle vertical rise when active; flush at zero when fully inactive.
      const targetY = visibility > 0 ? 1.6 : 0;
      groupRef.current.position.y =
        y + targetY + (groupRef.current.position.y - (y + targetY)) * 0.92;
    }
  });

  // Skip rendering entirely when far from the era window — saves draw calls
  // for the ~14 canon events when only a handful are near the cursor.
  const culled = visibility <= 0.001;

  return (
    <group ref={groupRef} position={[x, y, z]} visible={!culled}>
      {/* Accent diamond — an octahedron rendered as a small marker */}
      <mesh material={material} rotation={[0, Math.PI / 4, 0]}>
        <octahedronGeometry args={[1.2, 0]} />
      </mesh>
      <Html
        position={[0, 2.4 + staggerY, 0]}
        center
        distanceFactor={64}
        style={{ pointerEvents: "none", opacity: Math.min(1, visibility * 1.4) }}
      >
        <div
          className="whitespace-nowrap rounded-sm border border-border-faint bg-bg-overlay/70 px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-fg-primary backdrop-blur-sm sm:text-2xs"
          style={{ textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)" }}
        >
          {event.title}
        </div>
      </Html>
    </group>
  );
}
