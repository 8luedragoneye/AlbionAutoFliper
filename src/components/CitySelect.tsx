import { SelectOption } from "../api/types";

interface CitySelectProps {
  options: SelectOption[];
  selected: string[];
  onChange: (values: string[]) => void;
  multi: boolean;
}

export default function CitySelect({
  options,
  selected,
  onChange,
  multi,
}: CitySelectProps) {
  return (
    <div className="filter-group">
      <label htmlFor="citySelect">City</label>
      <select
        id="citySelect"
        multiple={multi}
        value={multi ? selected : (selected[0] ?? "")}
        size={8}
        onMouseDown={(event) => {
          if (!multi) {
            return;
          }
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
          onChange(multi ? values : values.slice(-1));
        }}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {multi ? (
        <div className="selection-actions">
          <button type="button" onClick={() => onChange(options.map((option) => option.value))}>
            Select all
          </button>
          <button type="button" onClick={() => onChange([])}>
            Clear
          </button>
        </div>
      ) : null}
      <small>{selected.length} selected</small>
      {multi ? <small>Tip: click cities to toggle selection.</small> : null}
    </div>
  );
}
