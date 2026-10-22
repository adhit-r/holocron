import type { Entity } from "@/lib/schema";

function norm(s: string): string {
  return (s || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

/**
 * Resolves a canonical battle ship string (e.g. "T-65B X-wing starfighter")
 * against the entity knowledge base (ships and vehicles).
 * Returns the matching Entity or null if not found in the archive.
 */
export function resolveShip(rawName: string, entities: Entity[]): Entity | null {
  if (!rawName) return null;
  const candidates = entities.filter((e) => e.type === "ship" || e.type === "vehicle");
  const targetNorm = norm(rawName);

  // 1. Exact match by name or alias
  for (const c of candidates) {
    if (norm(c.name) === targetNorm) return c;
    for (const a of c.aliases || []) {
      if (norm(a) === targetNorm) return c;
    }
  }

  // 2. Parentheses extraction: "Death Star (DS-1 Orbital Battle Station)"
  const insideParens = rawName.match(/\((.*?)\)/)?.[1];
  const outsideParens = rawName.replace(/\(.*?\)/g, "").trim();
  if (insideParens) {
    const insideNorm = norm(insideParens);
    for (const c of candidates) {
      if (norm(c.name) === insideNorm) return c;
      for (const a of c.aliases || []) {
        if (norm(a) === insideNorm) return c;
      }
    }
  }
  if (outsideParens) {
    const outNorm = norm(outsideParens);
    for (const c of candidates) {
      if (norm(c.name) === outNorm) return c;
      for (const a of c.aliases || []) {
        if (norm(a) === outNorm) return c;
      }
    }
  }

  // 3. Substring matching with candidate names/aliases
  for (const c of candidates) {
    const cNorm = norm(c.name);
    if (cNorm.length >= 4 && targetNorm.includes(cNorm)) return c;
    for (const a of c.aliases || []) {
      const aNorm = norm(a);
      if (aNorm.length >= 4 && targetNorm.includes(aNorm)) return c;
    }
  }

  // 4. Specialized canonical patterns
  const lower = rawName.toLowerCase();
  if (lower.includes("x-wing")) {
    const hit = candidates.find((c) => c.name.toLowerCase().includes("x-wing"));
    if (hit) return hit;
  }
  if (lower.includes("y-wing")) {
    const hit = candidates.find((c) => c.name.toLowerCase().includes("y-wing"));
    if (hit) return hit;
  }
  if (lower.includes("b-wing")) {
    const hit = candidates.find((c) => c.name.toLowerCase().includes("b-wing"));
    if (hit) return hit;
  }
  if (lower.includes("a-wing")) {
    const hit = candidates.find((c) => c.name.toLowerCase().includes("a-wing"));
    if (hit) return hit;
  }
  if (lower.includes("tie/ln") || lower.includes("tie fighter") || lower.includes("tie/ln fighter")) {
    const hit = candidates.find(
      (c) => c.id === "vehicle/8" || c.name.toLowerCase().includes("tie/ln")
    );
    if (hit) return hit;
  }
  if (lower.includes("star destroyer") && !lower.includes("super star destroyer")) {
    const hit = candidates.find((c) => c.id === "ship/3");
    if (hit) return hit;
  }
  if (lower.includes("death star")) {
    const hit = candidates.find((c) => c.id === "ship/9");
    if (hit) return hit;
  }
  if (lower.includes("millennium falcon")) {
    const hit = candidates.find((c) => c.id === "ship/10");
    if (hit) return hit;
  }
  if (lower.includes("executor") || lower.includes("super star destroyer")) {
    const hit = candidates.find((c) => c.id === "ship/15");
    if (hit) return hit;
  }

  return null;
}
