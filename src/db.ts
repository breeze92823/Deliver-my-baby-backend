import { MongoClient, type Collection } from "mongodb";

// Bloxity Legion hosting injects MONGODB_URI per game+channel -- an isolated database with
// scoped credentials. A local `npm start` normally has no Mongo reachable, so a missing or
// unreachable URI must degrade to "no persistence" rather than crash the room.

// A signed-in player's saved progress (client src/store.js snapshot(), bounded by sanitize.ts).
export interface PlayerDoc {
  _id: string; // Bloxity user id, verified with Bloxity (bloxity.ts). Guests are never saved.
  username?: string; // display name as of the last save
  coins?: number;
  twins?: boolean; // the twins pass: every delivery brings two babies
  babies?: SavedBaby[]; // the latest BABIES_MAX babies, oldest first (the home crib shows the last ones)
  trips?: number; // hospital trips finished (a delivery), only ever goes up
  delivered?: number; // babies delivered in total, only ever goes up
  dex?: Record<string, DexEntry>; // the Babydex: every baby type ever delivered (not cut like `babies`)
  dexClaimed?: string[]; // Babydex rewards already taken ("t:dino:1", "r:0", "all")
  pity?: number; // deliveries since the last Epic or better baby
  upg?: Record<string, number>; // permanent upgrade levels by id (bought with coins)
  earned?: number; // lifetime coins earned, only ever goes up ($max)
  swaddles?: number; // Lucky Swaddle tokens (day-7 Daily Reward): the next baby is Rare or better
  decor?: string[]; // nursery decorations owned (client decor.js ids)
  missions?: MissionsDoc; // today's daily missions (client-run, on the server's UTC day)
  // Daily Reward (daily.ts): written by the server only, never by saveProgress.
  dailyDay?: number;
  dailyLast?: number;
  dailyClaimed?: number[];
  playtime?: number; // s connected, counted by the server
  lastSeen?: number; // epoch ms of the last activity
  // Rewarded ads: epoch ms of the last verified reward (written by the server only).
  adAt?: number;
  version: number;
  updatedAt: Date;
}

// One baby: the name picked at check-in and its type (client characters.js BABY_TYPES id).
export interface SavedBaby {
  name: string;
  type: string;
  shiny?: true;
}

// Daily missions: the UTC day they are for, their ids, progress and which were claimed (+ the bonus chest).
export interface MissionsDoc {
  day: number;
  ids: string[];
  prog: number[];
  claimed: boolean[];
  bonus: boolean;
}

// One Babydex entry: babies of that type delivered, and how many of them were shiny.
export interface DexEntry {
  n: number;
  s: number;
}

let client: MongoClient | null = null;
let players: Collection<PlayerDoc> | null = null;

export async function connectDb(): Promise<void> {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.warn("[db] MONGODB_URI not set -- player progress will not persist");
    return;
  }
  try {
    client = new MongoClient(uri);
    await client.connect();
    // No dbName passed to .db() -- the injected URI already points at this game+channel's database.
    players = client.db().collection<PlayerDoc>("players");
    console.log("[db] connected to MongoDB");
  } catch (err) {
    console.warn("[db] connect failed -- player progress will not persist:", err);
    client = null;
    players = null;
  }
}

// Null whenever Mongo is unset/unreachable -- every caller must treat that as "skip persistence".
export function getPlayers(): Collection<PlayerDoc> | null {
  return players;
}

// Test-only seam: exercise the save/load logic against an in-memory fake collection.
export function __setPlayersForTest(fake: Collection<PlayerDoc> | null): void {
  players = fake;
}
