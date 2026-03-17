# Albion Market Compare Web App

Simple React + Vite web app for comparing Albion market opportunities using the Albion Data Project API.

## Features

- Two compare modes:
  - **1 Item vs Many Cities**
  - **Many Items vs 1 City**
- Filters:
  - Game server (`west`, `east`, `europe`)
  - Item(s)
  - City/cities
  - Item quality (`1` to `5`)
- Metrics:
  - Buy price (current)
  - Sell price (current)
  - Silver profit
  - Profit percentage
  - Estimated items sold/day (7-day average from history)
  - Sell frequency (`Low`, `Medium`, `High`)
- Sortable table with loading, empty, and error states.

## Data sources

- Prices: `/api/v2/stats/prices/{item_ids}.json`
- History: `/api/v2/stats/history/{item_ids}.json?time-scale=24`
- Item metadata: `ao-bin-dumps/formatted/items.json`
- City metadata fallback handling with known city list.

## Metric formulas

- `silverProfit = max(0, sellPrice - buyPrice)`
- `profitPercent = buyPrice > 0 ? (silverProfit / buyPrice) * 100 : null`
- `itemsSoldPerDay = average(last 7 daily item_count points)`
- `sellFrequency`:
  - `Low` if sold/day < 100
  - `Medium` if sold/day < 300
  - `High` otherwise

## Run locally

```bash
npm install
npm run dev
```

Build:

```bash
npm run build
```

Preview production build:

```bash
npm run preview
```

## Notes

- The API has rate limits; avoid aggressive polling.
- Some item/city/quality combinations can return missing or zero values.
- This app uses direct browser calls to public endpoints.
- Best-flips table metric documentation: `README-best-flips-table.md`.
