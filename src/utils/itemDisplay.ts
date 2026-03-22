import { SelectOption } from "../api/types";

export function buildItemNameLookup(itemOptions: SelectOption[]): Map<string, string> {
  const lookup = new Map<string, string>();
  itemOptions.forEach((option) => {
    lookup.set(option.value, extractLabelName(option.label, option.value));
  });
  return lookup;
}

function extractLabelName(label: string, value: string): string {
  const suffix = ` (${value})`;
  return label.endsWith(suffix) ? label.slice(0, -suffix.length) : label;
}

export function parseEnchantment(itemId: string): number | null {
  const match = itemId.match(/@(\d+)$/);
  if (!match) {
    return null;
  }
  return Number(match[1]);
}

export function stripEnchantment(itemId: string): string {
  return itemId.replace(/@\d+$/, "");
}

export function resolveDisplayItemName(itemId: string, itemNameById: Map<string, string>): string {
  const enchantment = parseEnchantment(itemId);
  const baseId = stripEnchantment(itemId);
  const baseName = itemNameById.get(itemId) ?? itemNameById.get(baseId) ?? itemId;
  if (enchantment === null) {
    return baseName;
  }
  return `${baseName}.${enchantment}`;
}
