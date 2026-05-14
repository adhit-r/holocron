import { desertFrag, desertVert } from "./desert";
import { lavaFrag, lavaVert } from "./lava";
import { cityFrag, cityVert } from "./city";
import { iceFrag, iceVert } from "./ice";
import { oceanFrag, oceanVert } from "./ocean";
import { gasGiantFrag, gasGiantVert } from "./gas-giant";
import { forestFrag, forestVert } from "./forest";

export type ClimateType = "desert" | "ice" | "ocean" | "lava" | "gas-giant" | "forest" | "city" | "default";

export interface PlanetShader {
  fragment: string;
  vertex: string;
}

export const PLANET_SHADERS: Record<ClimateType, PlanetShader> = {
  desert: { fragment: desertFrag, vertex: desertVert },
  lava: { fragment: lavaFrag, vertex: lavaVert },
  city: { fragment: cityFrag, vertex: cityVert },
  ice: { fragment: iceFrag, vertex: iceVert }, 
  ocean: { fragment: oceanFrag, vertex: oceanVert },
  "gas-giant": { fragment: gasGiantFrag, vertex: gasGiantVert },
  forest: { fragment: forestFrag, vertex: forestVert },
  default: { fragment: desertFrag, vertex: desertVert }
};

export function getClimateFromMetadata(name: string, short: string, climate?: string, terrain?: string): ClimateType {
  const text = `${name} ${short} ${climate ?? ""} ${terrain ?? ""}`.toLowerCase();

  if (text.includes("coruscant") || text.includes("city") || text.includes("urban") || text.includes("metropolis")) return "city";
  if (text.includes("mustafar") || text.includes("lava") || text.includes("volcanic") || text.includes("magma")) return "lava";
  if (text.includes("tatooine") || text.includes("desert") || text.includes("arid") || text.includes("sand")) return "desert";
  if (text.includes("hoth") || text.includes("ice") || text.includes("frozen") || text.includes("tundra") || text.includes("cold")) return "ice";
  if (text.includes("bespin") || text.includes("gas") || text.includes("giant") || text.includes("cloud")) return "gas-giant";
  if (text.includes("kamino") || text.includes("ocean") || text.includes("water") || text.includes("marine")) return "ocean";
  if (text.includes("endor") || text.includes("kashyyyk") || text.includes("forest") || text.includes("jungle") || text.includes("lush")) return "forest";

  return "default";
}
