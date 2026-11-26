// Keep in step with the client's src/config.js by hand (Deliver My Baby).
// Players per room (WorldRoom's maxClients). The deploy sends no room size: Bloxity's seatCap
// defaults to 50, so the room holds the same 50 (2-100 for party play). Every player in a room is a
// mom the others see.
export const ROOM_MAX_CLIENTS = 50;

// Longest accepted strings.
export const NAME_MAX = 64;
// Profile picture URL (Bloxity `pfp`), relayed so other players can draw it.
export const PFP_MAX_LEN = 512;
// A Bloxity game token (JWT) from the client's join options / `identify`.
export const TOKEN_MAX_LEN = 4096;

// Presence (presence.ts): the Bloxity look JSON relayed for the others to draw (client NET.avatarMax:
// a longer look is sent without its proportions, or not at all, never cut mid-JSON), and the world
// bounds a pose is clamped to (|x|, |z| up to `xz` m, y between -`yDown` and `yUp`: the hospital
// rooms are built far out on x, roomOrigin in the client's hospital.js).
export const AVATAR_MAX_LEN = 8000;
export const POSE_BOUNDS = { xz: 8000, yDown: 200, yUp: 1000, speed: 60 };
// The shared lines, one per hospital room (client hospital.js ROOM_IDS, queue.js). A room is also
// a zone: everyone in it sees everyone else in it.
export const LINE_KINDS = ["lobby", "waiting", "breathing", "ultrasound", "final"] as const;
// Where a mom is: `street` (home, the street and the hospital forecourt: shared by everyone), a
// line room (shared by the moms in it), or `solo` (cutscenes, the ambulance ride, the delivery room:
// drawn for nobody else).
export const ZONES = ["street", ...LINE_KINDS, "solo"] as const;
// Lines are server-ordered (lines.ts): `joinLine` hands out a ticket (join order), `skipLine` moves
// it to the front, `cutLine` { kind, past } past the `past` real moms right ahead, `callMe` { kind,
// keys } sends one of the first CALL_DEPTH waiting moms to a free spot of that line (the spots the
// client offers, one each). Away / idle moms keep their ticket but are passed over, and the spots
// they hold count as free.
export const CALL_DEPTH = 3;
// The spot at the head of each line: the lobby's three check-in windows, one station elsewhere
// (the nurse, the coach's mat, the scanner, the delivery door): "lobby:0".."lobby:2", "waiting:0", ...
export const LINE_SPOTS: Record<(typeof LINE_KINDS)[number], RegExp> = {
  lobby: /^lobby:\d{1,2}$/,
  waiting: /^waiting:\d{1,2}$/,
  breathing: /^breathing:\d{1,2}$/,
  ultrasound: /^ultrasound:\d{1,2}$/,
  final: /^final:\d{1,2}$/,
};
// Most spot keys one call may offer.
export const SPOT_KEYS_MAX = 16;
// Most real moms one Cut Line may pass (the client's QUEUE.cutLinePlaces).
export const CUT_PAST_MAX = 10;
// A spot just handed out stays that player's this long even before their `trip` reports it.
export const SPOT_GRACE_MS = 4000;
// No `active` message (the player touched the keyboard / mouse / screen) for this long = idle: passed
// over in lines and their held spot counts as free. Only clients that have sent `active` once time out.
export const IDLE_AFTER_MS = 60_000;
// Animation poses the others play on a mom (client remote.js): sitting, on the phone, shocked,
// knocked out by a Kill, lying down.
export const ANIMS = ["", "sit", "phone", "shock", "ko", "lie"] as const;
// A spot a mom holds so no one else is sent to it: "lobby:2", "waiting:0".
export const HOLD_PATTERN = /^(lobby|waiting|breathing|ultrasound|final):\d{1,2}$/;
// What a mom carries home (client remote.js): "type:Name" per baby, comma separated.
// A shiny baby's type carries a trailing "*" ("golden*:Maple").
export const CARRY_PATTERN = /^([a-z]{1,16}\*?:[A-Za-z][A-Za-z ]{0,19})(,[a-z]{1,16}\*?:[A-Za-z][A-Za-z ]{0,19}){0,1}$/;

// Colyseus drops the whole connection for a WebSocket message above this (default 4 KB).
export const MAX_PAYLOAD_BYTES = 64 * 1024;

// The close reason a session gets when the same account joined again (another tab / device): its
// client (net.js) must not rejoin on its own, or the two would keep evicting each other. It takes
// over again only once its player comes back to that tab.
export const REPLACED_REASON = "replaced";

// How long a dropped connection (WiFi blip, backgrounded tab) may reconnect with the same session.
export const RECONNECT_SECONDS = 20;

// A player whose game has stopped (hidden / minimized tab, ad break, frozen, or a dropped connection
// waiting to reconnect) is marked `away`: the others take them out of their lines and held spots so
// nobody is stuck behind them. The client sends `alive` from its game loop every ~1 s; no beat for
// AWAY_AFTER_MS (checked every AWAY_CHECK_MS) = away.
export const AWAY_AFTER_MS = 5000;
export const AWAY_CHECK_MS = 1000;

// Saved progress bounds (client src/store.js snapshot()): coins, the twins pass, the babies (the
// latest BABIES_MAX, each { name, type }), trips and babies delivered (both only ever go up).
export const COINS_MAX = 1e12;
export const COUNT_MAX = 1e7;
export const BABIES_MAX = 300;
export const BABY_NAME_MAX = 20;
export const PLAY_SECONDS_MAX = 31_536_000; // ~1 year
// Daily Reward (client DAILY.days, daily.ts): days in one calendar cycle.
export const DAILY_DAYS = 7;
// Rare-baby announcements (`brag` -> `bragged` to everyone else): one per BRAG_COOLDOWN_MS per session.
export const BRAG_COOLDOWN_MS = 4000;
// The Babydex (client DEX in config.js): `dex` { [typeId]: { n: delivered, s: shiny } } for at most
// DEX_TYPES_MAX types, `dexClaimed` (the collection rewards taken: "t:<type>:<tier>", "r:<rarity>",
// "all"; at most DEX_CLAIMS_MAX), `pity` (deliveries since the last Epic or better, up to PITY_MAX).
export const DEX_TYPES_MAX = 64;
export const DEX_CLAIMS_MAX = 400;
export const DEX_CLAIM_PATTERN = /^(t:[a-z]{1,16}:[1-3]|r:[0-4]|all)$/;
export const PITY_MAX = 1000;
// Permanent upgrades (client UPGRADES in config.js): `upg` { [id]: level }, at most UPGRADES_MAX ids,
// each level up to UPGRADE_LEVEL_MAX (the client caps each at its own max).
export const UPGRADES_MAX = 32;
export const UPGRADE_LEVEL_MAX = 10;
// Nursery decorations owned (client DECOR ids), and Lucky Swaddle tokens held.
export const DECOR_MAX = 32;
export const SWADDLES_MAX = 99;
// Baby types in the client's catalog (characters.js BABY_TYPES): the "full Babydex" badge.
export const DEX_TOTAL = 24;

// Trolls (client: Kill / Kill All on real moms): one relayed troll per session every
// TROLL_COOLDOWN_MS (client NET.trollCooldown: it refuses a Kill before charging for it instead of
// sending one this would drop); the text (the target's session / the line) is cut to TROLL_TEXT_MAX.
export const TROLL_COOLDOWN_MS = 1000;
export const TROLL_TEXT_MAX = 80;
// Emotes (Bloxity catalogue ids) relayed to the others.
export const EMOTE_PATTERN = /^[A-Za-z0-9_-]{1,40}$/;

// Rewarded ads (client ADS.reward { coins, cooldown }): coins one verified ad grants, and the least
// time between two (the client waits it out before playing another ad, so a watched ad is never refused).
export const AD_REWARD_COINS = 40;
export const AD_REWARD_COOLDOWN_MS = 60 * 1000;

// Bloxity reporting (bloxity.ts): leaderboards and game stats go up every REPORT_EVERY_MS for the
// room's signed-in players (only what changed).
export const REPORT_EVERY_MS = 30 * 1000;
// Leaderboards (client LEADERBOARDS in config.js declares the same ids).
// `babies_week` is a `sum` board reset every Monday 00:00 UTC: each report adds the babies delivered
// since the last one. `earned` = lifetime coins earned (spending on upgrades never lowers it).
export const BOARDS = [
  { id: "babies", label: "Babies Delivered", order: "desc", mode: "best", format: "number", reset: "none" },
  { id: "babies_week", label: "Babies This Week", order: "desc", mode: "sum", format: "number", reset: "weekly" },
  { id: "trips", label: "Hospital Trips", order: "desc", mode: "best", format: "number", reset: "none" },
  { id: "earned", label: "Top Earners", order: "desc", mode: "best", format: "compact", reset: "none" },
  { id: "coins", label: "Richest Moms", order: "desc", mode: "latest", format: "compact", reset: "none" },
] as const;
// Game stats shown on the Bloxity game page.
export const STATS = [
  { key: "babies_delivered", label: "Babies delivered", type: "number", sortOrder: 1 },
  { key: "trips", label: "Hospital trips", type: "number", sortOrder: 2 },
  { key: "coins", label: "Coins", type: "currency", sortOrder: 3 },
  { key: "time_played", label: "Time played", type: "seconds", sortOrder: 4 },
] as const;

// Ids from the client's catalogs (baby types, troll ids).
export const ID_PATTERN = /^[A-Za-z0-9_-]{1,32}$/;

// The client's per-browser id for players who are not signed in to Bloxity. Guests are never saved.
export const GUEST_ID_PREFIX = "guest-";
// Local dev without the Bloxity SDK plays as `dev-...` (trusted only outside production, bloxity.ts).
export const DEV_ID_PREFIX = "dev-";

// Game badges (docs.bloxity.io "Game badges"): earned from the numbers the server already tracks.
// Max 50 per game; rarity common|uncommon|rare|epic|legendary. Badges pay no Gems or XP.
export const BADGES = [
  { key: "first_baby", name: "First Baby", description: "Deliver your first baby.", icon: "👶", rarity: "common", stat: "babies", at: 1 },
  { key: "babies_10", name: "Seasoned Mom", description: "Deliver 10 babies.", icon: "🍼", rarity: "uncommon", stat: "babies", at: 10 },
  { key: "babies_50", name: "Baby Factory", description: "Deliver 50 babies.", icon: "🏭", rarity: "rare", stat: "babies", at: 50 },
  { key: "babies_200", name: "Legendary Mom", description: "Deliver 200 babies.", icon: "👑", rarity: "legendary", stat: "babies", at: 200 },
  { key: "trips_10", name: "Frequent Visitor", description: "Make 10 hospital trips.", icon: "🏥", rarity: "common", stat: "trips", at: 10 },
  { key: "trips_100", name: "Hospital Regular", description: "Make 100 hospital trips.", icon: "🚑", rarity: "epic", stat: "trips", at: 100 },
  { key: "coins_10k", name: "Rich Mom", description: "Hold 10,000 coins.", icon: "💰", rarity: "rare", stat: "coins", at: 10_000 },
  { key: "dex_12", name: "Baby Collector", description: "Discover 12 kinds of baby in the Babydex.", icon: "📖", rarity: "rare", stat: "dex", at: 12 },
  { key: "dex_all", name: "Babydex Master", description: "Discover every kind of baby.", icon: "🌟", rarity: "legendary", stat: "dex", at: DEX_TOTAL },
  { key: "babies_500", name: "Baby Boom", description: "Deliver 500 babies.", icon: "🎉", rarity: "legendary", stat: "babies", at: 500 },
  { key: "trips_25", name: "Familiar Face", description: "Make 25 hospital trips.", icon: "🩺", rarity: "uncommon", stat: "trips", at: 25 },
  { key: "shiny_1", name: "Shiny Hunter", description: "Deliver a shiny baby.", icon: "✨", rarity: "rare", stat: "shinies", at: 1 },
  { key: "shiny_10", name: "Sparkle Collector", description: "Deliver 10 shiny babies.", icon: "💎", rarity: "epic", stat: "shinies", at: 10 },
  { key: "earned_100k", name: "Big Earner", description: "Earn 100,000 coins in total.", icon: "🏦", rarity: "epic", stat: "earned", at: 100_000 },
] as const;
