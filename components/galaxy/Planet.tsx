"use client";

import { memo, useEffect, useRef, useState, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";
import type { PlacedPlanet } from "@/lib/data/positions";
import { useSelection } from "@/lib/store";

type Props = {
  planet: PlacedPlanet;
  showLabel?: boolean;
};

function PlanetImpl({ planet, showLabel = true }: Props) {
  const ref = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const select = useSelection((s) => s.select);
  const selectedId = useSelection((s) => s.entityId);
  const routeMode = useSelection((s) => s.route.mode);
  const routeOriginId = useSelection((s) => s.route.originId);
  const routeDestinationId = useSelection((s) => s.route.destinationId);
  const pickEndpoint = useSelection((s) => s.pickEndpoint);
  const isSelected = selectedId === planet.id;
  const isRouteOrigin = routeOriginId === planet.id;
  const isRouteDestination = routeDestinationId === planet.id;
  const isRouteEndpoint = isRouteOrigin || isRouteDestination;

  const material = useMemo(() => {
    return new THREE.MeshBasicMaterial({
      color: hashColor(planet.id),
      transparent: true,
      opacity: 0.95
    });
  }, [planet.id]);

  useEffect(() => () => material.dispose(), [material]);

  const haloMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color: 0x5fbfff,
        transparent: true,
        opacity: 0.0
      }),
    []
  );

  useEffect(() => () => haloMaterial.dispose(), [haloMaterial]);

  useFrame((_, delta) => {
    if (!ref.current) return;
    ref.current.rotation.y += delta * 0.18;
    const baseOpacity = isSelected || isRouteEndpoint ? 0.5 : hovered ? 0.22 : 0;
    haloMaterial.opacity = baseOpacity;
  });

  const [x, y, z] = planet.position;

  return (
    <group position={[x, y, z]}>
      <mesh
        ref={ref}
        material={material}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "default";
        }}
        onClick={(e) => {
          e.stopPropagation();
          const gameState = useSelection.getState().game;
          if (gameState.active && !gameState.feedback.active) {
            const isCorrect = planet.id === gameState.targetId;
            useSelection.getState().submitGuess(planet.id, isCorrect);
            return;
          }
          if (routeMode === "picking-origin" || routeMode === "picking-destination") {
            pickEndpoint(planet.id);
            return;
          }
          select(planet.id, "planet");
        }}
      >
        <sphereGeometry args={[planet.size, 24, 24]} />
      </mesh>
      <mesh material={haloMaterial}>
        <sphereGeometry args={[planet.size * 1.9, 16, 16]} />
      </mesh>

      {showLabel && (hovered || isSelected || isRouteEndpoint) && (
        <Html
          position={[0, planet.size * 1.5, 0]}
          center
          distanceFactor={48}
          style={{ pointerEvents: "none" }}
        >
          <div
            className="whitespace-nowrap font-mono text-2xs uppercase tracking-[0.18em]"
            style={{
              color:
                isRouteEndpoint || isSelected
                  ? "oklch(0.94 0.005 80)"
                  : "oklch(0.78 0.13 235)",
              textShadow: "0 1px 2px oklch(0.09 0.005 240 / 0.9)"
            }}
          >
            {planet.name}
            {isRouteOrigin && <span className="ml-2 text-fg-dim">[origin]</span>}
            {isRouteDestination && <span className="ml-2 text-fg-dim">[destination]</span>}
          </div>
        </Html>
      )}
    </group>
  );
}

function hashColor(id: string): THREE.Color {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  const hue = (h % 360) / 360;
  return new THREE.Color().setHSL(hue, 0.18, 0.7);
}

export const Planet = memo(PlanetImpl);
