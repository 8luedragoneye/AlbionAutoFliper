import { useEffect, useMemo, useState } from "react";
import { CompareMode, FlipCandidateRow, MarketTableRow, MarketViewRow } from "../api/types";

type SortKey =
  | "itemId"
  | "city"
  | "buyPrice"
  | "sellPrice"
  | "updatedAt"
  | "silverProfit"
  | "profitPercent"
  | "itemsSoldPerDay"
  | "sellFrequency"
  | "profitPerUnit"
  | "marginPct"
  | "dailyVolume"
  | "suggestedBuyQuantity"
  | "capitalEfficiency"
  | "potentialDailyProfit"
  | "score";

interface MarketTableProps {
  mode: CompareMode;
  rows: MarketTableRow[];
  loading: boolean;
  error: string | null;
}

export default function MarketTable({ mode, rows, loading, error }: MarketTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>(defaultSort(mode));
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  useEffect(() => {
    setSortBy(defaultSort(mode));
    setSortDir("desc");
  }, [mode]);

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const left = normalizedValue(a, sortBy, mode);
      const right = normalizedValue(b, sortBy, mode);
      if (left < right) return sortDir === "asc" ? -1 : 1;
      if (left > right) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [rows, sortBy, sortDir]);

  const updateSort = (next: SortKey) => {
    if (sortBy === next) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(next);
      setSortDir("desc");
    }
  };

  if (loading) {
    return <p className="status">Loading market data...</p>;
  }
  if (error) {
    return <p className="status error">{error}</p>;
  }
  if (rows.length === 0) {
    return <p className="status">No results yet. Pick filters and click Load data.</p>;
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <SortableHeader label="Item" onClick={() => updateSort("itemId")} />
            <SortableHeader label="City" onClick={() => updateSort("city")} />
            <th>Q</th>
            <SortableHeader label="Buy" onClick={() => updateSort("buyPrice")} />
            <SortableHeader label="Sell" onClick={() => updateSort("sellPrice")} />
            {mode === "best-flips-auto" ? (
              <>
                <SortableHeader
                  label="Profit/Unit"
                  onClick={() => updateSort("profitPerUnit")}
                />
                <SortableHeader label="Margin %" onClick={() => updateSort("marginPct")} />
                <SortableHeader
                  label="Daily Volume"
                  onClick={() => updateSort("dailyVolume")}
                />
                <SortableHeader
                  label="Suggested Qty"
                  onClick={() => updateSort("suggestedBuyQuantity")}
                />
                <SortableHeader
                  label="Capital Efficiency"
                  onClick={() => updateSort("capitalEfficiency")}
                />
                <SortableHeader
                  label="Potential Daily Profit"
                  onClick={() => updateSort("potentialDailyProfit")}
                />
                <SortableHeader label="Blended Score" onClick={() => updateSort("score")} />
              </>
            ) : (
              <>
                <SortableHeader
                  label="Silver Profit"
                  onClick={() => updateSort("silverProfit")}
                />
                <SortableHeader label="% Profit" onClick={() => updateSort("profitPercent")} />
                <SortableHeader
                  label="Sold/Day"
                  onClick={() => updateSort("itemsSoldPerDay")}
                />
                <SortableHeader
                  label="Sell Frequency"
                  onClick={() => updateSort("sellFrequency")}
                />
              </>
            )}
            <th>Updated</th>
          </tr>
        </thead>
        <tbody>
          {sortedRows.map((row) => (
            <tr key={row.key}>
              <td>{row.itemId}</td>
              <td>{row.city}</td>
              <td>{row.quality}</td>
              <td>{formatSilver(row.buyPrice)}</td>
              <td>{formatSilver(row.sellPrice)}</td>
              {mode === "best-flips-auto" ? (
                <>
                  <td>{formatSilver((row as FlipCandidateRow).profitPerUnit)}</td>
                  <td>{(row as FlipCandidateRow).marginPct.toFixed(1)}%</td>
                  <td>{(row as FlipCandidateRow).dailyVolume}</td>
                  <td>{(row as FlipCandidateRow).suggestedBuyQuantity}</td>
                  <td>{(row as FlipCandidateRow).capitalEfficiency.toFixed(2)}</td>
                  <td>{formatSilver((row as FlipCandidateRow).potentialDailyProfit)}</td>
                  <td>{formatSilver((row as FlipCandidateRow).score)}</td>
                </>
              ) : (
                <>
                  <td>{formatSilver((row as MarketViewRow).silverProfit)}</td>
                  <td>
                    {(row as MarketViewRow).profitPercent === null
                      ? "-"
                      : `${(row as MarketViewRow).profitPercent?.toFixed(2)}%`}
                  </td>
                  <td>{(row as MarketViewRow).itemsSoldPerDay}</td>
                  <td>{(row as MarketViewRow).sellFrequency}</td>
                </>
              )}
              <td>{formatTimestamp(row.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SortableHeader({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}) {
  return (
    <th>
      <button className="sort-button" type="button" onClick={onClick}>
        {label}
      </button>
    </th>
  );
}

function formatSilver(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
}

function formatTimestamp(value: string): string {
  if (!value) return "-";
  return value.replace("T", " ");
}

function normalizedValue(row: MarketTableRow, key: SortKey, mode: CompareMode): number | string {
  if (mode === "best-flips-auto") {
    const flipRow = row as FlipCandidateRow;
    switch (key) {
      case "itemId":
      case "city":
        return flipRow[key];
      case "updatedAt":
        return new Date(flipRow.updatedAt).getTime();
      default:
        return flipRow[key as keyof FlipCandidateRow] as number | string;
    }
  }

  const compareRow = row as MarketViewRow;
  switch (key) {
    case "profitPercent":
      return compareRow.profitPercent ?? -Infinity;
    case "sellFrequency":
      return compareRow.sellFrequency === "High"
        ? 3
        : compareRow.sellFrequency === "Medium"
          ? 2
          : 1;
    case "updatedAt":
      return new Date(compareRow.updatedAt).getTime();
    default:
      return compareRow[key as keyof MarketViewRow] as number | string;
  }
}

function defaultSort(mode: CompareMode): SortKey {
  return mode === "best-flips-auto" ? "score" : "profitPercent";
}
