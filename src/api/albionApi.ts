import {
  HistoryResponseGroup,
  PriceResponseRow,
  SelectOption,
  ServerRegion,
} from "./types";

const BASE_URLS: Record<ServerRegion, string> = {
  west: "https://west.albion-online-data.com",
  east: "https://east.albion-online-data.com",
  europe: "https://europe.albion-online-data.com",
};

const ITEMS_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/items.json";
const WORLD_URL =
  "https://raw.githubusercontent.com/ao-data/ao-bin-dumps/master/formatted/world.json";

const FALLBACK_CITIES = [
  "Caerleon",
  "Bridgewatch",
  "Fort Sterling",
  "Lymhurst",
  "Martlock",
  "Thetford",
  "Brecilien",
];

interface ItemMetaRow {
  UniqueName?: string;
  LocalizedNames?: { "EN-US"?: string };
}

interface WorldMetaRow {
  UniqueName?: string;
  Id?: string;
  Name?: string;
}

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value.length > 0) {
      search.set(key, value);
    }
  });
  return search.toString() ? `?${search.toString()}` : "";
}

export async function fetchCurrentPrices(
  server: ServerRegion,
  itemIds: string[],
  cities: string[],
  qualities?: number[],
): Promise<PriceResponseRow[]> {
  const itemsParam = itemIds.join(",");
  const query = buildQuery({
    locations: cities.join(","),
    qualities: qualities?.join(","),
  });
  const url = `${BASE_URLS[server]}/api/v2/stats/prices/${itemsParam}.json${query}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Price request failed (${response.status})`);
  }
  return (await response.json()) as PriceResponseRow[];
}

export async function fetchHistory(
  server: ServerRegion,
  itemIds: string[],
  cities: string[],
  qualities?: number[],
  timeScale = 24,
): Promise<HistoryResponseGroup[]> {
  const itemsParam = itemIds.join(",");
  const query = buildQuery({
    locations: cities.join(","),
    qualities: qualities?.join(","),
    "time-scale": String(timeScale),
  });
  const url = `${BASE_URLS[server]}/api/v2/stats/history/${itemsParam}.json${query}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`History request failed (${response.status})`);
  }
  return (await response.json()) as HistoryResponseGroup[];
}

export async function fetchItemOptions(): Promise<SelectOption[]> {
  const response = await fetch(ITEMS_URL);
  if (!response.ok) {
    throw new Error(`Items metadata request failed (${response.status})`);
  }
  const data = (await response.json()) as ItemMetaRow[];

  return data
    .filter((row) => row.UniqueName?.startsWith("T"))
    .map((row) => {
      const name = row.LocalizedNames?.["EN-US"] ?? row.UniqueName ?? "";
      const value = row.UniqueName ?? "";
      return {
        value,
        label: `${name} (${value})`,
      };
    })
    .filter((row) => row.value.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label));
}

export async function fetchCityOptions(): Promise<SelectOption[]> {
  try {
    const response = await fetch(WORLD_URL);
    if (!response.ok) {
      throw new Error("world metadata unavailable");
    }
    const data = (await response.json()) as WorldMetaRow[];

    const set = new Set<string>();
    data.forEach((row) => {
      const value = row.UniqueName ?? row.Name ?? row.Id ?? "";
      if (
        value &&
        FALLBACK_CITIES.some((city) =>
          normalizeCityKey(value).includes(normalizeCityKey(city)),
        )
      ) {
        set.add(cityLabelFromWorld(value));
      }
    });

    // Keep known market cities always available even if metadata parsing changes.
    FALLBACK_CITIES.forEach((city) => set.add(city));

    const cities = [...set].sort();
    return cities.map((city) => ({ value: city, label: city }));
  } catch {
    return FALLBACK_CITIES.map((city) => ({ value: city, label: city }));
  }
}

function cityLabelFromWorld(value: string): string {
  const normalized = normalizeCityKey(value);
  const hit = FALLBACK_CITIES.find((city) =>
    normalized.includes(normalizeCityKey(city)),
  );
  return hit ?? value;
}

function normalizeCityKey(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}
