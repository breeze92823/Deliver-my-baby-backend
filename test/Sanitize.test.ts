import assert from "assert";

import { BABIES_MAX, BABY_NAME_MAX, COINS_MAX, COUNT_MAX, DEX_CLAIMS_MAX, DEX_TYPES_MAX, PITY_MAX, UPGRADE_LEVEL_MAX } from "../src/constants.js";
import { sanitizeProgress } from "../src/sanitize.js";

describe("sanitizeProgress", () => {
  it("rejects non-objects and bounds numbers", () => {
    assert.strictEqual(sanitizeProgress(null), null);
    assert.strictEqual(sanitizeProgress([1]), null);
    const out = sanitizeProgress({ coins: 1e40, trips: 2.7, delivered: -2, twins: "yes", hack: "x", trophies: 5 })!;
    assert.strictEqual(out.coins, COINS_MAX);
    assert.strictEqual(out.trips, 2);
    assert.strictEqual(out.delivered, 0);
    assert.ok(!("twins" in out), "a non-boolean twins pass is dropped");
    assert.ok(!("hack" in out));
    assert.ok(!("trophies" in out), "fields of other games are dropped");
    assert.strictEqual(sanitizeProgress({ trips: 1e20 })!.trips, COUNT_MAX);
  });

  it("keeps the latest babies, well-formed only", () => {
    const many = Array.from({ length: BABIES_MAX + 5 }, (_, i) => ({ name: `Bean${i}`, type: "dino" }));
    const out = sanitizeProgress({ twins: true, babies: many })!;
    assert.strictEqual(out.twins, true);
    assert.strictEqual(out.babies!.length, BABIES_MAX);
    assert.strictEqual(out.babies![BABIES_MAX - 1].name, `Bean${BABIES_MAX + 4}`, "the newest are kept");
    const odd = sanitizeProgress({ babies: [{ name: "  <Pickle>\u0007 ", type: "royal" }, { name: "x".repeat(99), type: "golden" }, { name: "Bad", type: "no type!" }, { name: "", type: "dino" }, "Bean", null] })!;
    assert.deepStrictEqual(odd.babies, [{ name: "Pickle", type: "royal" }, { name: "x".repeat(BABY_NAME_MAX), type: "golden" }]);
  });

  it("keeps a baby's shiny flag only when it is true", () => {
    const out = sanitizeProgress({ babies: [{ name: "Bean", type: "dino", shiny: true }, { name: "Pea", type: "dino", shiny: "yes" }] })!;
    assert.deepStrictEqual(out.babies, [{ name: "Bean", type: "dino", shiny: true }, { name: "Pea", type: "dino" }]);
  });

  it("bounds the Babydex, its claims and the pity counter", () => {
    const out = sanitizeProgress({
      dex: { dino: { n: 3.9, s: 9 }, golden: { n: 1e20, s: 2 }, "bad id!": { n: 2, s: 0 }, royal: { n: 0, s: 0 }, chef: "x", ["__proto__"]: { n: 1, s: 0 } },
      dexClaimed: ["t:dino:1", "t:dino:1", "r:4", "all", "t:dino:9", "r:7", 5, "hack"],
      pity: 1e9,
    })!;
    assert.deepStrictEqual(out.dex!.dino, { n: 3, s: 3 }, "shiny never above delivered");
    assert.deepStrictEqual(out.dex!.golden, { n: COUNT_MAX, s: 2 });
    assert.ok(!("bad id!" in out.dex!) && !("royal" in out.dex!) && !("chef" in out.dex!));
    assert.strictEqual(Object.getPrototypeOf(out.dex), Object.prototype, "a __proto__ key never swaps the prototype");
    assert.deepStrictEqual(out.dexClaimed, ["t:dino:1", "r:4", "all"]);
    assert.strictEqual(out.pity, PITY_MAX);
    const many = Object.fromEntries(Array.from({ length: DEX_TYPES_MAX + 9 }, (_, i) => [`t${i}`, { n: 1, s: 0 }]));
    assert.strictEqual(Object.keys(sanitizeProgress({ dex: many })!.dex!).length, DEX_TYPES_MAX);
    const claims = Array.from({ length: 30 }, (_, i) => `r:${i % 5}`).concat(Array.from({ length: DEX_CLAIMS_MAX + 9 }, (_, i) => `t:a${String.fromCharCode(97 + (i % 26))}${String.fromCharCode(97 + Math.floor(i / 26) % 26)}:1`));
    assert.ok(sanitizeProgress({ dexClaimed: claims })!.dexClaimed!.length <= DEX_CLAIMS_MAX);
    assert.ok(!("dex" in sanitizeProgress({ coins: 1 })!), "an old client's save leaves the Babydex alone");
  });

  it("bounds the upgrade levels", () => {
    const out = sanitizeProgress({ upg: { shoes: 2.8, lucky: 99, magnet: 0, "bad id!": 3, shield: "3", ["__proto__"]: 2 } })!;
    assert.deepStrictEqual(out.upg, { shoes: 2, lucky: UPGRADE_LEVEL_MAX, ["__proto__"]: 2 });
    assert.strictEqual(Object.getPrototypeOf(out.upg), Object.prototype, "a __proto__ key never swaps the prototype");
    assert.deepStrictEqual(sanitizeProgress({ upg: [1, 2] })!.upg, {});
  });

  it("bounds lifetime earnings and the daily missions", () => {
    assert.strictEqual(sanitizeProgress({ earned: 12.9 })!.earned, 12);
    const out = sanitizeProgress({ missions: { day: 20500, ids: ["deliver2", "bad id!", "perfect5"], prog: [1, 99, 4], claimed: [true, true, "yes"], bonus: 1 } })!;
    assert.deepStrictEqual(out.missions, { day: 20500, ids: ["deliver2", "perfect5"], prog: [1, 4], claimed: [true, false], bonus: false }, "each id keeps its own progress");
    assert.ok(!("missions" in sanitizeProgress({ missions: { ids: [] } })!), "no day: dropped");
  });

  it("bounds swaddle tokens and the nursery decorations", () => {
    const out = sanitizeProgress({ swaddles: 1e6, decor: ["nightlight", "nightlight", "bad id!", 3, "train"] })!;
    assert.strictEqual(out.swaddles, 99);
    assert.deepStrictEqual(out.decor, ["nightlight", "train"]);
  });
});
