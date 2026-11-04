import { describe, expect, it } from 'vitest';
import type { NavigationQueryResult } from '@/sanity.types';
import { footerList, headerTree } from './navTree';

type NavItem = NavigationQueryResult[number];

const item = (
  _id: string,
  fields: Partial<Omit<NavItem, '_id'>> = {},
): NavItem => ({
  _id,
  name: _id,
  linkType: null,
  jumpLinkId: null,
  url: null,
  header: null,
  footer: null,
  order: null,
  page: null,
  parent: null,
  ...fields,
});

const names = (items: readonly NavItem[]) => items.map(({ _id }) => _id);

const navigation = [
  item('about', { header: true, footer: true, order: 1 }),
  item('projects', { header: true, footer: true, order: 2 }),
  item('contact', { header: true, footer: true, order: 3 }),
  // Saved in the Studio out of order, and with mixed boxes.
  item('case-studies', { parent: 'projects', order: 2, footer: true }),
  item('map', { parent: 'projects', order: 1, header: true }),
];

describe('headerTree (AC-1.5)', () => {
  it('lists top-level header items in Order with their sub-items in Order', () => {
    const tree = headerTree(navigation);
    expect(tree.map(({ item }) => item._id)).toEqual([
      'about',
      'projects',
      'contact',
    ]);
    expect(names(tree[1].children)).toEqual(['map', 'case-studies']);
  });

  it('never lists a sub-item at the top level, even with its Header box checked', () => {
    const top = headerTree(navigation).map(({ item }) => item._id);
    expect(top).not.toContain('map');
  });

  it('gives an item without sub-items no children, so it stays a plain link', () => {
    expect(headerTree(navigation)[0].children).toEqual([]);
  });

  it("keeps today's rule for top-level items: only a checked Header box shows", () => {
    const tree = headerTree([
      item('shown', { header: true }),
      item('hidden', { footer: true }),
      item('child', { parent: 'hidden', header: true }),
    ]);
    expect(tree.map(({ item }) => item._id)).toEqual(['shown']);
  });

  it('drops a sub-item whose parent is itself a sub-item or is missing', () => {
    const tree = headerTree([
      item('projects', { header: true }),
      item('map', { parent: 'projects' }),
      item('grandchild', { parent: 'map', header: true }),
      item('orphan', { parent: 'deleted', header: true }),
    ]);
    expect(tree).toHaveLength(1);
    expect(names(tree[0].children)).toEqual(['map']);
  });
});

describe('footerList (AC-1.6)', () => {
  it('lists footer items in Order, each checked sub-item right after its parent', () => {
    expect(names(footerList(navigation))).toEqual([
      'about',
      'projects',
      'case-studies',
      'contact',
    ]);
  });

  it('lists a sub-item only when its own Footer box is checked', () => {
    expect(names(footerList(navigation))).not.toContain('map');
  });

  it("keeps a checked sub-item in its parent's place when the parent is not in the footer", () => {
    const list = footerList([
      item('about', { footer: true, order: 1 }),
      item('projects', { header: true, order: 2 }),
      item('contact', { footer: true, order: 3 }),
      item('case-studies', { parent: 'projects', footer: true }),
    ]);
    expect(names(list)).toEqual(['about', 'case-studies', 'contact']);
  });
});
