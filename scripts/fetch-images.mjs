// Saves product photos to public/products. Run: npm run images
import { mkdir, writeFile } from "node:fs/promises";
import { inventory } from "../src/data.js";

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
    await writeFile(new URL(`${p.id}.jpg`, dir), Buffer.from(await r.arrayBuffer()));
    console.log(`Saved ${p.short}`);
    saved = true;
    break;
  }
  if (!saved) console.warn(`No image found for ${p.short} (${p.id})`);
}
