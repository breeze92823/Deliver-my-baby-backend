import { ANIMS, AVATAR_MAX_LEN, CARRY_PATTERN, EMOTE_PATTERN, HOLD_PATTERN, POSE_BOUNDS, ZONES } from "./constants.js";
import type { PlayerState } from "./rooms/schema/WorldState.js";

// Presence: what the other clients need to draw a player as a fellow mom (client remote.js).
// Relayed through the roster as sent, only bounded here -- like the rest of the game it is
// client-authoritative and purely cosmetic.

const finite = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const oneOf = <T extends readonly string[]>(list: T, v: unknown): v is T[number] => typeof v === "string" && (list as readonly string[]).includes(v);

// `pose` { x, y, z, yaw, speed, grounded, anim }: feet position (m), heading (rad), ground speed
// (m/s), on the ground or not, and the pose overlay ("" | sit | phone | shock | ko | lie). ~10 a second.
export function applyPose(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  const b = POSE_BOUNDS;
  if (finite(m.x)) p.x = clamp(m.x, -b.xz, b.xz);
  if (finite(m.y)) p.y = clamp(m.y, -b.yDown, b.yUp);
  if (finite(m.z)) p.z = clamp(m.z, -b.xz, b.xz);
  if (finite(m.yaw)) p.yaw = Math.atan2(Math.sin(m.yaw), Math.cos(m.yaw));
  if (finite(m.speed)) p.speed = clamp(m.speed, 0, b.speed);
  if (typeof m.grounded === "boolean") p.grounded = m.grounded;
  if (oneOf(ANIMS, m.anim)) p.anim = m.anim;
}

// `trip` { zone, hold, belly, twins, carry }: where the mom is and what the others draw on her.
// zone street | a line room | solo (drawn for nobody), line (ignored: the server sets it, lines.ts),
// hold = the spot at the head of a line she uses, belly (still expecting), twins (the bigger bump),
// carry = the babies in her arms ("type:Name", comma separated, at most two).
export function applyTrip(p: PlayerState, msg: unknown): void {
  if (!msg || typeof msg !== "object") return;
  const m = msg as Record<string, unknown>;
  if (oneOf(ZONES, m.zone)) p.zone = m.zone;
  // `line` is server-owned (joinLine / leaveLine, lines.ts): a trip's `line` is ignored.
  if (m.hold === "" || (typeof m.hold === "string" && HOLD_PATTERN.test(m.hold))) p.hold = m.hold as string;
  if (typeof m.belly === "boolean") p.belly = m.belly;
  if (typeof m.twins === "boolean") p.twins = m.twins;
  if (m.carry === "" || (typeof m.carry === "string" && CARRY_PATTERN.test(m.carry))) p.carry = m.carry as string;
}

// `emote` { id }: a Bloxity emote the mom plays ("" = stopped).
export function applyEmote(p: PlayerState, msg: unknown): void {
  const id = (msg as { id?: unknown })?.id;
  if (id === "" || (typeof id === "string" && EMOTE_PATTERN.test(id))) p.emote = id as string;
}

// `setAvatar` { avatar }: the Bloxity look as an opaque JSON string ("" = default), length-capped.
export function applyAvatar(p: PlayerState, msg: unknown): void {
  const a = (msg as { avatar?: unknown })?.avatar;
  if (typeof a === "string" && a.length <= AVATAR_MAX_LEN) p.avatar = a;
}
