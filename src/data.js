export const inventory = [
  {
    id: 622770,
    released: "2025-03-09",
    color: "#FF8FD0",
    short: "Prismatic Evolutions SPC",
    group: 23821,
    set: "Prismatic Evolutions",
    kind: "Super-Premium Collection",
    qty: 2,
    msrp: 99.99,
  },
  {
    id: 668497,
    released: "2026-01-30",
    color: "#7B5CFF",
    short: "Ascended Heroes ETB",
    group: 24541,
    set: "Ascended Heroes",
    kind: "Pokémon Center ETB",
    qty: 2,
    msrp: 59.99,
  },
  {
    id: 630687,
    released: "2025-07-18",
    color: "#9AA6C7",
    short: "Black Bolt ETB",
    group: 24325,
    set: "Black Bolt",
    kind: "Pokémon Center ETB",
    qty: 1,
    msrp: 59.99,
  },
  {
    id: 630688,
    released: "2025-07-18",
    color: "#FF9F45",
    short: "White Flare ETB",
    group: 24326,
    set: "White Flare",
    kind: "Pokémon Center ETB",
    qty: 1,
    msrp: 59.99,
  },
  {
    id: 654135,
    released: "2025-11-14",
    color: "#FF5A3C",
    short: "Phantasmal Flames ETB",
    group: 24448,
    set: "Phantasmal Flames",
    kind: "Pokémon Center ETB",
    qty: 2,
    msrp: 59.99,
  },
  {
    id: 644282,
    released: "2025-09-26",
    color: "#3FA2FF",
    short: "Mega Evolution ETB, Lucario",
    group: 24380,
    set: "Mega Evolution",
    kind: "Pokémon Center ETB · Lucario",
    qty: 1,
    msrp: 59.99,
  },
  {
    id: 648415,
    released: "2025-09-26",
    color: "#38E1B0",
    short: "Mega Evolution ETB, Gardevoir",
    group: 24380,
    set: "Mega Evolution",
    kind: "Pokémon Center ETB · Gardevoir",
    qty: 1,
    msrp: 59.99,
  },
  {
    id: 672404,
    released: "2026-03-27",
    color: "#FFD23F",
    short: "Perfect Order ETB",
    group: 24587,
    set: "Perfect Order",
    kind: "Pokémon Center ETB",
    qty: 2,
    msrp: 59.99,
  },
  {
    id: 672394,
    released: "2026-03-27",
    color: "#D99A1E",
    short: "Perfect Order booster box",
    group: 24587,
    set: "Perfect Order",
    kind: "Booster box · 36 packs",
    qty: 1,
    msrp: 161.64,
  },
];
export const cents = (n) => Math.round(n * 100);
export const cost =
  inventory.reduce((sum, p) => sum + cents(p.msrp) * p.qty, 0) / 100;
// Oldest release date
export const startedOn = inventory.reduce(
  (a, p) => (p.released < a ? p.released : a),
  inventory[0].released,
);
export const isOut = (p, date) => !date || date >= p.released;
// Unreleased products count at MSRP
export function total(prices, date) {
  if (
    inventory.some(
      (p) =>
        isOut(p, date) && (!Number.isFinite(prices[p.id]) || prices[p.id] <= 0),
    )
  )
    throw new Error("Incomplete price snapshot");
  return (
    inventory.reduce(
      (sum, p) => sum + cents(isOut(p, date) ? prices[p.id] : p.msrp) * p.qty,
      0,
    ) / 100
  );
}
export function changeSince(history, days) {
  if (!history.length) return null;
  const last = history.at(-1),
    target = new Date(last.date + "T00:00:00Z");
  target.setUTCDate(target.getUTCDate() - days);
  const date = target.toISOString().slice(0, 10);
  const base = history.find((p) => p.date === date);
  return base
    ? Math.round(
        (total(last.prices, last.date) - total(base.prices, base.date)) * 100,
      ) / 100
    : null;
}
