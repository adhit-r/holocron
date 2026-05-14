import type { Entity } from "@/lib/schema";

/**
 * Deterministic 3D placement for planets.
 *
 * Priority order:
 *   1. ANCHORS table — manually tuned positions for iconic planets.
 *   2. Entity.spatial.coords — parzivail/SWGalacticMap canonical coords,
 *      present after running `build:lanes` + `build:kb`.
 *   3. Logarithmic spiral fallback — deterministic placement for any planet
 *      that has neither an anchor nor parzivail coords.
 *
 * Parzivail coords are already normalized to the same Three.js unit range
 * as the spiral (~±260 units) by build-lanes.ts, so no further scaling is
 * needed here. The ANCHORS table always wins over parzivail to keep
 * iconic reference points (Coruscant at origin, Tatooine in the outer rim)
 * stable and cinematically legible.
 */

const CORE_DISTANCE = 8;
const ARM_SPACING = 6;
const Y_VARIANCE = 4;
const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

const ANCHORS: Record<string, [number, number, number]> = {
  // Original / Prequel-era anchors
  coruscant: [0, 0, 0],
  alderaan: [-22, 0.5, 18],
  yavin: [42, -1.2, 38],
  "yavin iv": [42, -1.2, 38],
  tatooine: [78, 1.4, -56],
  hoth: [-90, -2.1, -70],
  endor: [110, -0.8, 92],
  naboo: [36, 0.6, -28],
  bespin: [-44, 1.1, 22],
  kamino: [-128, 0.4, 84],
  geonosis: [62, -0.9, -46],
  dagobah: [-58, -1.4, -64],
  kashyyyk: [18, 0.2, -38],
  mustafar: [48, -1.6, -54],
  mandalore: [-32, 1.1, -16],
  "polis massa": [-88, -2.0, 62],
  utapau: [88, 0.4, -88],
  felucia: [62, -0.6, 70],
  mygeeto: [-58, 1.0, 38],
  cato_neimoidia: [-22, 0.6, -36],

  // Sequel-era anchors. Coordinates approximate per Wookieepedia / Star Wars
  // Galactic Atlas; positions chosen so post-ROTJ Falcon voyages and
  // First Order war theatres render with proper geographic separation.
  // https://starwars.fandom.com/wiki/Jakku — Inner Rim Western Reaches
  jakku: [96, 0.8, -42],
  // https://starwars.fandom.com/wiki/Takodana — Mid Rim
  takodana: [56, 0.4, 12],
  // https://starwars.fandom.com/wiki/Ahch-To — Unknown Regions, far western
  "ahch-to": [-160, -0.6, -38],
  ahch_to: [-160, -0.6, -38],
  // https://starwars.fandom.com/wiki/Crait — Outer Rim, mineral world
  crait: [82, -1.4, 122],
  // https://starwars.fandom.com/wiki/Kef_Bir — moon of Endor (placed near Endor)
  "kef bir": [114, -0.6, 96],
  kef_bir: [114, -0.6, 96],
  // https://starwars.fandom.com/wiki/D'Qar — Outer Rim, Resistance base
  "d'qar": [104, 0.2, 66],
  dqar: [104, 0.2, 66],
  // https://starwars.fandom.com/wiki/Exegol — Unknown Regions, Sith stronghold
  exegol: [-184, -2.4, 168],
  // https://starwars.fandom.com/wiki/Starkiller_Base — Unknown Regions, ice world
  "starkiller base": [-152, 0.4, 142],
  starkiller_base: [-152, 0.4, 142]
};

function hash01(input: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return ((h >>> 0) % 10000) / 10000;
}

function spiralPosition(index: number, total: number): [number, number, number] {
  const t = index / Math.max(total - 1, 1);
  const r = CORE_DISTANCE + Math.sqrt(t) * (total * ARM_SPACING * 0.45);
  const theta = index * GOLDEN_ANGLE;
  const x = r * Math.cos(theta);
  const z = r * Math.sin(theta);
  return [x, 0, z];
}

export type PlacedPlanet = {
  id: string;
  name: string;
  short: string;
  position: [number, number, number];
  size: number;
  canonicity: Entity["canonicity"];
  physical?: Entity["physical"];
};

export function placePlanets(planets: Entity[]): PlacedPlanet[] {
  const sorted = [...planets].sort((a, b) => a.name.localeCompare(b.name));
  const total = sorted.length;
  const out: PlacedPlanet[] = [];

  let placedIndex = 0;
  for (const p of sorted) {
    // Try anchor key both with underscores and raw (e.g. "yavin iv" or "yavin_iv")
    const underscoreKey = p.name.toLowerCase().replace(/\s+/g, "_");
    const anchor = ANCHORS[underscoreKey] ?? ANCHORS[p.name.toLowerCase()];

    let pos: [number, number, number];

    if (anchor) {
      // Priority 1: manual anchor always wins
      pos = anchor;
    } else if (p.spatial?.coords !== undefined) {
      // Priority 2: parzivail canonical coords (already in Three.js units)
      const c = p.spatial.coords;
      pos = [c.x, c.y, c.z];
    } else {
      // Priority 3: deterministic spiral fallback
      const [sx, , sz] = spiralPosition(placedIndex, total);
      const j = hash01(p.id);
      const k = hash01(p.id + "y");
      const m = hash01(p.id + "z");
      pos = [
        sx + (j - 0.5) * 6,
        (k - 0.5) * Y_VARIANCE,
        sz + (m - 0.5) * 6
      ];
      placedIndex += 1;
    }

    const size = 0.55 + hash01(p.id + "size") * 0.9;
    out.push({
      id: p.id,
      name: p.name,
      short: p.short,
      position: pos,
      size,
      canonicity: p.canonicity,
      physical: p.physical
    });
  }

  return out;
}
