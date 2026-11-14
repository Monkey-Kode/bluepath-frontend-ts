import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { flushSync } from 'react-dom';
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
import {
  destroyIntersectionMocking,
  mockAllIsIntersecting,
  setupIntersectionMocking,
} from 'react-intersection-observer/test-utils';
import { fakeMaps } from '@/test/fakeMaps';
import { PREVIEW_STEP_MS } from './projectMap/useCategoryPreview';
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

const searchBox = () =>
  screen.getByRole('combobox', { name: 'Search by name, state, or ZIP code' });

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
    expect(legendEntry('Battery')).toHaveAttribute('data-look', 'match');
    expect(legendEntry('Solar')).toHaveAttribute('data-look', 'faded');
  });

  it('shows a picked project in the panel, never in a Google popup (AC-0.2)', async () => {
    const InfoWindow = vi.fn();
    vi.stubGlobal('google', { maps: { InfoWindow } });
    await show();
    act(() => fake.marker('Sun Farm').pick());

    expect(within(panel()).getByText('Sun Farm')).toBeVisible();
    expect(InfoWindow).not.toHaveBeenCalled();
  });

  it('puts the panel right after the legend, so Tab goes from a legend entry to the picked project (AC-2.8)', async () => {
    const user = userEvent.setup();
    await show();
    act(() => fake.marker('Cell Bank').pick());
    // Battery is the legend's last entry.
    act(() => legendEntry('Battery').focus());
    await user.tab();

    expect(panel()).toHaveFocus();
  });

  it('filters by a legend category and leaves the panel at rest (AC-2.5)', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(legendEntry('Battery'));

    expect(legendEntry('Battery')).toHaveAttribute('aria-pressed', 'true');
    expect(fake.marker('Cell Bank').map).toBe(fake.map());
    expect(fake.marker('Sun Farm').map).toBeNull();
    expect(fake.marker('Isle Array').map).toBeNull();
    // Only a picked project opens the panel.
    expect(panel()).toHaveAttribute('data-view', 'resting');
    expect(panel().textContent).toBe(copy.restingPrompt);
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

  // The legend has no "all" entry, so a click anywhere else turns a filter off.
  it('returns to the resting prompt after a click outside the map and its UI', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(legendEntry('Battery'));
    await user.click(document.querySelector('[data-map-key]') as Element);

    expect(panel()).toHaveTextContent(copy.restingPrompt);
    expect(legendEntry('Battery')).toHaveAttribute('aria-pressed', 'false');

    act(() => fake.marker('Cell Bank').pick());
    await user.click(document.body);
    expect(panel()).toHaveTextContent(copy.restingPrompt);
  });

  it('keeps the selection on a click in the panel, the legend, or the search', async () => {
    const user = userEvent.setup();
    await show();
    act(() => fake.marker('Cell Bank').pick());
    await user.click(within(panel()).getByText('Cell Bank'));
    await user.click(searchBox());
    await user.click(
      screen.getByRole('list', { name: 'Filter the map by category' }),
    );

    expect(within(panel()).getByText('Cell Bank')).toBeVisible();
    expect(fake.marker('Cell Bank').look).toBe('selected');
  });

  // Google reports map clicks itself, and skips the click at the end of a drag.
  it('leaves clicks on the map to Google', async () => {
    const user = userEvent.setup();
    await show();
    act(() => fake.marker('Cell Bank').pick());
    await user.click(fake.map().element);

    expect(fake.marker('Cell Bank').look).toBe('selected');
  });

  it('moves focus to the legend when Escape empties a focused panel', async () => {
    const user = userEvent.setup();
    await show();
    act(() => fake.marker('Cell Bank').pick());
    act(() => panel().focus());
    expect(panel()).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(panel()).toHaveAttribute('data-view', 'resting');
    expect(legendEntry('Energy Efficiency')).toHaveFocus();
  });

  it('returns to the resting prompt on Escape', async () => {
    const user = userEvent.setup();
    await show();
    await user.click(legendEntry('Battery'));
    await user.keyboard('{Escape}');

    expect(panel()).toHaveTextContent(copy.restingPrompt);
    expect(legendEntry('Battery')).toHaveAttribute('aria-pressed', 'false');
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

describe('Projects map search (AC-9.3, AC-9.9)', () => {
  const searchFor = async (text: string) => {
    const user = userEvent.setup();
    await user.type(searchBox(), text);
    return user;
  };

  it('zooms to a searched project and shows it as a click would', async () => {
    await show();
    const user = await searchFor('cell');

    await user.click(screen.getByRole('option', { name: /Cell Bank/ }));

    expect(within(panel()).getByText('Cell Bank')).toBeVisible();
    expect(fake.marker('Cell Bank').look).toBe('selected');
    // With no size in the test DOM, nothing covers the map, so the marker lands in the middle.
    expect(fake.map().center?.lat).toBeCloseTo(35, 9);
    expect(fake.map().center?.lng).toBeCloseTo(-90, 9);
    // Google gets plain coordinates, without the geopoint's `_type`.
    expect(fake.marker('Cell Bank').position).toEqual({ lat: 35, lng: -90 });
  });

  // A browser runs React's update between listeners for a real click, so the list is gone
  // before the click reaches the page. The body listener does the same here.
  it('keeps a pick from the list, which closes before the click reaches the page', async () => {
    await show();
    await searchFor('cell');
    const row = within(
      screen.getByRole('option', { name: /Cell Bank/ }),
    ).getByText('Cell Bank');
    const flush = () => flushSync(() => {});
    document.body.addEventListener('click', flush, { once: true });

    row.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(row.isConnected).toBe(false);

    await waitFor(() =>
      expect(within(panel()).getByText('Cell Bank')).toBeVisible(),
    );
    expect(fake.marker('Cell Bank').look).toBe('selected');
  });

  it('clears a legend filter that hides the picked project', async () => {
    await show();
    const user = userEvent.setup();
    await user.click(legendEntry('Solar'));
    expect(fake.marker('Cell Bank').look).toBe('hidden');

    await searchFor('cell');
    await user.click(screen.getByRole('option', { name: /Cell Bank/ }));

    expect(legendEntry('Solar')).toHaveAttribute('aria-pressed', 'false');
    expect(fake.marker('Cell Bank').look).toBe('selected');
    expect(fake.marker('Sun Farm').look).toBe('dimmed');
  });

  it('still selects a searched project when Google Maps fails to load', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
    loadMapsMock.mockRejectedValue(new Error('RefererNotAllowedMapError'));
    render(<Projects page={{ id: 'projects' }} casestudies={casestudies} />);
    const user = await searchFor('sun');

    await user.click(screen.getByRole('option', { name: /Sun Farm/ }));

    expect(within(panel()).getByText('Sun Farm')).toBeVisible();
  });

  it('counts a project under the state its pin falls in, as the shading does', async () => {
    fetchMock.mockImplementation(async () =>
      Response.json({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            properties: { name: 'Kansas' },
            geometry: {
              type: 'Polygon',
              coordinates: [
                [
                  [-92, 33],
                  [-88, 33],
                  [-88, 37],
                  [-92, 37],
                  [-92, 33],
                ],
              ],
            },
          },
        ],
      } satisfies StateOutlines),
    );
    await show();
    await searchFor('kansas');

    // Cell Bank has no State field. Its pin at 35, -90 sits inside the Kansas outline.
    expect(screen.getByRole('option', { name: /^Kansas/ })).toHaveTextContent(
      '1 project',
    );
  });

  it('sends no request to Sanity, only the outlines file', async () => {
    await show();
    const user = await searchFor('farm');
    await user.click(screen.getByRole('option', { name: /Sun Farm/ }));

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      STATE_OUTLINES_URL,
    ]);
  });
});

describe('Projects map Escape with the search (AC-9.7)', () => {
  it('keeps the selection on an Escape that the search already handled', async () => {
    await show();
    act(() => fake.marker('Cell Bank').pick());

    const handled = new KeyboardEvent('keydown', {
      key: 'Escape',
      cancelable: true,
    });
    handled.preventDefault();
    act(() => {
      document.dispatchEvent(handled);
    });
    expect(within(panel()).getByText('Cell Bank')).toBeVisible();

    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(within(panel()).queryByText('Cell Bank')).toBeNull();
  });
});

describe('Projects map category preview', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    setupIntersectionMocking(vi.fn);
  });

  afterEach(() => {
    destroyIntersectionMocking();
    vi.useRealTimers();
  });

  const step = () =>
    act(() => {
      vi.advanceTimersByTime(PREVIEW_STEP_MS);
    });
  /** Puts the map on screen. Act applies the state change at once. */
  const onScreen = () =>
    act(() => {
      mockAllIsIntersecting(true);
    });
  const stopButton = () =>
    screen.queryByRole('button', { name: 'Stop the category preview' });

  it('shows each category on its own, then the full map, without a selection', async () => {
    await show();
    onScreen();

    // The test map has Solar and Battery projects, so the preview shows those two.
    expect(fake.marker('Sun Farm').map).toBe(fake.map());
    expect(fake.marker('Isle Array').map).toBe(fake.map());
    expect(fake.marker('Cell Bank').map).toBeNull();
    expect(legendEntry('Solar')).toHaveAttribute('data-look', 'filter');
    // The preview is a look. No entry is pressed, and the panel stays at rest.
    expect(legendEntry('Solar')).toHaveAttribute('aria-pressed', 'false');
    expect(panel()).toHaveAttribute('data-view', 'resting');
    expect(stopButton()).toBeVisible();

    step();
    expect(fake.marker('Cell Bank').map).toBe(fake.map());
    expect(fake.marker('Sun Farm').map).toBeNull();
    expect(legendEntry('Battery')).toHaveAttribute('data-look', 'filter');

    step();
    for (const marker of fake.markers) {
      expect(marker.map).toBe(fake.map());
      expect(marker.look).toBe('normal');
    }
    expect(legendEntry('Solar')).toHaveAttribute('data-look', 'normal');
    expect(stopButton()).toBeNull();
  });

  it('ends when the visitor picks a marker, and shows the pick', async () => {
    await show();
    onScreen();
    act(() => {
      fireEvent.pointerDown(fake.map().element);
    });
    // The look holds through the press, so the click lands on the marker the visitor saw.
    expect(fake.marker('Cell Bank').map).toBeNull();

    act(() => {
      fireEvent.pointerUp(window);
      fake.marker('Sun Farm').pick();
    });
    act(() => {
      vi.advanceTimersByTime(0);
    });

    expect(stopButton()).toBeNull();
    expect(fake.marker('Sun Farm').look).toBe('selected');
    expect(fake.marker('Cell Bank').map).toBe(fake.map());
    expect(within(panel()).getByText('Sun Farm')).toBeVisible();
  });

  it('stops on its button, and moves keyboard focus to the legend', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    await show();
    onScreen();
    act(() => stopButton()?.focus());
    await user.keyboard('{Enter}');

    expect(stopButton()).toBeNull();
    for (const marker of fake.markers) expect(marker.look).toBe('normal');
    expect(legendEntry('Energy Efficiency')).toHaveFocus();
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
    expect(legendEntry('Battery')).toBeVisible();
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
