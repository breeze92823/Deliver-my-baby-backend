import assert from "assert";

import { BABIES_MAX, BABY_NAME_MAX, COINS_MAX, COUNT_MAX } from "../src/constants.js";
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
});
