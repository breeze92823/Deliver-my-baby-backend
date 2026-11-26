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
