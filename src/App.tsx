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
import ResourceComparatorTable from "./components/ResourceComparatorTable";
import { buildItemNameLookup, resolveDisplayItemName } from "./utils/itemDisplay";
import { computeFlipCandidate, computeMarketMetrics, isFreshPriceSnapshot } from "./utils/metrics";
import {
  ALL_RESOURCE_GROUP_IDS,
  expandResourceGroupsToItemIds,
  isResourceItemId,
} from "./utils/resourceItems";

const TOP_RESULTS = 20;
const ITEM_REQUEST_CHUNK_SIZE = 140;
const ALL_QUALITY = 0;
const QUALITY_VALUES = [1, 2, 3, 4, 5];
let filteredItemMetadataCache:
  | { ids: string[]; nameById: Map<string, string> }
  | null = null;

export default function App() {
  const [mode, setMode] = useState<CompareMode>("item-vs-cities");
  const [server, setServer] = useState<ServerRegion>("europe");
  const [quality, setQuality] = useState<number>(ALL_QUALITY);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [selectedResourceGroupIds, setSelectedResourceGroupIds] = useState<string[]>([]);
  const [rows, setRows] = useState<MarketTableRow[]>([]);
  const [resourcePriceRows, setResourcePriceRows] = useState<PriceResponseRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemNameById = useMemo(() => buildItemNameLookup(itemOptions), [itemOptions]);

  const expandedResourceItemIds = useMemo(
    () => expandResourceGroupsToItemIds(selectedResourceGroupIds, itemOptions),
    [selectedResourceGroupIds, itemOptions],
  );

  useEffect(() => {
    void loadMetadata();
  }, []);

  useEffect(() => {
    if (mode !== "resource-comparator" || itemOptions.length === 0) return;
    setSelectedResourceGroupIds((prev) => {
      if (prev.length > 0) return prev;
      return ALL_RESOURCE_GROUP_IDS;
    });
  }, [mode, itemOptions]);

  const selectionHint = useMemo(() => {
    if (mode === "item-vs-cities") {
      return "Pick exactly 1 item and 1+ cities.";
    }
    if (mode === "items-vs-city") {
      return "Pick 1+ items and exactly 1 city.";
    }
    if (mode === "resource-comparator") {
      return "Choose material types (ore, wood, …) and cities, then load. Tier × enchant matrix (quality ignored for resources).";
    }
    return "Pick 1+ cities. Best-flip scan uses filtered-items-clean.json.";
  }, [mode]);

  const handleModeChange = (next: CompareMode) => {
    setMode(next);
    setRows([]);
    setResourcePriceRows([]);
    setError(null);
    if (next === "resource-comparator") {
      if (cityOptions.length > 0) {
        setSelectedCities(cityOptions.map((option) => option.value));
      }
      if (itemOptions.length > 0) {
        setSelectedResourceGroupIds(ALL_RESOURCE_GROUP_IDS);
      }
    }
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
    setResourcePriceRows([]);
    try {
      if (mode === "best-flips-auto") {
        const bestFlipRows = await loadBestFlipRows(
          server,
          selectedCities,
          quality,
          itemOptions,
          itemNameById,
        );
        setRows(bestFlipRows);
        return;
      }

      if (mode === "resource-comparator") {
        const cities = selectedCities;
        if (cities.length === 0) {
          throw new Error("Select at least one city.");
        }
        const resourceIds = expandedResourceItemIds.filter((id) => isResourceItemId(id));
        if (resourceIds.length === 0) {
          throw new Error("Select at least one resource type with matching items in metadata.");
        }
        const prices: PriceResponseRow[] = [];
        const chunks = chunkValues(resourceIds, ITEM_REQUEST_CHUNK_SIZE);
        for (const itemChunk of chunks) {
          const priceChunk = await fetchCurrentPrices(server, itemChunk, cities, undefined);
          prices.push(...priceChunk);
        }
        setResourcePriceRows(prices);
        return;
      }

      const itemIds = mode === "item-vs-cities" ? selectedItems.slice(0, 1) : selectedItems;
      const cities = mode === "items-vs-city" ? selectedCities.slice(0, 1) : selectedCities;

      const requestedQualities = resolveQualities(quality);
      const [prices, history] = await Promise.all([
        fetchCurrentPrices(server, itemIds, cities, requestedQualities),
        fetchHistory(server, itemIds, cities, requestedQualities, 24),
      ]);
      setRows(buildViewRows(prices, history, itemNameById));
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
        selectedResourceGroupIds={selectedResourceGroupIds}
        isLoading={loading}
        onModeChange={handleModeChange}
        onServerChange={setServer}
        onQualityChange={setQuality}
        onItemsChange={setSelectedItems}
        onCitiesChange={setSelectedCities}
        onResourceGroupChange={setSelectedResourceGroupIds}
        onLoad={loadMarketData}
      />

      <p className="hint">{selectionHint}</p>
      {mode === "resource-comparator" ? (
        loading ? (
          <p className="status">Loading market data...</p>
        ) : error ? (
          <p className="status error">{error}</p>
        ) : (
          <ResourceComparatorTable
            prices={resourcePriceRows}
            cities={selectedCities}
            selectedResourceIds={expandedResourceItemIds}
            resourceGroupCount={selectedResourceGroupIds.length}
            selectedResourceGroupIds={selectedResourceGroupIds}
          />
        )
      ) : (
        <MarketTable mode={mode} rows={rows} loading={loading} error={error} />
      )}
    </main>
  );
}

function buildViewRows(
  prices: PriceResponseRow[],
  historyGroups: HistoryResponseGroup[],
  itemNameById: Map<string, string>,
): MarketViewRow[] {
  const historyByKey = new Map<string, HistoryResponseGroup["data"]>();
  historyGroups.forEach((group) => {
    const key = `${group.item_id}|${group.location}|${group.quality}`;
    historyByKey.set(key, group.data ?? []);
  });

  return prices.flatMap((entry) => {
    const key = `${entry.item_id}|${entry.city}|${entry.quality}`;
    const history = historyByKey.get(key) ?? [];
    if (
      !isFreshPriceSnapshot(entry.buy_price_max_date) ||
      !isFreshPriceSnapshot(entry.sell_price_min_date)
    ) {
      return [];
    }
    const buyPrice = Math.max(0, entry.buy_price_max);
    const sellPrice = Math.max(0, entry.sell_price_min);
    const metrics = computeMarketMetrics(buyPrice, sellPrice, history);
    const updatedAt = newestTimestamp([
      entry.sell_price_min_date,
      entry.sell_price_max_date,
      entry.buy_price_min_date,
      entry.buy_price_max_date,
    ]);

    return [
      {
        key,
        itemId: entry.item_id,
        itemName: resolveDisplayItemName(entry.item_id, itemNameById),
        city: entry.city,
        quality: entry.quality,
        buyPrice,
        sellPrice,
        silverProfit: metrics.silverProfit,
        profitPercent: metrics.profitPercent,
        itemsSoldPerDay: metrics.itemsSoldPerDay,
        sellFrequency: metrics.sellFrequency,
        updatedAt,
      },
    ];
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
  itemNameById: Map<string, string>,
): Promise<FlipCandidateRow[]> {
  const metadataItemIds = new Set(itemOptions.map((option) => option.value));
  const filteredItems = await filteredItemMetadata();
  const candidateItemIds = filteredItems.ids.filter((id) => metadataItemIds.has(id));
  if (candidateItemIds.length === 0) {
    throw new Error("No candidate items available in filtered-items-clean.json.");
  }
  filteredItems.nameById.forEach((name, id) => {
    if (!itemNameById.has(id)) {
      itemNameById.set(id, name);
    }
  });

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

  return buildFlipRows(prices, historyGroups, itemNameById)
    .sort((a, b) => b.score - a.score)
    .slice(0, TOP_RESULTS);
}

function buildFlipRows(
  prices: PriceResponseRow[],
  historyGroups: HistoryResponseGroup[],
  itemNameById: Map<string, string>,
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
      itemName: resolveDisplayItemName(candidate.itemId, itemNameById),
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

async function filteredItemMetadata(): Promise<{ ids: string[]; nameById: Map<string, string> }> {
  if (filteredItemMetadataCache) {
    return filteredItemMetadataCache;
  }
  const module = await import("../filtered-items-clean.json");
  const list = module.default as FilteredItemEntry[];
  const unique = new Set<string>();
  const nameById = new Map<string, string>();
  list.forEach((row) => {
    const id = row.uniqueName?.trim();
    if (id) {
      unique.add(id);
      const displayName = row.name?.trim();
      if (displayName && !nameById.has(id)) {
        nameById.set(id, displayName);
      }
    }
  });
  filteredItemMetadataCache = {
    ids: [...unique],
    nameById,
  };
  return filteredItemMetadataCache;
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
