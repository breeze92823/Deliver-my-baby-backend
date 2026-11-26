import { schema, t, type SchemaType } from "@colyseus/schema";

// The live roster: every mom in the room, as the other clients draw them (client remote.js).
// Durable progress lives in Mongo (src/db.ts). To sync something new about a player, add a field
// here and accept it in a WorldRoom message (presence.ts bounds it).
export const PlayerState = schema(
  {
    username: t.string().default(""), // Bloxity display name (verified for signed-in players)
    signedIn: t.boolean().default(false), // verified Bloxity account: only these are saved
    uid: t.string().default(""), // verified Bloxity user id ("" = guest): matches chat messages to a mom
    pfp: t.string().default(""), // Bloxity profile picture URL ("" = none)
    // `pose`
    x: t.float32().default(0), // feet position, m
    y: t.float32().default(0),
    z: t.float32().default(0),
    yaw: t.float32().default(0), // facing, rad
    speed: t.float32().default(0), // ground speed, m/s (walk cycle)
    grounded: t.boolean().default(true),
    anim: t.string().default(""), // pose: "" | sit | phone | shock | ko | lie
    // `trip`
    zone: t.string().default("solo"), // street | lobby | waiting | breathing | ultrasound | final | solo
    // set by the server (lines.ts): the shared line they wait in ("" | a room id) and their ticket in
    // it (lower = sooner; 0 = not in a line)
    line: t.string().default(""),
    ticket: t.float64().default(0),
    hold: t.string().default(""), // the spot they use: "lobby:N" | "waiting:0" | ... | ""
    belly: t.boolean().default(true), // still expecting (the baby bump is drawn)
    twins: t.boolean().default(false), // twins pass: the bigger bump
    carry: t.string().default(""), // babies in their arms, "type:Name,type:Name" ("" = none)
    dex: t.uint8().default(0), // Babydex: baby types discovered (shown on the name tag)
    // set by the server: their game stopped (no `alive` beat for AWAY_AFTER_MS, an `away` message, or a
    // dropped connection waiting to reconnect). The others drop them from their lines + held spots.
    away: t.boolean().default(false),
    // set by the server: no player input for IDLE_AFTER_MS. Passed over in lines; their held spot counts as free.
    idle: t.boolean().default(false),
    // `emote` / `setAvatar`
    emote: t.string().default(""), // Bloxity emote id playing ("" = none)
    avatar: t.string().default(""), // Bloxity look JSON { equipped, proportions }, "" = default
  },
  "PlayerState",
);
export type PlayerState = SchemaType<typeof PlayerState>;

export const WorldState = schema(
  {
    players: t.map(PlayerState), // keyed by sessionId
  },
  "WorldState",
);
export type WorldState = SchemaType<typeof WorldState>;
