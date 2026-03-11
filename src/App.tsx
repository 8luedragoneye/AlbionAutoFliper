import { useEffect, useMemo, useState } from "react";
import {
  fetchCityOptions,
  fetchCurrentPrices,
  fetchHistory,
  fetchItemOptions,
} from "./api/albionApi";
import {
  CompareMode,
  HistoryResponseGroup,
  MarketViewRow,
  PriceResponseRow,
  SelectOption,
  ServerRegion,
} from "./api/types";
import Filters from "./components/Filters";
import MarketTable from "./components/MarketTable";
import { computeMarketMetrics } from "./utils/metrics";

export default function App() {
  const [mode, setMode] = useState<CompareMode>("item-vs-cities");
  const [server, setServer] = useState<ServerRegion>("west");
  const [quality, setQuality] = useState<number>(1);
  const [itemOptions, setItemOptions] = useState<SelectOption[]>([]);
  const [cityOptions, setCityOptions] = useState<SelectOption[]>([]);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  const [rows, setRows] = useState<MarketViewRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadMetadata();
  }, []);

  const selectionHint = useMemo(() => {
    if (mode === "item-vs-cities") {
      return "Pick exactly 1 item and 1+ cities.";
    }
    return "Pick 1+ items and exactly 1 city.";
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
      const itemIds =
        mode === "item-vs-cities" ? selectedItems.slice(0, 1) : selectedItems;
      const cities =
        mode === "items-vs-city" ? selectedCities.slice(0, 1) : selectedCities;

      const [prices, history] = await Promise.all([
        fetchCurrentPrices(server, itemIds, cities, [quality]),
        fetchHistory(server, itemIds, cities, [quality], 24),
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
      <MarketTable rows={rows} loading={loading} error={error} />
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

function toMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return "Unexpected error while loading market data.";
}
