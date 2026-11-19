import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import type { NewsBySlugQueryResult } from '@/sanity.types';
import NewsBody from './NewsBody';

type Body = NonNullable<NewsBySlugQueryResult>['body'];
type Block = Extract<NonNullable<Body>[number], { _type: 'block' }>;
type InternalLink = Extract<
  NonNullable<Block['markDefs']>[number],
  { _type: 'internalLink' }
>;

/** A paragraph whose only text links to the referenced document. */
const linked = (text: string, reference: InternalLink['reference']): Block => ({
  _type: 'block',
  _key: text,
  style: 'normal',
  markDefs: [{ _type: 'internalLink', _key: `${text}-link`, reference }],
  children: [
    { _type: 'span', _key: `${text}-span`, text, marks: [`${text}-link`] },
  ],
});

const slug = (current: string) => ({ _type: 'slug' as const, current });

const hrefOf = (text: string) =>
  screen.getByRole('link', { name: text }).getAttribute('href');

describe('NewsBody internal links', () => {
  it('links pages, news, and events at their paths, as before case studies', () => {
    render(
      <NewsBody
        value={
          [
            linked('Impact', { _type: 'page', slug: slug('impact') }),
            linked('Fund news', { _type: 'news', slug: slug('fund') }),
            linked('Summit', { _type: 'event', slug: slug('summit') }),
          ] satisfies Body
        }
      />,
    );
    expect(hrefOf('Impact')).toBe('/impact');
    expect(hrefOf('Fund news')).toBe('/news/fund');
    expect(hrefOf('Summit')).toBe('/events/summit');
  });

  it('links a case study at /case-studies/<slug>/ (AC-6.3)', () => {
    render(
      <NewsBody
        value={
          [
            linked('Lincoln goes solar', {
              _type: 'caseStudy',
              slug: slug('lincoln-solar'),
            }),
          ] satisfies Body
        }
      />,
    );
    expect(hrefOf('Lincoln goes solar')).toBe('/case-studies/lincoln-solar/');
  });

  it('points a link without a slug or a target at #', () => {
    render(
      <NewsBody
        value={
          [
            linked('No slug', { _type: 'page', slug: null }),
            linked('Deleted', null),
          ] satisfies Body
        }
      />,
    );
    expect(hrefOf('No slug')).toBe('#');
    expect(hrefOf('Deleted')).toBe('#');
  });
});
