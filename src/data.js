export const inventory = [
  {
    id: 622770,
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
export function total(prices) {
  if (
    inventory.some((p) => !Number.isFinite(prices[p.id]) || prices[p.id] <= 0)
  )
    throw new Error("Incomplete price snapshot");
  return (
    inventory.reduce((sum, p) => sum + cents(prices[p.id]) * p.qty, 0) / 100
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
    ? Math.round((total(last.prices) - total(base.prices)) * 100) / 100
    : null;
}
