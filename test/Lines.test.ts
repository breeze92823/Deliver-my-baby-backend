import assert from "assert";
import type { ColyseusTestServer } from "@colyseus/testing";

import type appConfig from "../src/app.config.js";
import { WorldState } from "../src/rooms/schema/WorldState.js";
import { CALL_DEPTH, SPOT_GRACE_MS } from "../src/constants.js";
import { Lines } from "../src/lines.js";
import { PlayerState } from "../src/rooms/schema/WorldState.js";
import { sleep } from "./fakePlayers.js";
import { testServer } from "./server.js";

// A plain roster for the unit tests (WorldRoom hands its MapSchema to Lines).
function roster(...ids: string[]) {
  const m = new Map<string, PlayerState>();
  for (const id of ids) m.set(id, new PlayerState());
  return m;
}

describe("lines (server-ordered queues)", () => {
  it("orders by join time, skipLine goes to the front", () => {
    const r = roster("a", "b", "c");
    const L = new Lines(r);
    L.join("a", "lobby");
    L.join("b", "lobby");
    L.join("c", "lobby");
    L.join("a", "lobby"); // already in it: keeps the place
    assert.deepStrictEqual(L.order("lobby"), ["a", "b", "c"]);
    L.skip("c", "lobby");
    assert.deepStrictEqual(L.order("lobby"), ["c", "a", "b"]);
    L.skip("b", "waiting"); // not in that line
    assert.deepStrictEqual(L.order("lobby"), ["c", "a", "b"]);
    L.leave("a");
    assert.deepStrictEqual(L.order("lobby"), ["c", "b"]);
    assert.strictEqual(r.get("a")!.ticket, 0);
    L.join("x", "ambulance");
    L.join("b", "ambulance");
    assert.strictEqual(r.get("b")!.line, "lobby", "unknown lines are ignored");
  });

  it("calls only the front moms, one free spot each", () => {
    const r = roster("a", "b", "c", "d");
    const L = new Lines(r);
    for (const id of ["a", "b", "c", "d"]) L.join(id, "lobby");
    assert.strictEqual(L.call("b", "lobby", ["lobby:0"]), "", "one free lobby: only the first");
    assert.strictEqual(L.call("a", "lobby", ["lobby:0", "lobby:1"]), "lobby:0");
    assert.strictEqual(r.get("a")!.line, "");
    assert.strictEqual(r.get("a")!.hold, "lobby:0");
    assert.strictEqual(L.call("b", "lobby", ["lobby:0"]), "", "desk 0 was just handed to a");
    assert.strictEqual(L.call("c", "lobby", ["lobby:1", "lobby:2"]), "lobby:1", "2nd in line with 2 free desks");
    assert.strictEqual(L.call("b", "lobby", ["waiting:2", "final:0", 5, "lobby:2"]), "lobby:2", "only this line's spots count");
    assert.strictEqual(L.call("d", "lobby", ["lobby:9"]), "lobby:9");
    assert.strictEqual(L.call("d", "lobby", ["lobby:8"]), "", "not in the line any more");
  });

  it("never calls further back than CALL_DEPTH", () => {
    const ids = Array.from({ length: CALL_DEPTH + 2 }, (_, i) => `p${i}`);
    const r = roster(...ids);
    const L = new Lines(r);
    for (const id of ids) L.join(id, "waiting");
    const keys = Array.from({ length: 8 }, (_, i) => `waiting:${i}`);
    assert.strictEqual(L.call(ids[CALL_DEPTH], "waiting", keys), "");
    assert.notStrictEqual(L.call(ids[CALL_DEPTH - 1], "waiting", keys), "");
  });

  it("passes over away / idle moms and frees what they hold", () => {
    const r = roster("a", "b", "c");
    const L = new Lines(r);
    L.join("a", "final");
    L.join("b", "final");
    r.get("a")!.away = true;
    assert.deepStrictEqual(L.order("final"), ["b"]);
    assert.strictEqual(L.call("a", "final", ["final:0"]), "", "away: never called");
    assert.strictEqual(L.call("b", "final", ["final:0"]), "final:0");
    // b goes idle at the scanner (after their grant ran out): c may use it.
    L.join("c", "final");
    assert.strictEqual(L.call("c", "final", ["final:0"]), "", "b holds it");
    r.get("b")!.idle = true;
    assert.strictEqual(L.call("c", "final", ["final:0"]), "final:0");
    // a comes back: still holds the ticket from before.
    r.get("a")!.away = false;
    assert.deepStrictEqual(L.order("final"), ["a"]);
  });

  it("cuts past the given number of real moms right ahead", () => {
    const r = roster("a", "b", "c", "d");
    const L = new Lines(r);
    for (const id of ["a", "b", "c", "d"]) L.join(id, "lobby");
    L.cut("d", "lobby", 1);
    assert.deepStrictEqual(L.order("lobby"), ["a", "b", "d", "c"]);
    L.cut("d", "lobby", 5); // more than are ahead: to the front
    assert.deepStrictEqual(L.order("lobby"), ["d", "a", "b", "c"]);
    L.cut("c", "lobby", 0); // nothing to pass
    L.cut("c", "lobby", "2");
    L.cut("c", "waiting", 2); // not in that line
    assert.deepStrictEqual(L.order("lobby"), ["d", "a", "b", "c"]);
    L.cut("c", "lobby", 2);
    assert.deepStrictEqual(L.order("lobby"), ["d", "c", "a", "b"]);
  });

  it("keeps a granted spot for the grace time, then follows the roster", () => {
    const r = roster("a", "b");
    const L = new Lines(r);
    L.join("a", "waiting");
    assert.strictEqual(L.call("a", "waiting", ["waiting:0"], 1000), "waiting:0");
    r.get("a")!.hold = ""; // a stale trip from a, before it knew
    L.join("b", "waiting");
    assert.strictEqual(L.call("b", "waiting", ["waiting:0"], 1000 + SPOT_GRACE_MS - 1), "");
    assert.strictEqual(L.call("b", "waiting", ["waiting:0"], 1000 + SPOT_GRACE_MS + 1), "waiting:0", "a never reported it: free again");
  });
});

describe("lines in the room", () => {
  let colyseus: ColyseusTestServer<typeof appConfig>;
  before(async () => (colyseus = await testServer()));
  beforeEach(async () => await colyseus.cleanup());

  it("joins, calls and syncs the order to everyone", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    const b = await colyseus.connectTo(room, { userId: "guest-b" });
    await sleep(50);
    a.send("joinLine", { kind: "lobby" });
    await sleep(20);
    b.send("joinLine", { kind: "lobby" });
    await sleep(80);
    const pa = room.state.players.get(a.sessionId)!;
    const pb = room.state.players.get(b.sessionId)!;
    assert.strictEqual(pa.line, "lobby");
    assert.ok(pa.ticket > 0 && pa.ticket < pb.ticket);
    // a trip can't move anyone out of (or into) a line
    b.send("trip", { line: "" });
    await sleep(50);
    assert.strictEqual(pb.line, "lobby");

    const calledB = new Promise<{ kind: string; key: string }>((res) => b.onMessage("called", res));
    b.send("callMe", { kind: "lobby", keys: ["lobby:3"] });
    assert.deepStrictEqual(await calledB, { kind: "lobby", key: "" }, "b is second with one desk");
    const calledA = new Promise<{ kind: string; key: string }>((res) => a.onMessage("called", res));
    a.send("callMe", { kind: "lobby", keys: ["lobby:3"] });
    assert.deepStrictEqual(await calledA, { kind: "lobby", key: "lobby:3" });
    await sleep(50);
    assert.strictEqual(pa.hold, "lobby:3");
    assert.strictEqual(pa.line, "");
    // what b's client sees
    await sleep(50);
    const seen = b.state.players.get(a.sessionId)!;
    assert.strictEqual(seen.hold, "lobby:3");
    assert.strictEqual(b.state.players.get(b.sessionId)!.ticket, pb.ticket);
  });

  it("cuts the line through the room and drops a leaver from it", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    const b = await colyseus.connectTo(room, { userId: "guest-b" });
    await sleep(50);
    a.send("joinLine", { kind: "breathing" });
    await sleep(20);
    b.send("joinLine", { kind: "breathing" });
    await sleep(50);
    b.send("cutLine", { kind: "breathing", past: 1 });
    await sleep(50);
    assert.deepStrictEqual((room as any).lines.order("breathing"), [b.sessionId, a.sessionId]);
    await b.leave(true);
    await sleep(80);
    assert.deepStrictEqual((room as any).lines.order("breathing"), [a.sessionId]);
  });

  it("flags idle players only after they sent input once", async () => {
    const room = await colyseus.createRoom<WorldState>("world", {});
    const a = await colyseus.connectTo(room, { userId: "guest-a" });
    await sleep(50);
    const p = room.state.players.get(a.sessionId)!;
    p.idle = true;
    a.send("active", {});
    await sleep(60);
    assert.strictEqual(p.idle, false);
  });
});
