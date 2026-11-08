# RC Tracker

RC opened 13 sealed Pokémon boxes. This site tracks what they'd be worth today if they were still sealed.

Live: https://magicbattle.github.io/RC-Tracker/

## Running it locally

```sh
npm install
npm run prices
npm run dev
```

`npm run build` builds the site into `dist/` and `npm test` runs the tests.

## Prices

Prices are TCGplayer market prices, pulled from [TCGCSV](https://tcgcsv.com/) once a day. There are 9 products covering the 13 boxes. If any price is missing, the update is skipped and the last good day stays.

A GitHub Action grabs new prices every day around 16:27 UTC and commits them, then the site rebuilds. You can also run it by hand from the Actions tab.

How the numbers work:

- Sealed value = market price × quantity
- Missed profit = sealed value − what was paid (MSRP)
- Fees, shipping and whatever got pulled aren't counted

What was paid: SPC $99.99, Pokémon Center ETB $59.99, Perfect Order booster box $161.64. $961.52 total, no sales tax (Delaware).

The boxes were opened August 19, 2026. Older history comes from TCGCSV's daily archives. `scripts/backfill.py` rebuilds it (needs `py7zr`).

## Product photos

`npm run images` saves the product photos into `public/products/`. If one is missing the page falls back to TCGplayer's image, then to a placeholder.
