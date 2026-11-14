import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  type Mock,
  vi,
} from 'vitest';
import type { FocusTarget } from '@/lib/mapProjects/mapLayer';
import type { ProjectResult, SearchProject } from '@/lib/mapProjects/search';
import type { ZipLookup } from '@/lib/mapProjects/zipLookup';
import MapSearch from './MapSearch';

const project = (
  id: string,
  fields: Partial<SearchProject>,
): SearchProject => ({
  id,
  projectType: 'Solar',
  active: true,
  hiddenAt: null,
  location: { lat: 40, lng: -100 },
  ...fields,
});

const PROJECTS = [
  project('ford', {
    plantName: 'Ford Motor Company',
    state: 'Michigan',
    location: { lat: 42.31, lng: -83.21 },
  }),
  project('stanford', {
    title: 'Stanford Solar',
    state: 'CA',
    location: { lat: 37.43, lng: -122.17 },
  }),
  project('cartwright', {
    projectName: 'Cartwright School',
    address: '6308 W Campbell Ave, Phoenix, Arizona 85033',
    state: 'Arizona',
    projectType: 'Energy Efficiency',
    location: { lat: 33.5, lng: -112.2 },
  }),
  project('hidden', { plantName: 'Ford Hidden', hiddenAt: '2026-11-01' }),
];

const PHOENIX = { lat: 33.45, lng: -112.07 };

let onPickProject: Mock<(result: ProjectResult) => void>;
let onFocus: Mock<(target: FocusTarget) => void>;
let lookup: Mock<(zip: string) => Promise<ZipLookup>>;

beforeEach(() => {
  onPickProject = vi.fn();
  onFocus = vi.fn();
  lookup = vi.fn(async () => ({ kind: 'found', point: PHOENIX }) as const);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function renderSearch() {
  const user = userEvent.setup();
  render(
    <MapSearch
      projects={PROJECTS}
      onPickProject={onPickProject}
      onFocus={onFocus}
      lookupZip={lookup}
    />,
  );
  const box = screen.getByRole('combobox', {
    name: 'Search by name, state, or ZIP code',
  });
  return { user, box };
}

const options = () =>
  screen.queryAllByRole('option').map((option) => option.textContent);
const status = () => screen.getByRole('status');
/** The message shown in place of the list. The status speaks it. */
const message = () => document.querySelector('[data-search-message]');

describe('MapSearch: one box (AC-9.1, AC-9.2)', () => {
  it('offers no mode buttons, and hints at names, states, and ZIP codes', () => {
    const { box } = renderSearch();
    expect(screen.queryByRole('button')).toBeNull();
    expect(box).toHaveAttribute('placeholder', 'Name / State / ZIP code');
  });
});

describe('MapSearch: names and places (AC-9.2, AC-9.6)', () => {
  it('lists matching plotted projects as the visitor types, and announces the count', async () => {
    const { user, box } = renderSearch();

    await user.type(box, 'f');
    expect(screen.queryByRole('listbox')).toBeNull();

    await user.type(box, 'ord');
    expect(options()).toEqual([
      expect.stringContaining('Ford Motor Company'),
      expect.stringContaining('Stanford Solar'),
    ]);
    expect(box).toHaveAttribute('aria-expanded', 'true');
    expect(status()).toHaveTextContent('2 results');
  });

  it('shows each row with its place', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'cartwright');
    // The category shows as words, never by the swatch's color alone.
    expect(options()).toEqual(['Cartwright SchoolEnergy Efficiency · Arizona']);
  });

  it('says so when nothing matches', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'zzz');
    // The message sits outside the listbox, which only ever holds options.
    expect(message()).toHaveTextContent('No projects match.');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box).toHaveAttribute('aria-expanded', 'false');
    expect(status()).toHaveTextContent('No projects match.');
  });

  it('picks a project on a click or tap, then closes the list', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'ford');

    await user.click(
      screen.getByRole('option', { name: /Ford Motor Company/ }),
    );

    expect(onPickProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ford', name: 'Ford Motor Company' }),
    );
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(box).toHaveFocus();
  });
});

describe('MapSearch: a tap on a phone (AC-9.8)', () => {
  it('drops focus after a touch pick, so the keyboard closes and the map shows', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'ford');
    const option = screen.getByRole('option', { name: /Ford Motor Company/ });

    fireEvent.pointerDown(option, { pointerType: 'touch' });
    fireEvent.click(option);

    expect(onPickProject).toHaveBeenCalledOnce();
    expect(box).not.toHaveFocus();
  });
});

describe('MapSearch: keyboard (AC-9.7)', () => {
  it('moves through the list with the arrow keys and picks with Enter', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'ford');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    const second = screen.getByRole('option', { name: /Stanford Solar/ });
    expect(box).toHaveAttribute('aria-activedescendant', second.id);
    expect(second).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowUp}{Enter}');
    expect(onPickProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'ford' }),
    );
  });

  it('scrolls the highlighted row into view', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const { user, box } = renderSearch();
    await user.type(box, 'ford');

    await user.keyboard('{ArrowDown}{ArrowDown}');

    expect(scrollIntoView).toHaveBeenLastCalledWith({ block: 'nearest' });
    expect(scrollIntoView.mock.contexts.at(-1)).toBe(
      screen.getByRole('option', { name: /Stanford Solar/ }),
    );
  });

  it('closes the list on the first Escape, and lets the second reach the page', async () => {
    const pageEscape = vi.fn();
    const onKey = (event: KeyboardEvent) => {
      // The page skips an Escape that the search handled, as Projects.tsx does.
      if (event.key === 'Escape' && !event.defaultPrevented) pageEscape();
    };
    document.addEventListener('keydown', onKey);
    const { user, box } = renderSearch();
    await user.type(box, 'ford');

    await user.keyboard('{Escape}');
    expect(screen.queryByRole('listbox')).toBeNull();
    expect(pageEscape).not.toHaveBeenCalled();
    // The browser keeps the typed text, which a search field's Escape would clear.
    expect(box).toHaveValue('ford');

    await user.keyboard('{Escape}');
    expect(pageEscape).toHaveBeenCalledOnce();
    document.removeEventListener('keydown', onKey);
  });
});

describe('MapSearch: states (AC-9.4)', () => {
  it('lists a matching state first, then fits the map to a picked state', async () => {
    const { user, box } = renderSearch();

    await user.type(box, 'ca');
    // Two letters are a code, so only California matches as a state. Projects whose name or
    // state holds "ca" follow it.
    expect(options()).toEqual([
      'CaliforniaState · 1 project',
      expect.stringContaining('Cartwright School'),
      expect.stringContaining('Stanford Solar'),
    ]);

    await user.click(screen.getByRole('option', { name: /^California/ }));
    expect(onFocus).toHaveBeenCalledWith({ kind: 'state', name: 'California' });
    expect(box).toHaveValue('California');
    expect(options()).toEqual([expect.stringContaining('Stanford Solar')]);
    expect(status()).toHaveTextContent('California: 1 project');

    await user.click(screen.getByRole('option', { name: /Stanford Solar/ }));
    expect(onPickProject).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'stanford' }),
    );
  });

  it('lists projects that name a state below the state itself', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'arizona');
    expect(options()).toEqual([
      'ArizonaState · 1 project',
      expect.stringContaining('Cartwright School'),
    ]);
  });

  it('says when a picked state has no projects', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'nev');
    expect(options()).toEqual(['NevadaState · No projects']);

    await user.click(screen.getByRole('option', { name: /^Nevada/ }));
    expect(message()).toHaveTextContent('No projects in Nevada yet.');
  });

  it('makes no call to Google for a state', async () => {
    const { user, box } = renderSearch();
    await user.type(box, 'calif');
    expect(options()).toEqual([
      'CaliforniaState · 1 project',
      expect.stringContaining('Stanford Solar'),
    ]);
    expect(lookup).not.toHaveBeenCalled();
  });
});

describe('MapSearch: ZIP codes (AC-9.5, AC-9.6)', () => {
  it('waits for five digits, asks once, centers the map, and lists the nearest projects', async () => {
    const { user, box } = renderSearch();

    // Four digits search names and addresses. Cartwright's address holds 85033.
    await user.type(box, '8503');
    expect(lookup).not.toHaveBeenCalled();
    expect(options()).toEqual([expect.stringContaining('Cartwright School')]);

    await user.type(box, '3');
    expect(lookup).toHaveBeenCalledOnce();
    expect(lookup).toHaveBeenCalledWith('85033');
    await waitFor(() =>
      expect(onFocus).toHaveBeenCalledWith({ kind: 'point', point: PHOENIX }),
    );
    expect(options()).toEqual([
      expect.stringMatching(/^Cartwright School.*8 mi$/),
      expect.stringMatching(/^Stanford Solar.*mi$/),
      expect.stringMatching(/^Ford Motor Company.*mi$/),
    ]);
    expect(onFocus).toHaveBeenCalledOnce();
  });

  it('says so for an unknown ZIP', async () => {
    lookup.mockResolvedValue({ kind: 'unknown' });
    const { user, box } = renderSearch();
    await user.type(box, '00000');
    await waitFor(() =>
      expect(message()).toHaveTextContent("We couldn't find that ZIP code."),
    );
    expect(onFocus).not.toHaveBeenCalled();
  });

  it('says ZIP lookup is unavailable when Google fails, and name search still works', async () => {
    lookup.mockResolvedValue({ kind: 'unavailable' });
    const { user, box } = renderSearch();
    await user.type(box, '85033');
    await waitFor(() =>
      expect(message()).toHaveTextContent(
        /ZIP lookup isn't available right now/,
      ),
    );

    await user.clear(box);
    await user.type(box, 'ford');
    expect(options()).toHaveLength(2);
  });

  it('ignores an answer that arrives after the visitor moved on', async () => {
    let answer: (value: ZipLookup) => void = () => {};
    lookup.mockReturnValue(
      new Promise((resolve) => {
        answer = resolve;
      }),
    );
    const { user, box } = renderSearch();
    await user.type(box, '85033');
    await user.type(box, '{Backspace}');

    await act(async () => answer({ kind: 'found', point: PHOENIX }));
    expect(onFocus).not.toHaveBeenCalled();
  });
});
