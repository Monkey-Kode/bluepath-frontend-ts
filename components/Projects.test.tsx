import { act, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  type StateOutlines,
  STATE_OUTLINES_URL,
} from '@/lib/mapProjects/outlines';
import { loadMaps, type MapsLibraries } from '@/lib/mapsLoader';
import type {
  CasestudiesQueryResult,
  ProjectMapQueryResult,
} from '@/sanity.types';
import { fakeMaps } from '@/test/fakeMaps';
import Projects from './Projects';

vi.mock('@/lib/mapsLoader', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/mapsLoader')>()),
  loadMaps: vi.fn(),
}));

type CaseStudy = CasestudiesQueryResult[number];

const blank: CaseStudy = {
  _id: '',
  id: '',
  title: null,
  plantName: null,
  projectName: null,
  projectType: null,
  projectStatus: null,
  active: true,
  hiddenAt: null,
  entity: null,
  financing: null,
  size: null,
  technologies: null,
  content: null,
  address: null,
  city: null,
  state: null,
  location: null,
  image: null,
};

const at = (lat: number, lng: number) => ({
  _type: 'geopoint' as const,
  lat,
  lng,
});

const casestudies: CaseStudy[] = [
  {
    ...blank,
    _id: 'sun',
    id: 'sun',
    plantName: 'Sun Farm',
    projectType: 'Solar',
    location: at(40, -100),
  },
  {
    ...blank,
    _id: 'cell',
    id: 'cell',
    plantName: 'Cell Bank',
    projectType: 'BESS',
    location: at(35, -90),
  },
  {
    ...blank,
    _id: 'isle',
    id: 'isle',
    plantName: 'Isle Array',
    projectType: 'Solar',
    location: at(21.3, -157.8),
  },
];

const copy = {
  restingPrompt: 'Pick a marker or a category to learn more.',
  categoryDescriptions: {
    energyEfficiency: null,
    solar: null,
    solarBess: null,
    bess: 'Batteries store power for later.',
  },
} satisfies ProjectMapQueryResult;

const outlines = {
  type: 'FeatureCollection',
  features: [
    {
      type: 'Feature',
      properties: { name: 'Westland' },
      geometry: {
        type: 'Polygon',
        coordinates: [
          [
            [-105, 35],
            [-95, 35],
            [-95, 45],
            [-105, 45],
            [-105, 35],
          ],
        ],
      },
    },
  ],
} satisfies StateOutlines;

const loadMapsMock = vi.mocked(loadMaps);
let fake: ReturnType<typeof fakeMaps>;
let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fake = fakeMaps();
  loadMapsMock.mockReset();
  loadMapsMock.mockResolvedValue(fake.libraries);
  fetchMock = vi.fn(async () => Response.json(outlines));
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

/** The panel's one live region. */
const panel = () => {
  const region = document.querySelector<HTMLElement>('[aria-live]');
  if (!region) throw new Error('The panel is missing.');
  return region;
};

const legendEntry = (name: string) => screen.getByRole('button', { name });

/** Renders the map and waits until the layer shows the first selection. */
const show = async () => {
  const view = render(
    <Projects
      page={{ id: 'projects' }}
      casestudies={casestudies}
      projectMap={copy}
    />,
  );
  await waitFor(() => {
    expect(fake.markers).toHaveLength(3);
    for (const marker of fake.markers) expect(marker.look).toBe('normal');
  });
  return view;
};

describe('Projects map selection (AC-2.4 to AC-2.7)', () => {
  it('shows the picked project in the panel and marks its marker and category', async () => {
    await show();
    act(() => fake.marker('Cell Bank').pick());

    expect(within(panel()).getByText('Cell Bank')).toBeVisible();
    expect(fake.marker('Cell Bank').look).toBe('selected');
    expect(fake.marker('Sun Farm').look).toBe('dimmed');
    expect(legendEntry('BESS')).toHaveAttribute('data-look', 'match');
    expect(legendEntry('Solar')).toHaveAttribute('data-look', 'faded');
  });

  it('filters by a legend category and shows its description', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(legendEntry('BESS'));

    expect(legendEntry('BESS')).toHaveAttribute('aria-pressed', 'true');
    expect(fake.marker('Cell Bank').map).toBe(fake.map());
    expect(fake.marker('Sun Farm').map).toBeNull();
    expect(fake.marker('Isle Array').map).toBeNull();
    expect(
      within(panel()).getByText('Batteries store power for later.'),
    ).toBeVisible();
  });

  it('returns to the resting prompt after a click on empty map', async () => {
    await show();
    act(() => fake.marker('Cell Bank').pick());
    act(() =>
      fake.map().trigger('click', { domEvent: { target: fake.map().element } }),
    );

    expect(panel()).toHaveTextContent(copy.restingPrompt);
    for (const marker of fake.markers) expect(marker.look).toBe('normal');
  });

  it('returns to the resting prompt on Escape', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(legendEntry('BESS'));
    await user.keyboard('{Escape}');

    expect(panel()).toHaveTextContent(copy.restingPrompt);
    expect(legendEntry('BESS')).toHaveAttribute('aria-pressed', 'false');
    for (const marker of fake.markers) expect(marker.map).toBe(fake.map());
  });

  it('keeps the selection while the visitor pans and zooms', async () => {
    await show();
    act(() => fake.marker('Cell Bank').pick());
    act(() => {
      for (const name of [
        'dragstart',
        'drag',
        'dragend',
        'zoom_changed',
        'center_changed',
        'bounds_changed',
        'idle',
      ])
        fake.map().trigger(name);
    });

    expect(within(panel()).getByText('Cell Bank')).toBeVisible();
    expect(fake.marker('Cell Bank').look).toBe('selected');
  });
});

describe('Projects map loading', () => {
  it('draws the state outlines from the outlines file', async () => {
    await show();
    expect(fetchMock).toHaveBeenCalledExactlyOnceWith(STATE_OUTLINES_URL);
    expect(fake.map().data.added).toEqual([outlines]);
  });

  it('keeps the section anchor for in-page links', async () => {
    await show();
    expect(document.getElementById('projects')?.tagName).toBe('SECTION');
  });

  it('still plots the markers when the outlines fail to load', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response('missing', { status: 404 }));
    await show();

    expect(fake.map().data.added).toEqual([]);
    expect(logged).toHaveBeenCalledWith(
      'The state outlines failed to load:',
      expect.any(Error),
    );
  });

  it('keeps the legend and the panel when Google Maps fails to load', async () => {
    const logged = vi.spyOn(console, 'error').mockImplementation(() => {});
    const failure = new Error('The key is not allowed here.');
    loadMapsMock.mockRejectedValue(failure);
    render(
      <Projects
        page={{ id: 'projects' }}
        casestudies={casestudies}
        projectMap={copy}
      />,
    );

    await waitFor(() =>
      expect(logged).toHaveBeenCalledWith(
        'The projects map failed to load:',
        failure,
      ),
    );
    expect(legendEntry('BESS')).toBeVisible();
    expect(panel()).toHaveTextContent(copy.restingPrompt);
  });

  it('takes the markers off the map when the section unmounts', async () => {
    const { unmount } = await show();
    unmount();
    for (const marker of fake.markers) expect(marker.map).toBeNull();
  });

  it('draws no map when the section unmounts before Google Maps loads', async () => {
    let finish: (libraries: MapsLibraries) => void = () => {};
    loadMapsMock.mockReturnValue(
      new Promise((resolve) => {
        finish = resolve;
      }),
    );
    const { unmount } = render(
      <Projects
        page={{ id: 'projects' }}
        casestudies={casestudies}
        projectMap={copy}
      />,
    );
    unmount();
    await act(async () => finish(fake.libraries));

    expect(fake.maps).toHaveLength(0);
  });
});
