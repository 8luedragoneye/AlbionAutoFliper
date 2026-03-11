import { useMemo, useState } from "react";
import { SelectOption } from "../api/types";

interface ItemSelectProps {
  options: SelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi: boolean;
}

export default function ItemSelect({
  options,
  selected,
  onChange,
  multi,
}: ItemSelectProps) {
  const [query, setQuery] = useState("");

  const filteredOptions = useMemo(() => {
    const lowered = query.trim().toLowerCase();
    if (!lowered) {
      return options.slice(0, 500);
    }
    return options
      .filter(
        (option) =>
          option.label.toLowerCase().includes(lowered) ||
          option.value.toLowerCase().includes(lowered),
      )
      .slice(0, 500);
  }, [options, query]);

  return (
    <div className="filter-group">
      <label htmlFor="itemSearch">Item</label>
      <input
        id="itemSearch"
        type="text"
        value={query}
        placeholder="Search item name or ID"
        onChange={(event) => setQuery(event.target.value)}
      />
      <select
        multiple={multi}
        value={selected}
        size={8}
        onChange={(event) => {
          const values = [...event.target.selectedOptions].map((opt) => opt.value);
          onChange(multi ? values : values.slice(-1));
        }}
      >
        {filteredOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <small>{selected.length} selected</small>
    </div>
  );
}
