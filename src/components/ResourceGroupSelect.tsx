import { SelectOption } from "../api/types";

interface ResourceGroupSelectProps {
  options: SelectOption[];
  selected: string[];
  onChange: (groupIds: string[]) => void;
}

export default function ResourceGroupSelect({
  options,
  selected,
  onChange,
}: ResourceGroupSelectProps) {
  return (
    <div className="filter-group">
      <label htmlFor="resourceGroupSelect">Resource types</label>
      <select
        id="resourceGroupSelect"
        multiple
        value={selected}
        size={10}
        onMouseDown={(event) => {
          const target = event.target as HTMLElement;
          if (target.tagName !== "OPTION") {
            return;
          }
          event.preventDefault();
          const value = (target as HTMLOptionElement).value;
          const next = selected.includes(value)
            ? selected.filter((entry) => entry !== value)
            : [...selected, value];
          onChange(next);
        }}
        onChange={(event) => {
          const values = [...event.target.selectedOptions].map((opt) => opt.value);
          onChange(values);
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      <div className="selection-actions">
        <button type="button" onClick={() => onChange(options.map((option) => option.value))}>
          Select all
        </button>
        <button type="button" onClick={() => onChange([])}>
          Clear
        </button>
      </div>
      <small>{selected.length} type(s) selected</small>
      <small>Tip: click rows to toggle (ore, wood, planks, …).</small>
    </div>
  );
}
