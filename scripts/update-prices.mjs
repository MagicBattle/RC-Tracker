import { readFile, writeFile, mkdir, rename } from "node:fs/promises";
import { inventory, total } from "../src/data.js";
const root = new URL("../public/data/", import.meta.url);
async function get(path) {
  const response = await fetch("https://tcgcsv.com/tcgplayer/3/" + path, {
    headers: { "User-Agent": "RC-Tracker/1.0", Accept: "application/json" },
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) throw new Error(`Price source returned ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data.results)) throw new Error("Invalid price response");
  return data;
}
const prices = {},
  sources = [];
for (const group of [...new Set(inventory.map((p) => p.group))]) {
  const data = await get(group + "/prices");
  for (const product of inventory.filter((p) => p.group === group)) {
    const row = data.results.find(
      (p) => p.productId === product.id && p.subTypeName === "Normal",
    );
    if (!row || !Number.isFinite(row.marketPrice) || row.marketPrice <= 0)
      throw new Error(`No market price for ${product.id}`);
    prices[product.id] = row.marketPrice;
  }
  sources.push({ group, updatedAt: data.modifiedOn ?? null });
}
total(prices);
await mkdir(root, { recursive: true });
let history = [];
try {
  history = JSON.parse(
    await readFile(new URL("history.json", root), "utf8"),
  ).history;
} catch (e) {
  if (e.code !== "ENOENT") throw e;
}
const fetchedAt = new Date().toISOString();
const date = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Los_Angeles",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());
const snapshot = { date, fetchedAt, prices, sources };
history = history
  .filter((p) => p.date !== date)
  .concat(snapshot)
  .sort((a, b) => a.date.localeCompare(b.date));
const output = {
  source: "TCGplayer market via TCGCSV",
  sourceUrl: "https://tcgcsv.com/",
  openedOn: "2026-08-19",
  history,
};
await writeFile(
  new URL("history.tmp", root),
  JSON.stringify(output, null, 2) + "\n",
);
await rename(new URL("history.tmp", root), new URL("history.json", root));
console.log(
  `Saved ${date}: ${inventory.length} products, sealed value $${total(prices).toFixed(2)}`,
);
