# Albion Online Data Project API Documentation (Official-Based)

**Primary official sources**
- API page: https://www.albion-online-data.com/api/
- Developer page: https://www.albion-online-data.com/developer

**Scope**
- This document covers the public REST market API (`/api/v2/stats/*`) and official developer integration info (NATS, topics, timestamps, dumps).
- Content is based on the official pages and validated with live endpoint responses (March 2026).
- The API site mentions Swagger documentation is available, but no public Swagger URL is linked on the official page.

---

## 1) Base Hosts (Choose One)

Use the host that matches your target Albion server, then append endpoint paths.

- Europe: `https://europe.albion-online-data.com`
- Asia (East): `https://east.albion-online-data.com`
- Americas (West): `https://west.albion-online-data.com`

Example:
`https://west.albion-online-data.com` + `/api/v2/stats/prices/T4_BAG.json?locations=Caerleon`

---

## 2) Global API Rules

- Method: `GET`
- Format: `.json` is default and optional; replace with `.xml` for XML.
- Date formats supported:
  - `YYYY-MM-DD` (preferred)
  - `MM-DD-YYYY`
- URL max length: `4096` characters.
- Rate limits (per IP):
  - `180` requests per 1 minute
  - `300` requests per 5 minutes
- High-volume usage recommendation: enable gzip compression.

Reference metadata for IDs/names:
- Item IDs:
  - https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/items.json
  - https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/items.txt
- Location IDs and names:
  - https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/world.json
  - https://github.com/ao-data/ao-bin-dumps/blob/master/formatted/world.txt

---

## 3) REST Endpoints (`/api/v2/stats`)

### 3.1 Current Prices (Table View)

- Path: `/api/v2/stats/view/{item_ids}`
- Returns: HTML table

Path parameters:
- `item_ids` (required): comma-separated item IDs.

Query parameters:
- `locations` (optional): comma-separated location names or IDs.
- `qualities` (optional): comma-separated quality levels (`1` to `5`).

Example:
`/api/v2/stats/view/T4_BAG,T4_CAPE?locations=Caerleon,Bridgewatch&qualities=1,2`

---

### 3.2 Current Prices (JSON/XML)

- Path: `/api/v2/stats/prices/{item_ids}.json`
- Returns: array of market rows for requested items and filters

Path parameters:
- `item_ids` (required): comma-separated item IDs.

Query parameters:
- `locations` (optional): comma-separated location names or IDs.
- `qualities` (optional): comma-separated quality levels (`1` to `5`).

Example:
`/api/v2/stats/prices/T4_BAG.json?locations=Caerleon&qualities=2`

Observed JSON row shape (live response):
```json
{
  "item_id": "T4_BAG",
  "city": "Caerleon",
  "quality": 2,
  "sell_price_min": 4893,
  "sell_price_min_date": "2026-03-11T05:40:00",
  "sell_price_max": 7997,
  "sell_price_max_date": "2026-03-11T05:40:00",
  "buy_price_min": 3597,
  "buy_price_min_date": "2026-03-11T11:20:00",
  "buy_price_max": 3597,
  "buy_price_max_date": "2026-03-11T11:20:00"
}
```

---

### 3.3 Historical Prices (Sell Orders Only)

- Path: `/api/v2/stats/history/{item_ids}.json`
- Returns: grouped time-series sell-order history

Path parameters:
- `item_ids` (required): comma-separated item IDs.

Query parameters:
- `locations` (optional): comma-separated location names or IDs.
- `qualities` (optional): comma-separated quality levels (`1` to `5`).
- `date` (optional): start date.
- `end_date` (optional): end date.
- `time-scale` (optional): aggregation bucket:
  - `1` = hourly
  - `6` = 6-hour
  - `24` = daily

Example:
`/api/v2/stats/history/T4_BAG.json?locations=Caerleon&qualities=2&date=2026-02-01&end_date=2026-02-28&time-scale=24`

Observed JSON group shape (live response):
```json
{
  "location": "Caerleon",
  "item_id": "T4_BAG",
  "quality": 2,
  "data": [
    { "item_count": 250, "avg_price": 5251, "timestamp": "2026-02-09T00:00:00" }
  ]
}
```

---

### 3.4 Charts Data

- Path: `/api/v2/stats/charts/{item_ids}.json`
- Returns: chart-ready arrays for timestamps, average prices, and item counts

Path parameters:
- `item_ids` (required): comma-separated item IDs.

Query parameters:
- `locations` (optional): comma-separated location names or IDs.
- `qualities` (optional): comma-separated quality levels (`1` to `5`).
- `date` (optional): start date.
- `end_date` (optional): end date.
- `time-scale` (optional): aggregation bucket (`1`, `6`, `24`).

Example:
`/api/v2/stats/charts/T4_BAG.json?locations=Caerleon&qualities=2&time-scale=24`

Observed JSON group shape (live response):
```json
{
  "location": "Caerleon",
  "item_id": "T4_BAG",
  "quality": 2,
  "data": {
    "timestamps": ["2026-02-09T00:00:00"],
    "prices_avg": [5251],
    "item_count": [250]
  }
}
```

---

### 3.5 Gold Prices

- Path: `/api/v2/stats/gold.json`
- Returns: gold price time series

Query parameters:
- `date` (optional): start date.
- `end_date` (optional): end date.
- `count` (optional): number of most recent records.

Examples:
- Date range: `/api/v2/stats/gold.json?date=2026-03-01&end_date=2026-03-10`
- Latest N: `/api/v2/stats/gold.json?count=3`

Observed JSON row shape (live response):
```json
{
  "price": 8582,
  "timestamp": "2026-03-11T11:00:00"
}
```

---

## 4) Developer Integrations (Official)

### 4.1 NATS Connection Strings

- Europe: `nats://public:thenewalbiondata@nats.albion-online-data.com:34222`
- Asia: `nats://public:thenewalbiondata@nats.albion-online-data.com:24222`
- Americas: `nats://public:thenewalbiondata@nats.albion-online-data.com:4222`

### 4.2 NATS Topics

- `markethistories.deduped` (deduped market histories)
- `marketorders.deduped` (deduped market orders)
- `goldprices.deduped` (deduped gold prices)
- `markethistories.ingest` (all incoming histories, includes duplicates)
- `marketorders.ingest` (all incoming orders, includes duplicates)
- `goldprices.ingest` (all incoming gold prices, includes duplicates)

Data message structure reference:
- https://github.com/ao-data/albiondata-client/tree/master/lib

### 4.3 Tick Timestamp Conversion

Official conversion from C# ticks to Unix epoch seconds:

`(ticks - 621355968000000000) / 10000000`

Example:
- Input ticks: `638181504000000000`
- Epoch: `(638181504000000000 - 621355968000000000) / 10000000 = 1682553600`

### 4.4 Bandit Event Schema

Message schema:
```json
{"EventTime":639057896373527168,"Phase":1}
```

Phase semantics:
- `1`: event has not started yet (`EventTime` = start time)
- `2`: event escalates at `EventTime`
- `3`: event ends at `EventTime`

`EventTime` is in C# ticks.

### 4.5 Daily Database Dumps

- Europe: https://www.albion-online-data.com/database-europe/
- Asia (East): https://www.albion-online-data.com/database-east/
- Americas (West): https://www.albion-online-data.com/database/

---

## 5) Practical Notes

- Batch multiple items and locations in one request to reduce request count.
- Keep URLs under the 4096-char limit.
- Respect rate limits and use retry/backoff logic in clients.
- Prefer gzip for repeated polling workloads.

---

## 6) Official Project Links

- API page: https://www.albion-online-data.com/api/
- Developer page: https://www.albion-online-data.com/developer
- Backend server project: https://github.com/ao-data/albiondata-server-rails
- Data client project: https://github.com/ao-data/albiondata-client