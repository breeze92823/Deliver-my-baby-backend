import { BABIES_MAX, BABY_NAME_MAX, COINS_MAX, COUNT_MAX, ID_PATTERN } from "./constants.js";
import type { PlayerDoc, SavedBaby } from "./db.js";

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
    if (name) out.push({ name, type: b.type });
  }
  return out;
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
  return out;
}

// What a stored doc sends back to its client (the save shape only, no server bookkeeping).
export function progressView(doc: PlayerDoc): Partial<PlayerDoc> {
  return sanitizeProgress(doc) ?? {};
}
