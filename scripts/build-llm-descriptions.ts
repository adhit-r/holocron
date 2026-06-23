/**
 * build-llm-descriptions.ts
 *
 * Enriches entity `long` descriptions using a local LLM (Phi-3-mini) for archive gaps.
 * Target: entities in data/build/kb.json that have an empty `long` field.
 *
 * Uses @xenova/transformers (Transformers.js) for local inference.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { KnowledgeBase, Entity, type Entity as TEntity, type Relation } from "../lib/schema";

const ROOT = process.cwd();
const KB_PATH = resolve(ROOT, "data/build/kb.json");
const MANIFEST_PATH = resolve(ROOT, "data/build/manifest.json");
const CACHE_DIR = resolve(ROOT, "data/.cache/llm");

// Model: Qwen1.5-0.5B-Chat (quantized) - ~400MB
const MODEL_ID = "Xenova/Qwen1.5-0.5B-Chat";

const MAX_NEW_TOKENS = 128;
const TEMPERATURE = 0.7;

// ---- args ----
const args = process.argv.slice(2);
const limitIdx = args.indexOf("--limit");
const limit: number | null = limitIdx !== -1 ? Number.parseInt(args[limitIdx + 1] ?? "0", 10) : null;
const skipReview = args.includes("--skip-review");

// ---- helpers ----

function relationLabel(kind: Relation["kind"]): string {
  const map: Record<string, string> = {
    master_of: "master of",
    apprentice_of: "apprentice of",
    parent_of: "parent of",
    child_of: "child of",
    sibling_of: "sibling of",
    spouse_of: "spouse of",
    ally_of: "ally of",
    enemy_of: "enemy of",
    member_of: "member of",
    leader_of: "leader of",
    homeworld_of: "from",
    located_in: "located in",
    appears_in: "appears in",
    captained_by: "captained by",
    designed_by: "designed by",
    fought_in: "fought in",
    occurred_at: "occurred at"
  };
  return map[kind] ?? kind;
}

function buildPrompt(entity: TEntity, byId: Map<string, TEntity>): string {
  const rels = entity.relations
    .map(r => {
      const target = byId.get(r.target);
      return target ? `${relationLabel(r.kind)} ${target.name}` : "";
    })
    .filter(Boolean)
    .join(", ");

  const context = [
    `Name: ${entity.name}`,
    `Type: ${entity.type}`,
    entity.short ? `Short Description: ${entity.short}` : "",
    rels ? `Relations: ${rels}` : ""
  ].filter(Boolean).join("\n");

  return `<|im_start|>system\nYou are a Star Wars lore expert. Write a concise, canonical description (max 2-3 sentences) for the following entity based on the provided context. Do not hallucinate. If you don't have enough information, say "Description not available."<|im_end|>\n<|im_start|>user\n${context}<|im_end|>\n<|im_start|>assistant\n`;
}

async function main() {
  const t0 = Date.now();

  // Ensure cache dir exists
  await mkdir(CACHE_DIR, { recursive: true });

  // Read kb.json
  console.log(`[llm] reading ${KB_PATH}`);
  const raw = await readFile(KB_PATH, "utf-8");
  const kb = KnowledgeBase.parse(JSON.parse(raw));
  const allEntities = kb.entities;
  const byId = new Map<string, TEntity>();
  for (const e of allEntities) byId.set(e.id, e);

  // Filter entities with empty 'long'
  let targets = allEntities.filter(e => !e.long || e.long.trim().length === 0);
  console.log(`[llm] ${allEntities.length} total entities, ${targets.length} lack descriptions.`);

  if (targets.length === 0) {
    console.log("[llm] nothing to do. exiting.");
    return;
  }

  if (limit !== null && limit > 0) {
    targets = targets.slice(0, limit);
    console.log(`[llm] --limit ${limit}: processing ${targets.length} entities.`);
  }

  // Load LLM
  console.log(`[llm] loading model: ${MODEL_ID} (this may take a while...)`);
  const { pipeline, env } = await import("@xenova/transformers");
  env.allowRemoteModels = true;
  env.allowLocalModels = false;

  const generator = await pipeline("text-generation", MODEL_ID);
  console.log(`[llm] model ready in ${Date.now() - t0}ms`);

  const rl = createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const acceptedDescriptions = new Map<string, string>();

  for (let i = 0; i < targets.length; i++) {
    const entity = targets[i]!;
    const cachePath = resolve(CACHE_DIR, `${entity.id.replace(/\//g, '-')}.json`);

    let generated: string;

    if (existsSync(cachePath)) {
      console.log(`[${i + 1}/${targets.length}] using cached for ${entity.name}`);
      const cached = JSON.parse(await readFile(cachePath, "utf-8"));
      generated = cached.description ?? "";
    } else {
      console.log(`[${i + 1}/${targets.length}] generating for ${entity.name}...`);
      const prompt = buildPrompt(entity, byId);
      
      const out = await generator(prompt, {
        max_new_tokens: MAX_NEW_TOKENS,
        temperature: TEMPERATURE,
        return_full_text: false,
      }) as any;

      generated = (out[0]?.generated_text ?? "").trim();
      
      // Basic cleaning (remove possible assistant tags if model failed to stop)
      generated = (generated.split('<|')[0] ?? "").trim();

      await writeFile(cachePath, JSON.stringify({
        id: entity.id,
        name: entity.name,
        description: generated,
        generatedAt: new Date().toISOString()
      }, null, 2));
    }

    if (generated === "Description not available.") {
      console.log(`  [-] skipped: insufficient data.`);
      continue;
    }

    console.log(`\n--- ${entity.name} (${entity.type}) ---`);
    console.log(`Context: ${entity.short}`);
    console.log(`Generated: ${generated}`);

    let approve = true;
    if (!skipReview) {
      const answer = await rl.question(`Approve? (y/n/skip): `);
      if (answer.toLowerCase() === 'n' || answer.toLowerCase() === 'skip') {
        approve = false;
      }
    }

    if (approve) {
      acceptedDescriptions.set(entity.id, generated);
      console.log(`  [✓] approved`);
    } else {
      console.log(`  [x] rejected`);
    }
  }

  rl.close();

  if (acceptedDescriptions.size > 0) {
    console.log(`[llm] merging ${acceptedDescriptions.size} descriptions into kb...`);
    
    for (const entity of allEntities) {
      if (acceptedDescriptions.has(entity.id)) {
        entity.long = acceptedDescriptions.get(entity.id)!;
      }
    }

    const updatedKb = {
      ...kb,
      builtAt: new Date().toISOString(),
      entities: allEntities
    };

    await writeFile(KB_PATH, JSON.stringify(updatedKb, null, 2), "utf8");
    console.log(`[llm] wrote ${KB_PATH}`);

    // Update manifest
    try {
      const manifestRaw = await readFile(MANIFEST_PATH, "utf-8");
      const manifest = JSON.parse(manifestRaw);
      manifest.llmEnrichedCount = (manifest.llmEnrichedCount || 0) + acceptedDescriptions.size;
      manifest.llmBuiltAt = new Date().toISOString();
      await writeFile(MANIFEST_PATH, JSON.stringify(manifest, null, 2), "utf8");
    } catch (e) {
      console.warn("[llm] manifest update failed, skipping.");
    }
  }

  console.log(`[llm] done in ${Date.now() - t0}ms`);
}

main().catch(err => {
  console.error("[llm] failed:", err);
  process.exit(1);
});
