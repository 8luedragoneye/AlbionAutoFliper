import {
  FlipCandidateRow,
  HistoryPoint,
  MarketMetrics,
  PriceResponseRow,
} from "../api/types";

const HISTORY_WINDOW_DAYS = 7;
export const TAX_RATE_PREMIUM = 0.04;
export const SETUP_FEE = 0.025;
export const OVERCUT_FACTOR = 1.01;
export const UNDERCUT_FACTOR = 0.99;
export const MIN_PROFIT_PER_UNIT = 200;
export const MIN_MARGIN_PCT = 10;
export const MIN_DAILY_VOLUME = 150;
export const ESTIMATED_DEPTH_RATIO = 0.1;
export const MIN_ESTIMATED_DEPTH = 20;
export const MAX_SUGGESTED_BUY_QUANTITY = 2000;
export const SCORE_CAPTURE_RATIO = 0.2;
export const DEPTH_MULTIPLIER_TARGET = 100;
export const ROI_BLEND_WEIGHT = 0.35;
export const ROI_SCORE_BASELINE = 10;
export const PENALTY_TARGET_QUANTITY = 50;
export const PENALTY_TARGET_ORDER_PROFIT = 100000;
export const MIN_PENALTY_FACTOR = 0.15;

export function computeMarketMetrics(
  buyPrice: number,
  sellPrice: number,
  history: HistoryPoint[],
): MarketMetrics {
  const silverProfit = sellPrice - buyPrice;
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

export function computeFlipCandidate(
  entry: PriceResponseRow,
  history: HistoryPoint[],
): FlipCandidateRow | null {
  const dailyVolume = averageDailyVolume(history, HISTORY_WINDOW_DAYS);
  if (dailyVolume < MIN_DAILY_VOLUME || entry.sell_price_min <= entry.buy_price_max) {
    return null;
  }

  const effectiveBuyPrice = entry.buy_price_max * OVERCUT_FACTOR;
  const effectiveSellPrice = entry.sell_price_min * UNDERCUT_FACTOR;
  const netReceivePerUnit =
    effectiveSellPrice * (1 - SETUP_FEE) * (1 - TAX_RATE_PREMIUM);
  const totalCostPerUnit = effectiveBuyPrice * (1 + SETUP_FEE);
  if (totalCostPerUnit <= 0) {
    return null;
  }

  const profitPerUnit = netReceivePerUnit - totalCostPerUnit;
  if (profitPerUnit < MIN_PROFIT_PER_UNIT) {
    return null;
  }

  const marginPct = (profitPerUnit / totalCostPerUnit) * 100;
  if (marginPct < MIN_MARGIN_PCT) {
    return null;
  }

  const estimatedDepth = Math.max(dailyVolume * ESTIMATED_DEPTH_RATIO, MIN_ESTIMATED_DEPTH);
  const suggestedBuyQuantity = Math.max(
    1,
    Math.min(Math.floor(estimatedDepth), MAX_SUGGESTED_BUY_QUANTITY),
  );
  const baseScore = profitPerUnit * dailyVolume * SCORE_CAPTURE_RATIO;
  const depthMultiplier = Math.min(1, estimatedDepth / DEPTH_MULTIPLIER_TARGET);
  const adjustedScore = baseScore * depthMultiplier;
  const volumeFactor = Math.min(2, Math.sqrt(dailyVolume / MIN_DAILY_VOLUME));
  const profitPctPerDayAssumingCapture = marginPct * SCORE_CAPTURE_RATIO;
  const capitalEfficiency = profitPctPerDayAssumingCapture * volumeFactor;
  const roiAdjustedScore = adjustedScore * (capitalEfficiency / ROI_SCORE_BASELINE);
  const blendedScore =
    adjustedScore * (1 - ROI_BLEND_WEIGHT) + roiAdjustedScore * ROI_BLEND_WEIGHT;
  const estimatedOrderProfit = profitPerUnit * suggestedBuyQuantity;
  const quantityPenalty = penaltyFactor(suggestedBuyQuantity, PENALTY_TARGET_QUANTITY);
  const orderProfitPenalty = penaltyFactor(estimatedOrderProfit, PENALTY_TARGET_ORDER_PROFIT);
  const penalizedScore = blendedScore * quantityPenalty * orderProfitPenalty;

  return {
    key: `${entry.item_id}|${entry.city}|${entry.quality}`,
    itemId: entry.item_id,
    city: entry.city,
    quality: entry.quality,
    buyPrice: Math.round(effectiveBuyPrice),
    sellPrice: Math.round(effectiveSellPrice),
    profitPerUnit: Math.round(profitPerUnit),
    marginPct: roundTo(marginPct, 1),
    dailyVolume,
    suggestedBuyQuantity,
    capitalEfficiency: roundTo(capitalEfficiency, 2),
    potentialDailyProfit: Math.round(adjustedScore),
    score: Math.round(penalizedScore),
    updatedAt: "",
  };
}

function penaltyFactor(value: number, target: number): number {
  if (target <= 0) {
    return 1;
  }
  const normalized = Math.min(1, Math.max(0, value / target));
  return MIN_PENALTY_FACTOR + (1 - MIN_PENALTY_FACTOR) * normalized;
}

function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
