export type ServerRegion = "west" | "east" | "europe";

export type CompareMode = "item-vs-cities" | "items-vs-city" | "best-flips-auto";

export interface SelectOption {
  value: string;
  label: string;
}

export interface PriceResponseRow {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

export interface HistoryPoint {
  item_count: number;
  avg_price: number;
  timestamp: string;
}

export interface HistoryResponseGroup {
  location: string;
  item_id: string;
  quality: number;
  data: HistoryPoint[];
}

export interface MarketMetrics {
  silverProfit: number;
  profitPercent: number | null;
  itemsSoldPerDay: number;
  sellFrequency: "Low" | "Medium" | "High";
}

export interface MarketViewRow {
  key: string;
  itemId: string;
  city: string;
  quality: number;
  buyPrice: number;
  sellPrice: number;
  silverProfit: number;
  profitPercent: number | null;
  itemsSoldPerDay: number;
  sellFrequency: "Low" | "Medium" | "High";
  updatedAt: string;
}

export interface FlipCandidateRow {
  key: string;
  itemId: string;
  city: string;
  quality: number;
  buyPrice: number;
  sellPrice: number;
  profitPerUnit: number;
  marginPct: number;
  dailyVolume: number;
  suggestedBuyQuantity: number;
  potentialDailyProfit: number;
  score: number;
  updatedAt: string;
}

export interface FilteredItemEntry {
  index?: number;
  uniqueName: string;
  name?: string;
}

export type MarketTableRow = MarketViewRow | FlipCandidateRow;
