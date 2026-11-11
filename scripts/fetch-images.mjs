// Saves product photos and card art. Run: npm run images
import { mkdir, writeFile } from "node:fs/promises";
import { inventory, cards } from "../src/data.js";

const dir = new URL("../public/products/", import.meta.url);
await mkdir(dir, { recursive: true });

for (const p of inventory) {
  const urls = [
    `https://tcgplayer-cdn.tcgplayer.com/product/${p.id}_in_1000x1000.jpg`,
    `https://tcgplayer-cdn.tcgplayer.com/product/${p.id}_400w.jpg`,
  ];
  let saved = false;
  for (const url of urls) {
    const r = await fetch(url).catch(() => null);
    if (!r?.ok) continue;
    await writeFile(
      new URL(`${p.id}.jpg`, dir),
      Buffer.from(await r.arrayBuffer()),
    );
    console.log(`Saved ${p.short}`);
    saved = true;
    break;
  }
  if (!saved) console.warn(`No image found for ${p.short} (${p.id})`);
}

const cardDir = new URL("../public/cards/", import.meta.url);
await mkdir(cardDir, { recursive: true });
for (const id of cards) {
  const r = await fetch(
    `https://tcgplayer-cdn.tcgplayer.com/product/${id}_400w.jpg`,
  );
  if (!r.ok) {
    console.warn(`No image for card ${id}`);
    continue;
  }
  await writeFile(
    new URL(`${id}.jpg`, cardDir),
    Buffer.from(await r.arrayBuffer()),
  );
  console.log(`Saved card ${id}`);
}
