const ADJECTIVES = [
  "amber",
  "bold",
  "brisk",
  "calm",
  "clear",
  "cool",
  "crisp",
  "curious",
  "dark",
  "fair",
  "flat",
  "grim",
  "hidden",
  "idle",
  "keen",
  "late",
  "live",
  "lucid",
  "neat",
  "noble",
  "open",
  "pale",
  "prime",
  "quiet",
  "rare",
  "raw",
  "sharp",
  "silent",
  "slim",
  "solid",
  "stark",
  "still",
  "swift",
  "taut",
  "tight",
  "vast",
  "vivid",
  "wary",
  "wide",
  "wry",
] as const;

const NOUNS = [
  "ask",
  "basis",
  "book",
  "chip",
  "curve",
  "desk",
  "draft",
  "edge",
  "file",
  "flow",
  "folio",
  "gate",
  "ledger",
  "line",
  "mark",
  "mint",
  "node",
  "note",
  "paper",
  "path",
  "plot",
  "pool",
  "port",
  "quote",
  "rail",
  "range",
  "ring",
  "signal",
  "spread",
  "stack",
  "stake",
  "tape",
  "thesis",
  "thread",
  "vault",
  "wave",
] as const;

function pick<T>(list: readonly T[]): T {
  return list[Math.floor(Math.random() * list.length)]!;
}

function titleCase(word: string) {
  return word.slice(0, 1).toUpperCase() + word.slice(1);
}

function suffix() {
  return String(1000 + Math.floor(Math.random() * 9000));
}

/** Reddit-style public name: two words plus a number. */
export function generateDisplayName() {
  return `${titleCase(pick(ADJECTIVES))} ${titleCase(pick(NOUNS))} ${suffix()}`;
}
