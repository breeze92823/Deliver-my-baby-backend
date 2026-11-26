import { BABIES_MAX, BABY_NAME_MAX, COINS_MAX, COUNT_MAX, DEX_CLAIM_PATTERN, DEX_CLAIMS_MAX, DECOR_MAX, DEX_TYPES_MAX, ID_PATTERN, PITY_MAX, SWADDLES_MAX, UPGRADE_LEVEL_MAX, UPGRADES_MAX } from "./constants.js";
import type { DexEntry, MissionsDoc, PlayerDoc, SavedBaby } from "./db.js";

export function finite(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
export function clampNum(v: number, max: number): number {
  return Math.min(max, Math.max(0, v));
}
export function clampInt(v: number, max: number, min = 0): number {
  return Math.min(max, Math.max(min, Math.floor(v)));
}
function isObject(v: unknown): v is Record<string, unknown> {
  return !!v && typeof v === "object" && !Array.isArray(v);
}
export const isId = (v: unknown): v is string => typeof v === "string" && ID_PATTERN.test(v);

// Babies { name, type }: a short printable name, a catalog type id; only the latest BABIES_MAX.
export function sanitizeBabies(raw: unknown): SavedBaby[] {
  if (!Array.isArray(raw)) return [];
  const out: SavedBaby[] = [];
  for (const b of raw.slice(-BABIES_MAX)) {
    if (!isObject(b) || !isId(b.type) || typeof b.name !== "string") continue;
    const name = b.name.replace(/[\u0000-\u001f<>]/g, "").trim().slice(0, BABY_NAME_MAX);
    if (name) out.push(b.shiny === true ? { name, type: b.type, shiny: true } : { name, type: b.type });
  }
  return out;
}

// The Babydex { [typeId]: { n, s } }: catalog ids only, counts bounded, shiny never above delivered.
// Built with fromEntries so an id like "__proto__" stays a plain key.
export function sanitizeDex(raw: unknown): Record<string, DexEntry> {
  if (!isObject(raw)) return {};
  const out: [string, DexEntry][] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (out.length >= DEX_TYPES_MAX) break;
    if (!isId(k) || !isObject(v) || !finite(v.n)) continue;
    const n = clampInt(v.n, COUNT_MAX);
    const s = finite(v.s) ? Math.min(n, clampInt(v.s, COUNT_MAX)) : 0;
    if (n > 0) out.push([k, { n, s }]);
  }
  return Object.fromEntries(out);
}

// Upgrade levels { [id]: level }: catalog ids, whole levels 1..UPGRADE_LEVEL_MAX.
export function sanitizeUpgrades(raw: unknown): Record<string, number> {
  if (!isObject(raw)) return {};
  const out: [string, number][] = [];
  for (const [k, v] of Object.entries(raw)) {
    if (out.length >= UPGRADES_MAX) break;
    if (!isId(k) || !finite(v)) continue;
    const lvl = clampInt(v, UPGRADE_LEVEL_MAX);
    if (lvl > 0) out.push([k, lvl]);
  }
  return Object.fromEntries(out);
}

// Daily missions (client missions.js): up to MISSIONS_MAX catalog ids with bounded progress.
const MISSIONS_MAX = 5;
export function sanitizeMissions(raw: unknown): MissionsDoc | undefined {
  if (!isObject(raw) || !finite(raw.day) || !Array.isArray(raw.ids)) return undefined;
  const prog = Array.isArray(raw.prog) ? raw.prog : [];
  const claimed = Array.isArray(raw.claimed) ? raw.claimed : [];
  // Each id keeps its own progress / claim (pairs are dropped together, never shifted).
  const keep = raw.ids.map((id, i) => ({ id, p: prog[i], c: claimed[i] })).filter((m) => isId(m.id)).slice(0, MISSIONS_MAX);
  return {
    day: clampInt(raw.day, 1e6),
    ids: keep.map((m) => m.id as string),
    prog: keep.map((m) => (finite(m.p) ? clampInt(m.p, COUNT_MAX) : 0)),
    claimed: keep.map((m) => m.c === true),
    bonus: raw.bonus === true,
  };
}

// The Babydex rewards taken: known claim keys only, each once.
export function sanitizeClaims(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const out = new Set<string>();
  for (const c of raw) {
    if (out.size >= DEX_CLAIMS_MAX) break;
    if (typeof c === "string" && DEX_CLAIM_PATTERN.test(c)) out.add(c);
  }
  return [...out];
}

// The game is client-authoritative -- no server-side gameplay validation. What IS enforced:
// shape and bounds, so a malformed payload can never corrupt this player's own Mongo document.
// A forged number can only ever affect the sender's own save.
export function sanitizeProgress(raw: unknown): Partial<PlayerDoc> | null {
  if (!isObject(raw)) return null;
  const out: Partial<PlayerDoc> = {};
  if (finite(raw.coins)) out.coins = clampInt(raw.coins, COINS_MAX);
  if (typeof raw.twins === "boolean") out.twins = raw.twins;
  if (raw.babies !== undefined) out.babies = sanitizeBabies(raw.babies);
  if (finite(raw.trips)) out.trips = clampInt(raw.trips, COUNT_MAX);
  if (finite(raw.delivered)) out.delivered = clampInt(raw.delivered, COUNT_MAX);
  if (raw.dex !== undefined) out.dex = sanitizeDex(raw.dex);
  if (raw.dexClaimed !== undefined) out.dexClaimed = sanitizeClaims(raw.dexClaimed);
  if (finite(raw.pity)) out.pity = clampInt(raw.pity, PITY_MAX);
  if (raw.upg !== undefined) out.upg = sanitizeUpgrades(raw.upg);
  if (finite(raw.earned)) out.earned = clampInt(raw.earned, COINS_MAX);
  if (finite(raw.swaddles)) out.swaddles = clampInt(raw.swaddles, SWADDLES_MAX);
  if (Array.isArray(raw.decor)) out.decor = [...new Set(raw.decor.filter(isId))].slice(0, DECOR_MAX) as string[];
  const missions = sanitizeMissions(raw.missions);
  if (missions) out.missions = missions;
  return out;
}

// What a stored doc sends back to its client (the save shape only, no server bookkeeping).
export function progressView(doc: PlayerDoc): Partial<PlayerDoc> {
  return sanitizeProgress(doc) ?? {};
}
