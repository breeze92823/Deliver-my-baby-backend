import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { __setPlayersForTest } from "../src/db.js";
import { TROLL_TEXT_MAX } from "../src/constants.js";
import { sanitizeProgress } from "../src/sanitize.js";
import { fakePlayers, sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

describe("troll relay", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());
  afterEach(() => __setPlayersForTest(null));

  it("relays a troll to everyone else, bounded and rate-limited", async () => {
    const fake = fakePlayers();
    __setPlayersForTest(fake);
    fake.release();
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a", username: "Ann" });
    const b = await colyseus.connectTo(room, { userId: "guest-b", username: "Bob" });
    const gotA: any[] = [];
    const gotB: any[] = [];
    for (const c of [a, b]) {
      c.onMessage("noProgress", () => {});
    }
    a.onMessage("trolled", (m: any) => gotA.push(m));
    b.onMessage("trolled", (m: any) => gotB.push(m));
    await sleep(100);

    a.send("troll", { id: "killAll", text: `hi\u0007${"x".repeat(200)}` });
    a.send("troll", { id: "kill" }); // inside the cooldown: dropped
    b.send("troll", { id: "not an id!" }); // bad id: dropped
    await sleep(150);
    assert.strictEqual(gotA.length, 0, "the sender does not get its own troll back");
    assert.strictEqual(gotB.length, 1);
    assert.strictEqual(gotB[0].id, "killAll");
    assert.strictEqual(gotB[0].sid, a.sessionId, "who sent it, to check the line order");
    assert.strictEqual(gotB[0].from, "Ann");
    assert.strictEqual(gotB[0].text.length, TROLL_TEXT_MAX);
    assert.ok(gotB[0].text.startsWith("hi x"));

    b.send("troll", { id: "kill" });
    await sleep(150);
    assert.deepStrictEqual(gotA.map((m) => m.id), ["kill"]);
    assert.strictEqual(gotA[0].text, "");
  });

  it("relays a rare-baby brag to everyone else, bounded and rate-limited", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { username: "Ann" });
    const b = await colyseus.connectTo(room, { username: "Bea" });
    for (const x of [a, b]) x.onMessage("noProgress", () => {});
    const got: any[] = [];
    const mine: any[] = [];
    b.onMessage("bragged", (m: any) => got.push(m));
    a.onMessage("bragged", (m: any) => mine.push(m));
    await sleep(100);
    a.send("brag", { type: "golden", shiny: true, rarity: 4 });
    a.send("brag", { type: "cosmic", shiny: false, rarity: 4 }); // too soon
    await sleep(150);
    assert.deepStrictEqual(got, [{ from: "Ann", type: "golden", shiny: true, rarity: 4 }]);
    assert.strictEqual(mine.length, 0, "never echoed to the sender");
    b.send("brag", { type: "bad type!", rarity: 4 });
    b.send("brag", { type: "dino", rarity: 9 });
    await sleep(150);
    assert.strictEqual(mine.length, 0, "malformed brags are dropped");
  });
});
