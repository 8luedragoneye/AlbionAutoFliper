import { CompareMode } from "../api/types";

interface ModeToggleProps {
  mode: CompareMode;
  onChange: (mode: CompareMode) => void;
}

export default function ModeToggle({ mode, onChange }: ModeToggleProps) {
  return (
    <div className="mode-toggle">
      <button
        type="button"
        className={mode === "item-vs-cities" ? "active" : ""}
        onClick={() => onChange("item-vs-cities")}
      >
        1 Item vs Many Cities
      </button>
      <button
        type="button"
        className={mode === "items-vs-city" ? "active" : ""}
        onClick={() => onChange("items-vs-city")}
      >
        Many Items vs 1 City
      </button>
      <button
        type="button"
        className={mode === "best-flips-auto" ? "active" : ""}
        onClick={() => onChange("best-flips-auto")}
      >
        Best Flips Auto
      </button>
      <button
        type="button"
        className={mode === "resource-comparator" ? "active" : ""}
        onClick={() => onChange("resource-comparator")}
      >
        Resource Comparator
      </button>
    </div>
  );
}
