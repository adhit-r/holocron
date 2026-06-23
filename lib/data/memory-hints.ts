/**
 * Memory Palace Hints Data
 *
 * Each hint targets a specific planet ID (matching positions.ts ANCHORS).
 * Difficulty levels:
 * - easy: Well-known lore, iconic descriptions.
 * - medium: Specific plot points, geography details.
 * - legends: Obscure trivia, expanded universe details.
 */

export type Difficulty = "easy" | "medium" | "legends";

export type MemoryHint = {
  id: string;
  targetId: string;
  hint: string;
  difficulty: Difficulty;
};

export const MEMORY_HINTS: MemoryHint[] = [
  // --- EASY ---
  {
    id: "h-01",
    targetId: "coruscant",
    hint: "The bustling ecumenopolis at the galaxy's heart.",
    difficulty: "easy",
  },
  {
    id: "h-02",
    targetId: "tatooine",
    hint: "A harsh desert world orbiting twin suns.",
    difficulty: "easy",
  },
  {
    id: "h-03",
    targetId: "hoth",
    hint: "The desolate ice planet that once housed Echo Base.",
    difficulty: "easy",
  },
  {
    id: "h-04",
    targetId: "endor",
    hint: "Home to the Forest Moon and the second Death Star's debris.",
    difficulty: "easy",
  },
  {
    id: "h-05",
    targetId: "naboo",
    hint: "A verdant world of plains, swamps, and underwater cities.",
    difficulty: "easy",
  },
  {
    id: "h-06",
    targetId: "kamino",
    hint: "The oceanic home of the galaxy's master cloners.",
    difficulty: "easy",
  },
  {
    id: "h-07",
    targetId: "mustafar",
    hint: "A volcanic wasteland where a master and apprentice once clashed.",
    difficulty: "easy",
  },
  {
    id: "h-08",
    targetId: "dagobah",
    hint: "A swampy refuge for a Jedi Master in exile.",
    difficulty: "easy",
  },
  {
    id: "h-09",
    targetId: "bespin",
    hint: "A gas giant famous for its tibanna gas and Cloud City.",
    difficulty: "easy",
  },
  {
    id: "h-10",
    targetId: "jakku",
    hint: "A graveyard of giants from a bygone galactic war.",
    difficulty: "easy",
  },

  // --- MEDIUM ---
  {
    id: "h-11",
    targetId: "geonosis",
    hint: "A rocky, ringed world where the Clone Wars began in a great arena.",
    difficulty: "medium",
  },
  {
    id: "h-12",
    targetId: "kashyyyk",
    hint: "The dense jungle world of the Wookiees, known for its massive Wroshyr trees.",
    difficulty: "medium",
  },
  {
    id: "h-13",
    targetId: "mandalore",
    hint: "The homeworld of the galaxy's most legendary warriors, once purged by the Empire.",
    difficulty: "medium",
  },
  {
    id: "h-14",
    targetId: "utapau",
    hint: "A planet of massive sinkholes and subterranean levels, where General Grievous met his end.",
    difficulty: "medium",
  },
  {
    id: "h-15",
    targetId: "ahch-to",
    hint: "The site of the first Jedi temple, hidden in the Unknown Regions.",
    difficulty: "medium",
  },
  {
    id: "h-16",
    targetId: "exegol",
    hint: "A dark, lightning-wracked stronghold of the hidden Sith.",
    difficulty: "medium",
  },
  {
    id: "h-17",
    targetId: "alderaan",
    hint: "A peaceful world of mountains and beauty, lost to the first Death Star.",
    difficulty: "medium",
  },
  {
    id: "h-18",
    targetId: "yavin",
    hint: "The jungle moon where the Rebellion launched its first great strike.",
    difficulty: "medium",
  },
  {
    id: "h-19",
    targetId: "felucia",
    hint: "A colorful, fungal world where Aayla Secura fell during Order 66.",
    difficulty: "medium",
  },
  {
    id: "h-20",
    targetId: "takodana",
    hint: "A lush world featuring Maz Kanata's castle, a waypoint for smugglers for centuries.",
    difficulty: "medium",
  },

  // --- LEGENDS ---
  {
    id: "h-21",
    targetId: "polis_massa",
    hint: "The remote asteroid mining settlement where the Skywalker twins were born.",
    difficulty: "legends",
  },
  {
    id: "h-22",
    targetId: "mygeeto",
    hint: "A crystalline, frozen world of the InterGalactic Banking Clan.",
    difficulty: "legends",
  },
  {
    id: "h-23",
    targetId: "cato_neimoidia",
    hint: "The opulent bridge-city homeworld of the Trade Federation elite.",
    difficulty: "legends",
  },
  {
    id: "h-24",
    targetId: "starkiller_base",
    hint: "The converted ice planet Ilum, weaponized into a sun-crushing fortress.",
    difficulty: "legends",
  },
  {
    id: "h-25",
    targetId: "crait",
    hint: "A mineral world with a surface of salt over red soil, site of a desperate Resistance stand.",
    difficulty: "legends",
  },
  {
    id: "h-26",
    targetId: "exegol",
    hint: "Located in the heart of the Unknown Regions, accessible only via a Sith wayfinder.",
    difficulty: "legends",
  },
  {
    id: "h-27",
    targetId: "bespin",
    hint: "Managed by Lando Calrissian, this facility exports gas via Ugnaught labor.",
    difficulty: "legends",
  },
  {
    id: "h-28",
    targetId: "kamino",
    hint: "Deleted from the Jedi Archives by Count Dooku to hide the army's creation.",
    difficulty: "legends",
  },
  {
    id: "h-29",
    targetId: "dagobah",
    hint: "A world strong with the Force, specifically at a cave under a Gnarltree.",
    difficulty: "legends",
  },
  {
    id: "h-30",
    targetId: "coruscant",
    hint: "Designated as triple-zero coordinates in the old galactic charts.",
    difficulty: "legends",
  },
];
