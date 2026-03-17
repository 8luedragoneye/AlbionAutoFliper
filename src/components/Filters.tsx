import { CompareMode, SelectOption, ServerRegion } from "../api/types";
import CitySelect from "./CitySelect";
import ItemSelect from "./ItemSelect";
import ModeToggle from "./ModeToggle";

interface FiltersProps {
  mode: CompareMode;
  server: ServerRegion;
  quality: number;
  itemOptions: SelectOption[];
  cityOptions: SelectOption[];
  selectedItems: string[];
  selectedCities: string[];
  isLoading: boolean;
  onModeChange: (mode: CompareMode) => void;
  onServerChange: (server: ServerRegion) => void;
  onQualityChange: (quality: number) => void;
  onItemsChange: (items: string[]) => void;
  onCitiesChange: (cities: string[]) => void;
  onLoad: () => void;
}

export default function Filters(props: FiltersProps) {
  const {
    mode,
    server,
    quality,
    itemOptions,
    cityOptions,
    selectedItems,
    selectedCities,
    isLoading,
    onModeChange,
    onServerChange,
    onQualityChange,
    onItemsChange,
    onCitiesChange,
    onLoad,
  } = props;

  const itemMulti = mode === "items-vs-city";
  const cityMulti = mode !== "items-vs-city";
  const canLoad =
    mode === "best-flips-auto"
      ? selectedCities.length > 0
      : mode === "item-vs-cities"
      ? selectedItems.length === 1 && selectedCities.length > 0
      : selectedItems.length > 0 && selectedCities.length === 1;

  return (
    <section className="filters">
      <ModeToggle mode={mode} onChange={onModeChange} />

      <div className="quick-config">
        <label>
          Server
          <select
            value={server}
            onChange={(event) => onServerChange(event.target.value as ServerRegion)}
          >
            <option value="west">Americas (West)</option>
            <option value="east">Asia (East)</option>
            <option value="europe">Europe</option>
          </select>
        </label>

        <label>
          Quality
          <select
            value={quality}
            onChange={(event) => onQualityChange(Number(event.target.value))}
          >
            <option value={0}>All</option>
            <option value={1}>1</option>
            <option value={2}>2</option>
            <option value={3}>3</option>
            <option value={4}>4</option>
            <option value={5}>5</option>
          </select>
        </label>

        <button type="button" disabled={!canLoad || isLoading} onClick={onLoad}>
          {isLoading ? "Loading..." : "Load data"}
        </button>
      </div>

      <div className="select-grid">
        {mode !== "best-flips-auto" ? (
          <ItemSelect
            options={itemOptions}
            selected={selectedItems}
            onChange={onItemsChange}
            multi={itemMulti}
          />
        ) : null}
        <CitySelect
          options={cityOptions}
          selected={selectedCities}
          onChange={onCitiesChange}
          multi={cityMulti}
        />
      </div>
    </section>
  );
}
