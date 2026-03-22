import { SelectOption } from "../api/types";
import { stripEnchantment } from "./itemDisplay";

/** Raw gatherables and refined crafting mats (Albion item uniqueName patterns). */
const RESOURCE_ID =
  /^T\d+_(ORE|HIDE|FIBER|ROCK|WOOD|METALBAR|LEATHER|CLOTH|STONEBLOCK|PLANKS)(?:_|$|@)/;

const RAW_ID = /^T\d+_(ORE|HIDE|FIBER|ROCK|WOOD)(?:_|$|@)/;
const REFINED_ID = /^T\d+_(METALBAR|LEATHER|CLOTH|STONEBLOCK|PLANKS)(?:_|$|@)/;

/** User-facing groups (not individual T4_ORE vs T5_ORE rows). */
export const RESOURCE_GROUPS: { id: string; label: string }[] = [
  { id: "ore", label: "Ore" },
  { id: "hide", label: "Hide" },
  { id: "fiber", label: "Fiber" },
  { id: "rock", label: "Rock" },
  { id: "wood", label: "Wood" },
  { id: "metalbar", label: "Metal bars" },
  { id: "leather", label: "Leather" },
  { id: "cloth", label: "Cloth" },
  { id: "stoneblock", label: "Stone blocks" },
  { id: "planks", label: "Planks" },
];

const KEYWORD_BY_GROUP: Record<string, string> = {
  ore: "ORE",
  hide: "HIDE",
  fiber: "FIBER",
  rock: "ROCK",
  wood: "WOOD",
  metalbar: "METALBAR",
  leather: "LEATHER",
  cloth: "CLOTH",
  stoneblock: "STONEBLOCK",
  planks: "PLANKS",
};

export const ALL_RESOURCE_GROUP_IDS = RESOURCE_GROUPS.map((g) => g.id);

function groupPattern(groupId: string): RegExp | null {
  const kw = KEYWORD_BY_GROUP[groupId];
  if (!kw) return null;
  return new RegExp(`^T\\d+_${kw}(?:_|$|@)`);
}

export function itemIdMatchesResourceGroup(itemId: string, groupId: string): boolean {
  const re = groupPattern(groupId);
  if (!re) return false;
  return re.test(stripEnchantment(itemId));
}

/** All item uniqueNames in metadata that belong to any selected group. */
export function expandResourceGroupsToItemIds(
  groupIds: string[],
  itemOptions: SelectOption[],
): string[] {
  if (groupIds.length === 0) return [];
  const out = new Set<string>();
  for (const option of itemOptions) {
    if (!isResourceItemId(option.value)) continue;
    for (const gid of groupIds) {
      if (itemIdMatchesResourceGroup(option.value, gid)) {
        out.add(option.value);
        break;
      }
    }
  }
  return [...out];
}

export function isResourceItemId(uniqueName: string): boolean {
  const withoutEnchantment = uniqueName.replace(/@\d+$/, "");
  return RESOURCE_ID.test(withoutEnchantment);
}

export function isRawResourceId(itemId: string): boolean {
  return RAW_ID.test(stripEnchantment(itemId));
}

export function isRefinedResourceId(itemId: string): boolean {
  return REFINED_ID.test(stripEnchantment(itemId));
}

export function parseTierFromItemId(itemId: string): number {
  const match = stripEnchantment(itemId).match(/^T(\d+)/);
  return match ? Number(match[1]) : 0;
}

/** Albion resource lines: base .0, then _LEVELn@n for .1–.4 */
export function buildAlbionResourceItemId(
  keyword: string,
  tier: number,
  enchantCol: 0 | 1 | 2 | 3 | 4,
): string {
  const base = `T${tier}_${keyword}`;
  if (enchantCol === 0) return base;
  return `${base}_LEVEL${enchantCol}@${enchantCol}`;
}

export function getKeywordForGroupId(groupId: string): string | undefined {
  return KEYWORD_BY_GROUP[groupId];
}

export const RESOURCE_TIER_ROWS = [2, 3, 4, 5, 6, 7, 8] as const;

export const RESOURCE_ENCHANT_COLS = [0, 1, 2, 3, 4] as const;
