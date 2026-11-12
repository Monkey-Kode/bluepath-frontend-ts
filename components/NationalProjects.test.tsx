import { act, render, screen, within } from '@testing-library/react';
import type { InViewHookResponse } from 'react-intersection-observer';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { TickerEntry } from '@/lib/mapProjects/ticker';
import type { CasestudiesQueryResult } from '@/sanity.types';
import NationalProjects from './NationalProjects';
import StickyNationalProjects from './StickyNationalProjects';

/** The visitor's reduced-motion setting. framer-motion reads the media query once per module. */
const motionSetting = vi.hoisted(() => ({ reduce: false }));
vi.mock('framer-motion', async (importOriginal) => ({
  ...(await importOriginal<typeof import('framer-motion')>()),
  useReducedMotion: () => motionSetting.reduce,
}));

const entry = (fields: Partial<TickerEntry>): TickerEntry => ({
  key: 'project:P-1',
  ids: ['plant-1'],
  heading: 'Nebraska: Municipal',
  entityTypes: ['Municipal'],
  technologies: 'Solar PV',
  size: '$1,000',
  ...fields,
});

/** Each of the ticker's four columns is a link to the map. */
const columns = () => screen.getAllByRole('link');

afterEach(() => {
  vi.useRealTimers();
  motionSetting.reduce = false;
});

describe('NationalProjects ticker (AC-4.7, AC-0.2)', () => {
  it("shows each entry's state, entity type, icon, technologies, and size", () => {
    render(
      <NationalProjects
        entries={[
          entry({
            heading: 'Nebraska: Municipal, K-12',
            entityTypes: ['Municipal', 'K-12'],
            technologies: 'Solar PV, Battery storage',
            size: '$2,000',
          }),
        ]}
      />,
    );
    const [first] = columns();

    expect(
      within(first).getByRole('heading', { name: 'Nebraska: Municipal, K-12' }),
    ).toBeInTheDocument();
    expect(
      within(first).getByText('Solar PV, Battery storage'),
    ).toBeInTheDocument();
    expect(within(first).getByText('$2,000')).toBeInTheDocument();
    expect(within(first).getByTestId('svg-stub')).toBeInTheDocument();
  });

  it('leaves out blank values, so no lone "$" appears', () => {
    render(
      <NationalProjects
        entries={[
          entry({
            heading: '',
            entityTypes: [],
            technologies: 'BESS',
            size: '',
          }),
        ]}
      />,
    );
    const [first] = columns();

    expect(within(first).getByText('BESS')).toBeInTheDocument();
    expect(within(first).queryByRole('heading')).toBeNull();
    expect(within(first).queryByText(/\$/)).toBeNull();
    expect(within(first).queryByTestId('svg-stub')).toBeNull();
  });

  it('moves each column to its next entry every five seconds', () => {
    vi.useFakeTimers();
    render(
      <NationalProjects
        entries={['A', 'B', 'C', 'D', 'E'].map((state) =>
          entry({ key: `project:${state}`, heading: `State ${state}` }),
        )}
      />,
    );
    const [first] = columns();
    expect(
      within(first).getByRole('heading', { name: 'State A' }),
    ).toBeInTheDocument();

    act(() => vi.advanceTimersByTime(5000));

    expect(
      within(first).getByRole('heading', { name: 'State E' }),
    ).toBeInTheDocument();
  });

  it.each([
    { reduce: false, fading: 'still fades out' },
    { reduce: true, fading: 'is gone at once (NFR-002)' },
  ])('after a swap the old entry $fading when reduced motion is $reduce', async ({
    reduce,
  }) => {
    motionSetting.reduce = reduce;
    vi.useFakeTimers();
    render(
      <NationalProjects
        entries={['A', 'B', 'C', 'D', 'E'].map((state) =>
          entry({ key: `project:${state}`, heading: `State ${state}` }),
        )}
      />,
    );
    const [first] = columns();

    act(() => vi.advanceTimersByTime(5000));
    // A few frames, far less than the one-second fade. framer-motion ends an exit in a promise.
    await act(() => vi.advanceTimersByTimeAsync(100));

    const old = within(first).queryByRole('heading', { name: 'State A' });
    if (reduce) expect(old).toBeNull();
    else expect(old).toBeInTheDocument();
  });
});

type MapProject = CasestudiesQueryResult[number];

const blank: MapProject = {
  _id: '',
  id: '',
  title: null,
  plantId: null,
  plantName: null,
  projectName: null,
  projectId: null,
  projectType: null,
  projectStatus: null,
  active: true,
  hiddenAt: null,
  entity: null,
  financing: null,
  size: null,
  technologies: null,
  sizeMw: null,
  financingAmount: null,
  content: null,
  address: null,
  city: null,
  state: null,
  location: null,
  image: null,
};

describe('StickyNationalProjects on the homepage (AC-4.7)', () => {
  it('shows the map projects as ticker entries, one per Project ID', async () => {
    // The sticky ticker shows once the page scrolls past the table of contents.
    const tableOfContents = document.createElement('div');
    tableOfContents.getBoundingClientRect = () => ({ top: -10 }) as DOMRect;
    const plant = (_id: string, fields: Partial<MapProject>): MapProject => ({
      ...blank,
      _id,
      id: _id,
      projectId: 'P-100',
      state: 'Nebraska',
      entity: ['Municipal'],
      technologies: ['Solar PV'],
      ...fields,
    });

    render(
      <StickyNationalProjects
        caseStudies={[
          plant('plant-1', { size: 1200 }),
          plant('plant-2', { size: 800, entity: ['K-12'] }),
          plant('plant-3', { state: 'Iowa', hiddenAt: '2026-11-01' }),
        ]}
        footerRef={{ inView: false } as InViewHookResponse}
        tableOfContentsRef={
          {
            entry: { target: tableOfContents },
          } as unknown as InViewHookResponse
        }
      />,
    );

    expect(
      await screen.findByRole('heading', { name: 'Nebraska: Municipal, K-12' }),
    ).toBeInTheDocument();
    expect(screen.getByText('$2,000')).toBeInTheDocument();
    expect(screen.queryByText(/Iowa/)).toBeNull();
  });
});
