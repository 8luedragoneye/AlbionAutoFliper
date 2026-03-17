import { useEffect, useMemo, useState } from "react";
import {
  RateLimitError,
  fetchCityOptions,
  fetchCurrentPrices,
  fetchHistory,
  fetchItemOptions,
} from "./api/albionApi";
import {
  CompareMode,
  FilteredItemEntry,
  FlipCandidateRow,
  HistoryResponseGroup,
  MarketViewRow,
  MarketTableRow,
  PriceResponseRow,
  SelectOption,
  ServerRegion,
} from "./api/types";
import Filters from "./components/Filters";
import MarketTable from "./components/MarketTable";
import { computeFlipCandidate, computeMarketMetrics } from "./utils/metrics";

const TOP_RESULTS = 20;
const ITEM_REQUEST_CHUNK_SIZE = 140;
const ALL_QUALITY = 0;
const QUALITY_VALUES = [1, 2, 3, 4, 5];
let filteredItemIdsCache: string[] | null = null;

export default function App() {
  const [mode, setMode] = useState<CompareMode>("item-vs-cities");
  const [server, setServer] = useState<ServerRegion>("west");
  const [quality, setQuality] = useState<number>(ALL_QUALITY);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [rows, setRows] = useState<MarketTableRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMetadata();
  }, []);

  const selectionHint = useMemo(() => {
    if (mode === "item-vs-cities") {
      return "Pick exactly 1 item and 1+ cities.";
    }
    if (mode === "items-vs-city") {
      return "Pick 1+ items and exactly 1 city.";
    }
    return "Pick 1+ cities. Best-flip scan uses filtered-items-clean.json.";
  }, [mode]);

  const handleModeChange = (next: CompareMode) => {
    setMode(next);
    setRows([]);
    setError(null);
    if (next === "item-vs-cities" && selectedItems.length > 1) {
      setSelectedItems(selectedItems.slice(-1));
    }
    if (next === "items-vs-city" && selectedCities.length > 1) {
      setSelectedCities(selectedCities.slice(-1));
    }
  };

  async function loadMetadata() {
    setLoading(true);
    setError(null);
    try {
      const [items, cities] = await Promise.all([fetchItemOptions(), fetchCityOptions()]);
      setItemOptions(items);
      setCityOptions(cities);
      if (items.length > 0) {
        setSelectedItems([items[0].value]);
      }
      if (cities.length > 0) {
        setSelectedCities([cities[0].value]);
      }
    } catch (loadError) {
      setError(toMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  async function loadMarketData() {
    setLoading(true);
    setError(null);
    setRows([]);
    try {
      if (mode === "best-flips-auto") {
        const bestFlipRows = await loadBestFlipRows(
          server,
          selectedCities,
          quality,
          itemOptions,
        );
        setRows(bestFlipRows);
        return;
      }

      const itemIds = mode === "item-vs-cities" ? selectedItems.slice(0, 1) : selectedItems;
      const cities = mode === "items-vs-city" ? selectedCities.slice(0, 1) : selectedCities;

      const requestedQualities = resolveQualities(quality);
      const [prices, history] = await Promise.all([
        fetchCurrentPrices(server, itemIds, cities, requestedQualities),
        fetchHistory(server, itemIds, cities, requestedQualities, 24),
      ]);
      setRows(buildViewRows(prices, history));
    } catch (loadError) {
      setError(toMessage(loadError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app">
      <header>
        <h1>Albion Market Compare</h1>
        <p>
          Compare buy/sell opportunities with estimated volume and sell frequency.
        </p>
      </header>

      <Filters
        mode={mode}
        server={server}
        quality={quality}
        itemOptions={itemOptions}
        cityOptions={cityOptions}
        selectedItems={selectedItems}
        selectedCities={selectedCities}
        isLoading={loading}
        onModeChange={handleModeChange}
        onServerChange={setServer}
        onQualityChange={setQuality}
        onItemsChange={setSelectedItems}
        onCitiesChange={setSelectedCities}
        onLoad={loadMarketData}
      />

      <p className="hint">{selectionHint}</p>
      <MarketTable mode={mode} rows={rows} loading={loading} error={error} />
    </main>
  );
}

function buildViewRows(
  prices: PriceResponseRow[],
  historyGroups: HistoryResponseGroup[],
): MarketViewRow[] {
  const historyByKey = new Map<string, HistoryResponseGroup["data"]>();
  historyGroups.forEach((group) => {
    const key = `${group.item_id}|${group.location}|${group.quality}`;
    historyByKey.set(key, group.data ?? []);
  });

  return prices.map((entry) => {
    const key = `${entry.item_id}|${entry.city}|${entry.quality}`;
    const history = historyByKey.get(key) ?? [];
    const buyPrice = Math.max(0, entry.buy_price_max);
    const sellPrice = Math.max(0, entry.sell_price_min);
    const metrics = computeMarketMetrics(buyPrice, sellPrice, history);
    const updatedAt = newestTimestamp([
      entry.sell_price_min_date,
      entry.sell_price_max_date,
      entry.buy_price_min_date,
      entry.buy_price_max_date,
    ]);

    return {
      key,
      itemId: entry.item_id,
      city: entry.city,
      quality: entry.quality,
      buyPrice,
      sellPrice,
      silverProfit: metrics.silverProfit,
      profitPercent: metrics.profitPercent,
      itemsSoldPerDay: metrics.itemsSoldPerDay,
      sellFrequency: metrics.sellFrequency,
      updatedAt,
    };
  });
}

function newestTimestamp(candidates: string[]): string {
  return candidates
    .filter(Boolean)
    .sort((a, b) => new Date(b).getTime() - new Date(a).getTime())[0] ?? "";
}

async function loadBestFlipRows(
  server: ServerRegion,
  cities: string[],
  quality: number,
  itemOptions: SelectOption[],
): Promise<FlipCandidateRow[]> {
  const metadataItemIds = new Set(itemOptions.map((option) => option.value));
  const candidateItemIds = (await filteredItemIds()).filter((id) => metadataItemIds.has(id));
  if (candidateItemIds.length === 0) {
    throw new Error("No candidate items available in filtered-items-clean.json.");
  }

  const prices: PriceResponseRow[] = [];
  const historyGroups: HistoryResponseGroup[] = [];
  const chunks = chunkValues(candidateItemIds, ITEM_REQUEST_CHUNK_SIZE);
  const requestedQualities = resolveQualities(quality);
  for (const itemChunk of chunks) {
    const [priceChunk, historyChunk] = await Promise.all([
      fetchCurrentPrices(server, itemChunk, cities, requestedQualities),
      fetchHistory(server, itemChunk, cities, requestedQualities, 24),
    ]);
    prices.push(...priceChunk);
    historyGroups.push(...historyChunk);
  }

  return buildFlipRows(prices, historyGroups)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_RESULTS);
}

function buildFlipRows(
  prices: PriceResponseRow[],
  historyGroups: HistoryResponseGroup[],
): FlipCandidateRow[] {
  const historyByKey = new Map<string, HistoryResponseGroup["data"]>();
  historyGroups.forEach((group) => {
    const key = `${group.item_id}|${group.location}|${group.quality}`;
    historyByKey.set(key, group.data ?? []);
  });

  const rows: FlipCandidateRow[] = [];
  prices.forEach((entry) => {
    const key = `${entry.item_id}|${entry.city}|${entry.quality}`;
    const history = historyByKey.get(key) ?? [];
    const candidate = computeFlipCandidate(entry, history);
    if (!candidate) {
      return;
    }
    rows.push({
      ...candidate,
      updatedAt: newestTimestamp([
        entry.sell_price_min_date,
        entry.sell_price_max_date,
        entry.buy_price_min_date,
        entry.buy_price_max_date,
      ]),
    });
  });
  return rows;
}

async function filteredItemIds(): Promise<string[]> {
  if (filteredItemIdsCache) {
    return filteredItemIdsCache;
  }
  const module = await import("../filtered-items-clean.json");
  const list = module.default as FilteredItemEntry[];
  const unique = new Set<string>();
  list.forEach((row) => {
    const id = row.uniqueName?.trim();
    if (id) {
      unique.add(id);
    }
  });
  filteredItemIdsCache = [...unique];
  return filteredItemIdsCache;
}

function chunkValues<T>(values: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let index = 0; index < values.length; index += size) {
    chunks.push(values.slice(index, index + size));
  }
  return chunks;
}

function resolveQualities(selectedQuality: number): number[] | undefined {
  if (selectedQuality === ALL_QUALITY) {
    return undefined;
  }
  return QUALITY_VALUES.includes(selectedQuality) ? [selectedQuality] : undefined;
}

function toMessage(error: unknown): string {
  if (error instanceof RateLimitError) {
    const retryHint = error.retryAfterSeconds
      ? ` Please wait about ${error.retryAfterSeconds}s and try again.`
      : " Please wait a moment and try again.";
    return `Albion API rate limit reached.${retryHint}`;
  }
  if (error instanceof Error) return error.message;
  return "Unexpected error while loading market data.";
}
