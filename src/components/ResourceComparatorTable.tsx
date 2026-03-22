import { useMemo } from "react";
import { MergedResourceCityPrice, PriceResponseRow } from "../api/types";
import { isFreshPriceSnapshot } from "../utils/metrics";
import { RESOURCE_GROUPS } from "../utils/resourceItems";
import ResourceGroupTierTable from "./ResourceGroupTierTable";

interface ResourceComparatorTableProps {
  prices: PriceResponseRow[];
  cities: string[];
  /** Expanded item IDs from selected material groups */
  selectedResourceIds: string[];
  /** Number of material groups selected in the filter (ore, wood, …) */
  resourceGroupCount: number;
  selectedResourceGroupIds: string[];
}

export default function ResourceComparatorTable({
  prices,
  cities,
  selectedResourceIds,
  resourceGroupCount,
  selectedResourceGroupIds,
}: ResourceComparatorTableProps) {
  const scopedPrices = useMemo(() => {
    const allow = new Set(selectedResourceIds);
    if (allow.size === 0) {
      return [];
    }
    return prices.filter((row) => allow.has(row.item_id));
  }, [prices, selectedResourceIds]);

  const priceIndex = useMemo(
    () => buildMergedResourcePriceIndex(scopedPrices, cities),
    [scopedPrices, cities],
  );

  const allowedItemIds = useMemo(() => new Set(selectedResourceIds), [selectedResourceIds]);

  const groupsToShow = useMemo(
    () => RESOURCE_GROUPS.filter((g) => selectedResourceGroupIds.includes(g.id)),
    [selectedResourceGroupIds],
  );

  if (resourceGroupCount === 0) {
    return (
      <p className="status">Select at least one resource type (ore, wood, planks, …).</p>
    );
  }
  if (selectedResourceIds.length === 0) {
    return (
      <p className="status">
        No items match the selected types yet. Wait for the item list to finish loading.
      </p>
    );
  }
  if (prices.length === 0) {
    return (
      <p className="status">No results yet. Pick resource types and cities, then click Load data.</p>
    );
  }
  if (scopedPrices.length === 0) {
    return (
      <p className="status">
        No loaded prices match the current item set. Change types or click Load data.
      </p>
    );
  }

  return (
    <div className="resource-comparator resource-comparator-tiered">
      <p className="resource-comparator-legend resource-comparator-legend-block">
        Each table is one material. <strong>Rows</strong> = tier (T2–T8), <strong>columns</strong> = enchant
        (.0–.4). Top line = cross-city spread (highest sell anywhere minus lowest buy anywhere) and %.{" "}
        <strong>Buy @ / Sell @</strong> shows which cities set that min buy and max sell. Below:{" "}
        <strong>B</strong> and <strong>S</strong> for every selected city (highlighted = best buy / best sell).
        Qualities merged per city.
      </p>

      <div className="resource-tier-stack">
        {groupsToShow.map((g) => (
          <ResourceGroupTierTable
            key={g.id}
            groupId={g.id}
            title={g.label}
            priceIndex={priceIndex}
            cities={cities}
            allowedItemIds={allowedItemIds}
          />
        ))}
      </div>
    </div>
  );
}

function effectiveBuy(entry: PriceResponseRow | undefined): number | null {
  if (!entry || !isFreshPriceSnapshot(entry.buy_price_max_date)) return null;
  return Math.max(0, entry.buy_price_max);
}

function effectiveSell(entry: PriceResponseRow | undefined): number | null {
  if (!entry || !isFreshPriceSnapshot(entry.sell_price_min_date)) return null;
  return Math.max(0, entry.sell_price_min);
}

function mergeCityPrice(
  a: MergedResourceCityPrice,
  b: { buy: number | null; sell: number | null },
): MergedResourceCityPrice {
  return {
    buy:
      a.buy === null
        ? b.buy
        : b.buy === null
          ? a.buy
          : Math.min(a.buy, b.buy),
    sell:
      a.sell === null
        ? b.sell
        : b.sell === null
          ? a.sell
          : Math.max(a.sell, b.sell),
  };
}

function buildMergedResourcePriceIndex(
  prices: PriceResponseRow[],
  cities: string[],
): Map<string, Map<string, MergedResourceCityPrice>> {
  const citySet = new Set(cities);
  const map = new Map<string, Map<string, MergedResourceCityPrice>>();
  for (const p of prices) {
    if (!citySet.has(p.city)) continue;
    const itemId = p.item_id;
    let byCity = map.get(itemId);
    if (!byCity) {
      byCity = new Map();
      map.set(itemId, byCity);
    }
    const b = effectiveBuy(p);
    const s = effectiveSell(p);
    const next = { buy: b, sell: s };
    const existing = byCity.get(p.city);
    if (!existing) {
      byCity.set(p.city, { buy: b, sell: s });
    } else {
      byCity.set(p.city, mergeCityPrice(existing, next));
    }
  }
  return map;
}
