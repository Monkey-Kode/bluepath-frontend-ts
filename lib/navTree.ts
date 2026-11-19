import type { NavigationQueryResult } from '@/sanity.types';
import sortObject from '@/utils/sortObject';

type NavItem = NavigationQueryResult[number];

/** A top-level header item and its sub-items. An item with no sub-items renders as a link. */
export interface NavNode {
  item: NavItem;
  children: NavItem[];
}

/**
 * Groups the menu one level deep (FR-001). A top-level item has no parent. A sub-item names a
 * top-level item as its parent. A sub-item whose parent is missing or is itself a sub-item
 * belongs nowhere, so neither the header nor the footer shows it.
 */
function groupByParent(navigation: NavigationQueryResult): NavNode[] {
  const sorted = sortObject(navigation);
  const top = sorted.filter(({ parent }) => !parent);
  return top.map((item) => ({
    item,
    children: sorted.filter(({ parent }) => parent === item._id),
  }));
}

/**
 * The header's items in Order (AC-1.5). A top-level item shows when its Header box is checked.
 * A sub-item shows only in its parent's dropdown, whatever its own Header box says.
 */
export function headerTree(navigation: NavigationQueryResult): NavNode[] {
  return groupByParent(navigation).filter(({ item }) => item.header);
}

/**
 * The footer's links in Order (AC-1.6). Each item shows when its own Footer box is checked. A
 * sub-item follows its parent. When the parent is not in the footer, the sub-item takes the
 * parent's place.
 */
export function footerList(navigation: NavigationQueryResult): NavItem[] {
  return groupByParent(navigation)
    .flatMap(({ item, children }) => [item, ...children])
    .filter(({ footer }) => footer);
}
