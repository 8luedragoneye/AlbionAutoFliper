import { useMemo, useState } from "react";
import { MarketViewRow } from "../api/types";

type SortKey =
  | "itemId"
  | "city"
  | "buyPrice"
  | "sellPrice"
  | "silverProfit"
  | "profitPercent"
  | "itemsSoldPerDay"
  | "sellFrequency";

interface MarketTableProps {
  rows: MarketViewRow[];
  loading: boolean;
  error: string | null;
}

export default function MarketTable({ rows, loading, error }: MarketTableProps) {
  const [sortBy, setSortBy] = useState<SortKey>("profitPercent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sortedRows = useMemo(() => {
    const sorted = [...rows];
    sorted.sort((a, b) => {
      const left = normalizedValue(a, sortBy);
      const right = normalizedValue(b, sortBy);
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
              <td>{formatSilver(row.silverProfit)}</td>
              <td>{row.profitPercent === null ? "-" : `${row.profitPercent.toFixed(2)}%`}</td>
              <td>{row.itemsSoldPerDay}</td>
              <td>{row.sellFrequency}</td>
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

function normalizedValue(row: MarketViewRow, key: SortKey): number | string {
  switch (key) {
    case "profitPercent":
      return row.profitPercent ?? -Infinity;
    case "sellFrequency":
      return row.sellFrequency === "High" ? 3 : row.sellFrequency === "Medium" ? 2 : 1;
    default:
      return row[key] as number | string;
  }
}
