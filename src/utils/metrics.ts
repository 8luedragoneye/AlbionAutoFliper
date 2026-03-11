import { HistoryPoint, MarketMetrics } from "../api/types";

const HISTORY_WINDOW_DAYS = 7;

export function computeMarketMetrics(
  buyPrice: number,
  sellPrice: number,
  history: HistoryPoint[],
): MarketMetrics {
  const silverProfit = Math.max(0, sellPrice - buyPrice);
  const profitPercent = buyPrice > 0 ? (silverProfit / buyPrice) * 100 : null;
  const itemsSoldPerDay = averageDailyVolume(history, HISTORY_WINDOW_DAYS);
  const sellFrequency = classifySellFrequency(itemsSoldPerDay);

  return {
    silverProfit,
    profitPercent,
    itemsSoldPerDay,
    sellFrequency,
  };
}

export function averageDailyVolume(history: HistoryPoint[], days: number): number {
  if (history.length === 0) {
    return 0;
  }
  const samples = history.slice(-days);
  const sum = samples.reduce((acc, entry) => acc + entry.item_count, 0);
  return Math.round(sum / samples.length);
}

export function classifySellFrequency(
  itemsPerDay: number,
): "Low" | "Medium" | "High" {
  if (itemsPerDay < 100) {
    return "Low";
  }
  if (itemsPerDay < 300) {
    return "Medium";
  }
  return "High";
}
