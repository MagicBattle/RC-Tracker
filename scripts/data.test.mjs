import test from "node:test";
import assert from "node:assert/strict";
import { inventory, cost, total, changeSince, startedOn } from "../src/data.js";
const prices = Object.fromEntries(inventory.map((p) => [p.id, 100]));
test("inventory includes thirteen boxes and reconciles MSRP", () => {
  assert.equal(
    inventory.reduce((n, p) => n + p.qty, 0),
    13,
  );
  assert.equal(cost, 961.52);
  assert.equal(total(prices), 1300);
});
test("missing or invalid prices cannot produce a partial total", () => {
  assert.throws(() => total({}));
  assert.throws(() => total({ ...prices, 622770: 0 }));
});
test("changes require an actual comparison date and allow falling prices", () => {
  const history = [
    { date: "2026-10-25", prices },
    { date: "2026-11-01", prices: { ...prices, 622770: 90 } },
  ];
  assert.equal(changeSince(history, 7), -20);
  assert.equal(changeSince(history, 1), null);
  assert.equal(changeSince([], 365), null);
});
test("products not out yet count at MSRP", () => {
  assert.equal(startedOn, "2025-03-09");
  const early = { 622770: 500 };
  assert.equal(total(early, "2025-03-09"), 961.52 - 99.99 * 2 + 1000);
  assert.throws(() => total(early, "2025-07-18"));
});
