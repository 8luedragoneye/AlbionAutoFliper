import { MergedResourceCityPrice } from "../api/types";
import {
  buildAlbionResourceItemId,
  getKeywordForGroupId,
  RESOURCE_ENCHANT_COLS,
  RESOURCE_TIER_ROWS,
} from "../utils/resourceItems";

const ENCHANT_LABELS = [".0", ".1", ".2", ".3", ".4"] as const;

const TIER_ROW_ACCENTS = [
  "",
  "rc-tier-glow-a",
  "rc-tier-glow-b",
  "rc-tier-glow-c",
  "rc-tier-glow-d",
  "rc-tier-glow-e",
  "rc-tier-glow-f",
];

export interface ResourceCellMetrics {
  spread: number;
  pct: number | null;
  /** Cities tied for lowest buy among selected */
  minBuyCities: string[];
  /** Cities tied for highest sell among selected */
  maxSellCities: string[];
  minBuy: number;
  maxSell: number;
  /** One row per selected city, in list order */
  cityRows: { city: string; buy: number | null; sell: number | null }[];
}

interface ResourceGroupTierTableProps {
  groupId: string;
  title: string;
  /** item_id -> city -> merged buy/sell (qualities combined) */
  priceIndex: Map<string, Map<string, MergedResourceCityPrice>>;
  cities: string[];
  allowedItemIds: Set<string>;
}

export default function ResourceGroupTierTable({
  groupId,
  title,
  priceIndex,
  cities,
  allowedItemIds,
}: ResourceGroupTierTableProps) {
  const keyword = getKeywordForGroupId(groupId);
  if (!keyword) return null;

  return (
    <section className="resource-tier-block" data-group={groupId}>
      <h2 className="resource-tier-title">{title}</h2>
      <div className="table-wrap resource-tier-wrap">
        <table className="resource-tier-matrix">
          <thead>
            <tr>
              <th className="resource-tier-corner">Tier</th>
              {RESOURCE_ENCHANT_COLS.map((col) => (
                <th key={col} className={`resource-tier-enc resource-tier-enc-${col}`}>
                  {ENCHANT_LABELS[col]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {RESOURCE_TIER_ROWS.map((tier, rowIdx) => (
              <tr key={tier} className={TIER_ROW_ACCENTS[rowIdx % TIER_ROW_ACCENTS.length]}>
                <th className="resource-tier-row-label">T{tier}</th>
                {RESOURCE_ENCHANT_COLS.map((enc) => {
                  const itemId = buildAlbionResourceItemId(keyword, tier, enc);
                  const metrics = computeCellMetrics(priceIndex, itemId, cities, allowedItemIds);
                  return (
                    <td key={enc} className={`resource-tier-cell resource-tier-enc-${enc}`}>
                      <TierMatrixCell metrics={metrics} />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TierMatrixCell({ metrics }: { metrics: ResourceCellMetrics | null }) {
  if (!metrics) {
    return <span className="resource-tier-empty">—</span>;
  }
  const {
    spread,
    pct,
    minBuyCities,
    maxSellCities,
    minBuy,
    maxSell,
    cityRows,
  } = metrics;

  const spreadCls =
    spread > 0
      ? "resource-tier-val resource-tier-pos"
      : spread < 0
        ? "resource-tier-val resource-tier-neg"
        : "resource-tier-val resource-tier-zero";

  const arbTitle = `Cross-city: lowest buy ${formatNum(minBuy)} (${minBuyCities.join(", ")}) vs highest sell ${formatNum(maxSell)} (${maxSellCities.join(", ")})`;

  return (
    <div className="resource-tier-pill resource-tier-pill-split">
      <div className={spreadCls} title={arbTitle}>
        <span className="resource-tier-main">{formatPrimary(spread)}</span>
        <span className="resource-tier-info" title={arbTitle}>
          i
        </span>
      </div>
      {pct !== null ? (
        <div className={pct >= 0 ? "resource-tier-pct resource-tier-pos" : "resource-tier-pct resource-tier-neg"}>
          {formatPct(pct)}
        </div>
      ) : (
        <div className="resource-tier-pct resource-tier-muted">—</div>
      )}
      <div className="resource-tier-arb-route" title={arbTitle}>
        <span className="resource-tier-arb-label">Buy @</span>{" "}
        <span className="resource-tier-arb-cities">{minBuyCities.length ? minBuyCities.join(", ") : "—"}</span>
        <span className="resource-tier-arb-arrow"> → </span>
        <span className="resource-tier-arb-label">Sell @</span>{" "}
        <span className="resource-tier-arb-cities">{maxSellCities.length ? maxSellCities.join(", ") : "—"}</span>
      </div>
      <div className="resource-tier-city-list">
        {cityRows.map(({ city, buy, sell }) => {
          const bestBuy = minBuyCities.includes(city);
          const bestSell = maxSellCities.includes(city);
          return (
            <div key={city} className="resource-tier-city-block">
              <div className="resource-tier-city-name">{city}</div>
              <div className="resource-tier-city-bs">
                <span className={bestBuy ? "rc-bs rc-bs-best-buy" : "rc-bs"} title="Buy order (highest bid)">
                  B {formatNum(buy)}
                </span>
                <span className={bestSell ? "rc-bs rc-bs-best-sell" : "rc-bs"} title="Sell order (lowest ask)">
                  S {formatNum(sell)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatPrimary(n: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n));
}

function formatNum(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatPct(n: number): string {
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toFixed(1)}%`;
}

function computeCellMetrics(
  priceIndex: Map<string, Map<string, MergedResourceCityPrice>>,
  itemId: string,
  cities: string[],
  allowedItemIds: Set<string>,
): ResourceCellMetrics | null {
  if (!allowedItemIds.has(itemId)) {
    return null;
  }
  const byCity = priceIndex.get(itemId);
  if (!byCity) return null;

  const cityRows = cities.map((city) => {
    const m = byCity.get(city);
    return {
      city,
      buy: m?.buy ?? null,
      sell: m?.sell ?? null,
    };
  });

  const buyVals = cityRows.filter((r) => r.buy !== null) as { city: string; buy: number; sell: number | null }[];
  const sellVals = cityRows.filter((r) => r.sell !== null) as { city: string; buy: number | null; sell: number }[];

  if (buyVals.length === 0 || sellVals.length === 0) return null;

  const minBuy = Math.min(...buyVals.map((x) => x.buy));
  const maxSell = Math.max(...sellVals.map((x) => x.sell!));

  const minBuyCities = buyVals.filter((x) => x.buy === minBuy).map((x) => x.city);
  const maxSellCities = sellVals.filter((x) => x.sell === maxSell).map((x) => x.city);

  const spread = maxSell - minBuy;
  const pct = minBuy > 0 ? (spread / minBuy) * 100 : null;

  return {
    spread,
    pct,
    minBuyCities,
    maxSellCities,
    minBuy,
    maxSell,
    cityRows,
  };
}
