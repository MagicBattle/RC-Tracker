# RC Tracker

A single-page tracker for the sealed Pokémon products RC opened.

## Run

```sh
npm install
npm run prices
npm run dev
```

`npm run build` creates `dist/`. `npm test` checks inventory totals and comparisons.

## Pricing

TCGplayer market prices come from TCGCSV, once per day. Nine exact product IDs cover 13 boxes. No API key is needed. The updater rejects missing prices and writes only complete snapshots. A failed update leaves the last good snapshot intact. The page marks snapshots older than 48 hours as overdue.

The GitHub Actions workflow runs daily at 16:27 UTC, after it is pushed to the default branch with Actions enabled. It can also be run manually. GitHub may delay schedules or disable inactive public-repository schedules. The page reloads the saved data hourly; the hosted page reads the public GitHub history directly, with the bundled snapshot as a fallback. No daily redeploy is needed.

Sealed value = market price × quantity. Missed gross profit = sealed value − MSRP. Pulls, selling fees and shipping are excluded. Values can decrease. History starts with the first recorded observation; missing comparisons are not fabricated.

MSRP assumptions: SPC $99.99, Pokémon Center ETB $59.99, Perfect Order booster box $161.64. Total $961.52 with zero Delaware sales tax. Receipt verification remains outstanding.

Sources:
- https://tcgcsv.com/
- https://seller.tcgplayer.com/blog/ascended-heroes-quick-facts
- https://www.poke-life.com/sets/perfect-order/booster-box/
- https://revenue.delaware.gov/frequently-asked-questions/gross-receipts-tax-faqs/

## Deployment

Deploy `dist/` using any static host, with build command `npm ci && npm run build`. Connect the host to the main branch so the daily price commits rebuild the site. No server or paid pricing API is required. Hosting and Actions availability depend on the account plan.


Opening date: August 19, 2026 (reported by Michael). Historical observations are from TCGCSV daily archives, sampled weekly with daily points for the most recent week. Run `python scripts/backfill.py` with py7zr installed to reproduce the backfill; downloaded archives are cached. The current preview reads local history while publication is on hold.

## Design

Ash black, bone white and one ember accent for money that burned, set in Instrument Serif with Geist and Geist Mono. The hero is a WebGL scene (three.js): a curtain of firelight rises from the floor, $20 bills ride the heat up through it and burn into ash, and pulled cards drift in the dark behind. The headline counts up the missed gross profit. Below it, the price history chart (drag or arrow keys to move through time) and the box-by-box table share one selected date. `src/AshScene.jsx` holds the scene and `src/Timeline.jsx` holds the chart. Scrolling down, a sentence lights up word by word, then the nine products are dealt onto a pile like cards while a running total of missed profit counts up (`src/Story.jsx`). The chart draws itself in when it enters the screen, and the page closes on a large wordmark. Motion follows a strong ease-out curve and respects reduced motion.

## Product photos

Cards and the table show each product's official TCGplayer photo, matched by product ID. Run `npm run images` once to save them to `public/products/` so the site does not depend on TCGplayer's CDN. Without the saved copies, the page loads them from the CDN, and if that fails a lettered placeholder shows instead.
