'use client';

import {
  type KeyboardEvent,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';
import { twMerge } from 'tailwind-merge';
import { CATEGORY_BY_KEY } from '@/lib/categories';
import type { FocusTarget } from '@/lib/mapProjects/mapLayer';
import type { StateOutlines } from '@/lib/mapProjects/outlines';
import {
  isZip,
  MIN_QUERY_LENGTH,
  matchProjects,
  matchStates,
  nearestProjects,
  type ProjectResult,
  projectsInState,
  type SearchProject,
  type StateOf,
  type StateResult,
  stateByOutlines,
} from '@/lib/mapProjects/search';
import {
  lookupZip as siteLookupZip,
  type ZipLookup,
} from '@/lib/mapProjects/zipLookup';
import { MAP_OVERLAY } from './overlay';
import Swatch from './Swatch';

type Option =
  | { readonly kind: 'project'; readonly result: ProjectResult }
  | { readonly kind: 'state'; readonly state: StateResult };

interface View {
  readonly options: readonly Option[];
  /** Shows in the list instead of options, such as "No projects match." */
  readonly message: string | null;
}

/** A ZIP's answer, or null while Google looks it up. */
type ZipAnswer = { readonly zip: string; readonly answer: ZipLookup | null };

const CLOSED: View = { options: [], message: null };
const NO_MATCH = 'No projects match.';

const projectOptions = (results: readonly ProjectResult[]): Option[] =>
  results.map((result) => ({ kind: 'project', result }));

/** Five digits look up the ZIP and list the nearest projects (AC-9.5). */
function zipView(
  typed: string,
  zip: ZipAnswer | null,
  projects: readonly SearchProject[],
): View {
  const answer = zip?.zip === typed ? zip.answer : null;
  if (!answer) return { options: [], message: `Looking up ${typed}…` };
  if (answer.kind === 'unknown')
    return { options: [], message: "We couldn't find that ZIP code." };
  if (answer.kind === 'unavailable')
    return {
      options: [],
      message: "ZIP lookup isn't available right now. Try a name or a state.",
    };
  const nearest = nearestProjects(projects, answer.point);
  return nearest.length
    ? { options: projectOptions(nearest), message: null }
    : { options: [], message: NO_MATCH };
}

/**
 * One box searches names, states, and ZIP codes (AC-9.2, AC-9.4, AC-9.5). A picked state lists
 * its projects. Five digits are a ZIP. Other text lists the matching states first, then the
 * matching projects.
 */
function searchView(
  text: string,
  chosen: StateResult | null,
  zip: ZipAnswer | null,
  projects: readonly SearchProject[],
  stateOf: StateOf,
): View {
  if (chosen) {
    const inState = projectsInState(projects, chosen.name, stateOf);
    return inState.length
      ? { options: projectOptions(inState), message: null }
      : { options: [], message: `No projects in ${chosen.name} yet.` };
  }
  const typed = text.trim();
  if (typed.length < MIN_QUERY_LENGTH) return CLOSED;
  if (isZip(typed)) return zipView(typed, zip, projects);
  const options: Option[] = [
    ...matchStates(projects, typed, stateOf).map(
      (state): Option => ({ kind: 'state', state }),
    ),
    ...projectOptions(matchProjects(projects, typed)),
  ];
  return options.length
    ? { options, message: null }
    : { options: [], message: NO_MATCH };
}

const countText = (count: number, one: string, many: string) =>
  count === 1 ? `1 ${one}` : `${count} ${many}`;

interface MapSearchProps {
  /** Every map project. Search lists only the plotted ones. */
  projects: readonly SearchProject[];
  onPickProject: (result: ProjectResult) => void;
  /** A picked state or a found ZIP moves the map. */
  onFocus: (target: FocusTarget) => void;
  /** The map's state outlines, once loaded. State search then places a project by its pin. */
  outlines?: StateOutlines | null;
  /** Tests pass a fake. The site uses its one shared lookup. */
  lookupZip?: (zip: string) => Promise<ZipLookup>;
  className?: string;
}

/**
 * The map search (FR-016, Story 9). It follows the ARIA combobox pattern: the arrow keys move
 * through the list, Enter picks, and Escape closes the list before it clears the map (AC-9.7).
 */
export default function MapSearch({
  projects,
  onPickProject,
  onFocus,
  outlines = null,
  lookupZip = siteLookupZip,
  className,
}: MapSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [chosenState, setChosenState] = useState<StateResult | null>(null);
  const [zip, setZip] = useState<ZipAnswer | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  /** How the last row was picked. A tap closes the phone's keyboard, so the map shows. */
  const pointer = useRef<string | null>(null);

  // A new parent callback on each render must not repeat a ZIP's map move.
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;

  // A picked state fills the box with its name, never with digits.
  const typedZip = !chosenState && isZip(text) ? text.trim() : null;
  useEffect(() => {
    if (!typedZip) return;
    let live = true;
    setZip({ zip: typedZip, answer: null });
    lookupZip(typedZip).then((answer) => {
      if (!live) return;
      setZip({ zip: typedZip, answer });
      if (answer.kind === 'found')
        focusRef.current({ kind: 'point', point: answer.point });
    });
    return () => {
      live = false;
    };
  }, [typedZip, lookupZip]);

  const view = useMemo(
    () =>
      searchView(text, chosenState, zip, projects, stateByOutlines(outlines)),
    [text, chosenState, zip, projects, outlines],
  );

  // A message shows outside the listbox, so the listbox only ever holds options.
  const listShown = open && view.options.length > 0;
  const messageShown = open && !listShown && view.message !== null;
  const optionId = (index: number) => `${id}-option-${index}`;

  // The highlighted row stays in view as the arrow keys move through a long list.
  useEffect(() => {
    if (active >= 0)
      document
        .getElementById(`${id}-option-${active}`)
        ?.scrollIntoView?.({ block: 'nearest' });
  }, [active, id]);

  function changeText(value: string) {
    setText(value);
    setChosenState(null);
    setActive(-1);
    setOpen(true);
  }

  function pick(option: Option) {
    if (option.kind === 'state') {
      setChosenState(option.state);
      setText(option.state.name);
      setActive(-1);
      onFocus({ kind: 'state', name: option.state.name });
      return;
    }
    onPickProject(option.result);
    setOpen(false);
    setActive(-1);
    // After a tap, the keyboard would hide the map and the panel (AC-9.8). Keyboard users keep
    // focus in the box.
    if (pointer.current === 'touch') inputRef.current?.blur();
    pointer.current = null;
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    pointer.current = null;
    const count = view.options.length;
    if (event.key === 'Escape' && (listShown || messageShown)) {
      // The first Escape only closes the list. The page's Escape then clears the map. React and
      // the page both listen on the document, so the page checks `defaultPrevented`. Preventing
      // the default also stops the browser from clearing a search field.
      event.preventDefault();
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!listShown) {
        setOpen(true);
        return;
      }
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) =>
        current < 0 && step < 0 ? count - 1 : (current + step + count) % count,
      );
    } else if (event.key === 'Enter' && listShown && active >= 0) {
      event.preventDefault();
      pick(view.options[active]);
    }
  }

  const count = view.options.length;
  const announcement = messageShown
    ? view.message
    : !listShown
      ? ''
      : chosenState
        ? `${chosenState.name}: ${countText(count, 'project', 'projects')}`
        : countText(count, 'result', 'results');

  return (
    // The list hangs under the whole bar, over the map.
    <div
      data-map-search
      className={twMerge(
        MAP_OVERLAY,
        'relative flex items-center gap-3 p-2 text-sm text-legend tablet:p-3',
        className,
      )}
    >
      <label
        htmlFor={`${id}-input`}
        className="shrink-0 text-xs uppercase tracking-wide"
      >
        Search by
      </label>
      <input
        ref={inputRef}
        id={`${id}-input`}
        type="search"
        role="combobox"
        // The name starts with the visible label (WCAG 2.5.3) and says what the box takes. The
        // hint's slashes stay visual.
        aria-label="Search by name, state, or ZIP code"
        autoComplete="off"
        aria-autocomplete="list"
        aria-expanded={listShown}
        aria-controls={listId}
        aria-activedescendant={
          listShown && active >= 0 ? optionId(active) : undefined
        }
        placeholder="Name / State / ZIP code"
        value={text}
        onChange={(event) => changeText(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="block min-h-10 w-full min-w-0 flex-1 rounded-sm border border-legend-faded bg-white px-3 text-base text-black placeholder:text-legend-faded placeholder:text-xs placeholder:uppercase placeholder:tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent tablet:w-64 tablet:flex-none"
      />
      {messageShown && (
        // The status below speaks the message, so screen readers skip this copy.
        <p
          data-search-message
          aria-hidden="true"
          className="absolute inset-x-0 top-full z-20 mt-1 rounded-sm border border-legend/30 bg-white px-3 py-2 text-gray-2 shadow-lg"
        >
          {view.message}
        </p>
      )}
      {listShown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          // Keeps focus in the box, so a click or tap on a row isn't lost to the blur.
          onMouseDown={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            pointer.current = event.pointerType;
          }}
          className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-sm border border-legend/30 bg-white shadow-lg"
        >
          {view.options.map((option, index) => (
            <li
              key={
                option.kind === 'state'
                  ? `state-${option.state.code}`
                  : option.result.id
              }
              id={optionId(index)}
              role="option"
              aria-selected={index === active}
              onClick={() => pick(option)}
              className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 hover:bg-surface aria-selected:bg-surface aria-selected:outline aria-selected:outline-2 aria-selected:-outline-offset-2 aria-selected:outline-accent"
            >
              {option.kind === 'state' ? (
                <>
                  {/* An empty ring lines states up with the projects' swatches. */}
                  <span
                    aria-hidden="true"
                    className="size-3 shrink-0 rounded-full border border-legend"
                  />
                  <span className="min-w-0">
                    <span className="block font-semibold text-blue">
                      {option.state.name}
                    </span>
                    <span className="block text-xs">
                      {[
                        'State',
                        option.state.count
                          ? countText(option.state.count, 'project', 'projects')
                          : 'No projects',
                      ].join(' · ')}
                    </span>
                  </span>
                </>
              ) : (
                <>
                  <Swatch category={option.result.category} />
                  <span className="min-w-0">
                    <span className="block font-semibold text-blue">
                      {option.result.name}
                    </span>
                    {/* The category shows as words too, never by color alone. */}
                    <span className="block text-xs">
                      {[
                        CATEGORY_BY_KEY[option.result.category].label,
                        option.result.place,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </span>
                  {option.result.miles !== undefined && (
                    <span className="ml-auto shrink-0 text-xs">
                      {Math.round(option.result.miles)} mi
                    </span>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
