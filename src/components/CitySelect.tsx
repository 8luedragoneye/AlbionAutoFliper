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
        value={selected}
        size={8}
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
      <small>{selected.length} selected</small>
    </div>
  );
}
