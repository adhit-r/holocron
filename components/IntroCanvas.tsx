"use client";

import { Canvas } from "@react-three/fiber";
import { Suspense, useEffect, useState } from "react";
import { Starfield } from "./Starfield";

type Props = {
  className?: string;
};

export function IntroCanvas({ className }: Props) {
  const [supportsWebGL, setSupportsWebGL] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement("canvas");
      const gl =
        canvas.getContext("webgl2") ||
        canvas.getContext("webgl") ||
        canvas.getContext("experimental-webgl");
      setSupportsWebGL(Boolean(gl));
    } catch {
      setSupportsWebGL(false);
    }
  }, []);

  if (supportsWebGL === null) {
    return <div className={className} />;
  }

  if (supportsWebGL === false) {
    return (
      <div
        className={className}
        role="img"
        aria-label="Static archive view fallback"
      >
        <FallbackBackdrop />
      </div>
    );
  }

  return (
    <div className={className}>
      <Canvas
        camera={{ position: [0, 8, 60], fov: 55, near: 0.1, far: 2000 }}
        gl={{ antialias: true, powerPreference: "high-performance", alpha: true }}
        dpr={[1, 2]}
        style={{ background: "transparent" }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.05} />
          <Starfield count={9000} radius={500} />
          <DiscPlate />
        </Suspense>
      </Canvas>
    </div>
  );
}

function DiscPlate() {
  return (
    <mesh rotation={[-Math.PI / 2.4, 0, 0]} position={[0, -8, 0]}>
      <ringGeometry args={[12, 380, 96, 1]} />
      <meshBasicMaterial
        color="oklch(0.78 0.13 235)"
        transparent
        opacity={0.025}
        side={2}
      />
    </mesh>
  );
}

function FallbackBackdrop() {
  return (
    <svg
      viewBox="0 0 800 600"
      preserveAspectRatio="xMidYMid slice"
      className="h-full w-full"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id="g1" cx="55%" cy="50%" r="60%">
          <stop offset="0%" stopColor="oklch(0.22 0.04 235)" stopOpacity="0.6" />
          <stop offset="60%" stopColor="oklch(0.13 0.005 240)" stopOpacity="0.9" />
          <stop offset="100%" stopColor="oklch(0.09 0.005 240)" stopOpacity="1" />
        </radialGradient>
      </defs>
      <rect width="800" height="600" fill="url(#g1)" />
      {Array.from({ length: 220 }).map((_, i) => {
        const cx = (i * 137) % 800;
        const cy = (i * 71 + 19) % 600;
        const r = i % 19 === 0 ? 1.6 : 0.7;
        return <circle key={i} cx={cx} cy={cy} r={r} fill="oklch(0.94 0.005 80)" opacity={0.7} />;
      })}
    </svg>
  );
}
