import { useMemo } from "react";
import { CompareMode, SelectOption, ServerRegion } from "../api/types";
import { expandResourceGroupsToItemIds, RESOURCE_GROUPS } from "../utils/resourceItems";
import CitySelect from "./CitySelect";
import ItemSelect from "./ItemSelect";
import ModeToggle from "./ModeToggle";
import ResourceGroupSelect from "./ResourceGroupSelect";

interface FiltersProps {
  mode: CompareMode;
  server: ServerRegion;
  quality: number;
  itemOptions: SelectOption[];
  cityOptions: SelectOption[];
  selectedItems: string[];
  selectedCities: string[];
  selectedResourceGroupIds: string[];
  isLoading: boolean;
  onModeChange: (mode: CompareMode) => void;
  onServerChange: (server: ServerRegion) => void;
  onQualityChange: (quality: number) => void;
  onItemsChange: (items: string[]) => void;
  onCitiesChange: (cities: string[]) => void;
  onResourceGroupChange: (groupIds: string[]) => void;
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
    selectedResourceGroupIds,
    isLoading,
    onModeChange,
    onServerChange,
    onQualityChange,
    onItemsChange,
    onCitiesChange,
    onResourceGroupChange,
    onLoad,
  } = props;

  const resourceGroupOptions = useMemo(
    () => RESOURCE_GROUPS.map((g) => ({ value: g.id, label: g.label })),
    [],
  );

  const expandedResourceItemIds = useMemo(
    () => expandResourceGroupsToItemIds(selectedResourceGroupIds, itemOptions),
    [selectedResourceGroupIds, itemOptions],
  );

  const itemMulti = mode === "items-vs-city";
  const cityMulti = mode !== "items-vs-city";
  const canLoad =
    mode === "resource-comparator"
      ? selectedCities.length > 0 &&
        selectedResourceGroupIds.length > 0 &&
        expandedResourceItemIds.length > 0 &&
        itemOptions.length > 0
      : mode === "best-flips-auto"
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

        {mode !== "resource-comparator" ? (
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
        ) : null}

        <button type="button" disabled={!canLoad || isLoading} onClick={onLoad}>
          {isLoading ? "Loading..." : "Load data"}
        </button>
      </div>

      <div className="select-grid">
        {mode !== "best-flips-auto" && mode !== "resource-comparator" ? (
          <ItemSelect
            options={itemOptions}
            selected={selectedItems}
            onChange={onItemsChange}
            multi={itemMulti}
          />
        ) : null}
        {mode === "resource-comparator" ? (
          <>
            <p className="mode-note">
              Pick material types (ore, wood, planks, …). Tier × enchant matrix ignores item quality.
              This mode starts with every type and every city selected.
            </p>
            <ResourceGroupSelect
              options={resourceGroupOptions}
              selected={selectedResourceGroupIds}
              onChange={onResourceGroupChange}
            />
            <CitySelect
              options={cityOptions}
              selected={selectedCities}
              onChange={onCitiesChange}
              multi
            />
          </>
        ) : (
          <CitySelect
            options={cityOptions}
            selected={selectedCities}
            onChange={onCitiesChange}
            multi={cityMulti}
          />
        )}
      </div>
    </section>
  );
}
