# Best Flips Table Metrics

This document explains every column in the `best-flips-auto` table and how each value is calculated.

## Column definitions and formulas

| Column | Meaning | Calculation / Source |
| --- | --- | --- |
| `Item` | Albion item identifier | `entry.item_id` from price API |
| `City` | Market city | `entry.city` from price API |
| `Q` | Item quality (1-5) | `entry.quality` from price API |
| `Buy` | Effective buy price used by the model | `round(entry.buy_price_max * OVERCUT_FACTOR)` |
| `Sell` | Effective sell price used by the model | `round(entry.sell_price_min * UNDERCUT_FACTOR)` |
| `Profit/Unit` | Estimated net silver profit per item | `round(netReceivePerUnit - totalCostPerUnit)` |
| `Margin %` | Profit as percentage of total cost | `round1((profitPerUnitRaw / totalCostPerUnit) * 100)` |
| `Daily Volume` | Estimated sold items/day over recent history | `round(avg(last up to 7 history.item_count values))` |
| `Suggested Qty` | Suggested order size for one flip | `clamp(floor(max(dailyVolume * ESTIMATED_DEPTH_RATIO, MIN_ESTIMATED_DEPTH)), 1, MAX_SUGGESTED_BUY_QUANTITY)` |
| `Capital Efficiency` | ROI-like efficiency score blending margin and liquidity | `round2((marginPctRaw * SCORE_CAPTURE_RATIO) * volumeFactor)` where `volumeFactor = min(2, sqrt(dailyVolume / MIN_DAILY_VOLUME))` |
| `Potential Daily Profit` | Daily profit potential estimate before ROI and penalties | `round(adjustedScore)` where `adjustedScore = baseScore * depthMultiplier` |
| `Blended Score` | Final ranking score shown in table | `round(penalizedScore)` |
| `Updated` | Newest timestamp across buy/sell quote timestamps | `newestTimestamp([sell_price_min_date, sell_price_max_date, buy_price_min_date, buy_price_max_date])` |

## Core intermediate values

The model computes these intermediate values before rendering the table:

- `effectiveBuyPrice = entry.buy_price_max * OVERCUT_FACTOR`
- `effectiveSellPrice = entry.sell_price_min * UNDERCUT_FACTOR`
- `netReceivePerUnit = effectiveSellPrice * (1 - SETUP_FEE) * (1 - TAX_RATE_PREMIUM)`
- `totalCostPerUnit = effectiveBuyPrice * (1 + SETUP_FEE)`
- `profitPerUnitRaw = netReceivePerUnit - totalCostPerUnit`
- `marginPctRaw = (profitPerUnitRaw / totalCostPerUnit) * 100`
- `estimatedDepth = max(dailyVolume * ESTIMATED_DEPTH_RATIO, MIN_ESTIMATED_DEPTH)`
- `baseScore = profitPerUnitRaw * dailyVolume * SCORE_CAPTURE_RATIO`
- `depthMultiplier = min(1, estimatedDepth / DEPTH_MULTIPLIER_TARGET)`
- `adjustedScore = baseScore * depthMultiplier`
- `roiAdjustedScore = adjustedScore * (capitalEfficiency / ROI_SCORE_BASELINE)`
- `blendedScore = adjustedScore * (1 - ROI_BLEND_WEIGHT) + roiAdjustedScore * ROI_BLEND_WEIGHT`
- `estimatedOrderProfit = profitPerUnitRaw * suggestedBuyQuantity`
- `quantityPenalty = penaltyFactor(suggestedBuyQuantity, PENALTY_TARGET_QUANTITY)`
- `orderProfitPenalty = penaltyFactor(estimatedOrderProfit, PENALTY_TARGET_ORDER_PROFIT)`
- `penalizedScore = blendedScore * quantityPenalty * orderProfitPenalty`

Where:

- `penaltyFactor(value, target)`:
  - `normalized = clamp(value / target, 0, 1)`
  - `result = MIN_PENALTY_FACTOR + (1 - MIN_PENALTY_FACTOR) * normalized`

## Row inclusion filters

A row is only included if all of these checks pass:

1. `dailyVolume >= MIN_DAILY_VOLUME`
2. `entry.sell_price_min > entry.buy_price_max`
3. `totalCostPerUnit > 0`
4. `profitPerUnitRaw >= MIN_PROFIT_PER_UNIT`
5. `marginPctRaw >= MIN_MARGIN_PCT`

If any condition fails, the candidate is skipped.

## Current constant values

From `src/utils/metrics.ts`:

- `HISTORY_WINDOW_DAYS = 7`
- `TAX_RATE_PREMIUM = 0.04`
- `SETUP_FEE = 0.025`
- `OVERCUT_FACTOR = 1.01`
- `UNDERCUT_FACTOR = 0.99`
- `MIN_PROFIT_PER_UNIT = 200`
- `MIN_MARGIN_PCT = 10`
- `MIN_DAILY_VOLUME = 150`
- `ESTIMATED_DEPTH_RATIO = 0.1`
- `MIN_ESTIMATED_DEPTH = 20`
- `MAX_SUGGESTED_BUY_QUANTITY = 2000`
- `SCORE_CAPTURE_RATIO = 0.2`
- `DEPTH_MULTIPLIER_TARGET = 100`
- `ROI_BLEND_WEIGHT = 0.35`
- `ROI_SCORE_BASELINE = 10`
- `PENALTY_TARGET_QUANTITY = 50`
- `PENALTY_TARGET_ORDER_PROFIT = 100000`
- `MIN_PENALTY_FACTOR = 0.15`

## Display formatting notes

- Silver-like columns (`Buy`, `Sell`, `Profit/Unit`, `Potential Daily Profit`, `Blended Score`) are displayed with integer number formatting.
- `Margin %` is displayed with one decimal place.
- `Capital Efficiency` is displayed with two decimal places.
- `Updated` is shown as timestamp text (`T` replaced with a space), or `-` if empty.
