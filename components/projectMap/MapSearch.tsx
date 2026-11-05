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
import type { FocusTarget } from '@/lib/mapProjects/mapLayer';
import {
  isZip,
  MIN_QUERY_LENGTH,
  matchProjects,
  matchStates,
  nearestProjects,
  type ProjectResult,
  projectsInState,
  type SearchProject,
  type StateResult,
} from '@/lib/mapProjects/search';
import {
  lookupZip as siteLookupZip,
  type ZipLookup,
} from '@/lib/mapProjects/zipLookup';
import Swatch from './Swatch';

type Mode = 'plain' | 'zip' | 'state';

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

const MODES: readonly { mode: Exclude<Mode, 'plain'>; label: string }[] = [
  { mode: 'zip', label: 'ZIP Code' },
  { mode: 'state', label: 'State' },
];

const PLACEHOLDERS: Record<Mode, string> = {
  plain: 'Name or place',
  zip: 'Five-digit ZIP code',
  state: 'State name or code',
};

const projectOptions = (results: readonly ProjectResult[]): Option[] =>
  results.map((result) => ({ kind: 'project', result }));

function zipView(
  text: string,
  zip: ZipAnswer | null,
  projects: readonly SearchProject[],
): View {
  const typed = text.trim();
  if (!typed) return CLOSED;
  if (!isZip(typed))
    return { options: [], message: 'Type a five-digit ZIP code.' };
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

function stateView(
  text: string,
  chosen: StateResult | null,
  projects: readonly SearchProject[],
): View {
  if (chosen) {
    const inState = projectsInState(projects, chosen.name);
    return inState.length
      ? { options: projectOptions(inState), message: null }
      : { options: [], message: `No projects in ${chosen.name} yet.` };
  }
  if (text.trim().length < MIN_QUERY_LENGTH) return CLOSED;
  const states = matchStates(projects, text);
  return states.length
    ? {
        options: states.map((state) => ({ kind: 'state', state })),
        message: null,
      }
    : { options: [], message: 'No states match.' };
}

function plainView(text: string, projects: readonly SearchProject[]): View {
  if (text.trim().length < MIN_QUERY_LENGTH) return CLOSED;
  const results = matchProjects(projects, text);
  return results.length
    ? { options: projectOptions(results), message: null }
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
  lookupZip = siteLookupZip,
  className,
}: MapSearchProps) {
  const id = useId();
  const listId = `${id}-list`;
  const [mode, setMode] = useState<Mode>('plain');
  const [text, setText] = useState('');
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [chosenState, setChosenState] = useState<StateResult | null>(null);
  const [zip, setZip] = useState<ZipAnswer | null>(null);

  // A new parent callback on each render must not repeat a ZIP's map move.
  const focusRef = useRef(onFocus);
  focusRef.current = onFocus;

  const typedZip = mode === 'zip' && isZip(text) ? text.trim() : null;
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

  const view = useMemo(() => {
    if (mode === 'zip') return zipView(text, zip, projects);
    if (mode === 'state') return stateView(text, chosenState, projects);
    return plainView(text, projects);
  }, [mode, text, zip, chosenState, projects]);

  const shown = open && (view.options.length > 0 || view.message !== null);
  const optionId = (index: number) => `${id}-option-${index}`;

  function changeText(value: string) {
    setText(value);
    setChosenState(null);
    setActive(-1);
    setOpen(true);
  }

  function changeMode(next: Exclude<Mode, 'plain'>) {
    setMode(mode === next ? 'plain' : next);
    setText('');
    setChosenState(null);
    setActive(-1);
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
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const count = view.options.length;
    if (event.key === 'Escape' && shown) {
      // The first Escape only closes the list. The page's Escape then clears the map.
      event.stopPropagation();
      setOpen(false);
      setActive(-1);
    } else if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!shown) {
        setOpen(true);
        return;
      }
      if (!count) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current) =>
        current < 0 && step < 0 ? count - 1 : (current + step + count) % count,
      );
    } else if (event.key === 'Enter' && shown && active >= 0) {
      event.preventDefault();
      pick(view.options[active]);
    }
  }

  const announcement = shown
    ? (view.message ?? countText(view.options.length, 'result', 'results'))
    : '';

  return (
    <div
      data-map-search
      className={twMerge('relative text-sm text-legend', className)}
    >
      <label
        htmlFor={`${id}-input`}
        className="block text-xs uppercase tracking-wide"
      >
        Search
      </label>
      <input
        id={`${id}-input`}
        type="search"
        role="combobox"
        autoComplete="off"
        inputMode={mode === 'zip' ? 'numeric' : undefined}
        aria-autocomplete="list"
        aria-expanded={shown}
        aria-controls={listId}
        aria-activedescendant={
          shown && active >= 0 ? optionId(active) : undefined
        }
        placeholder={PLACEHOLDERS[mode]}
        value={text}
        onChange={(event) => changeText(event.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
        className="mt-1 block min-h-10 w-full rounded-sm border border-legend/40 bg-white px-3 text-base text-black placeholder:text-legend-faded focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
      />
      <div
        role="group"
        aria-labelledby={`${id}-category`}
        className="mt-2 flex flex-wrap items-center gap-2"
      >
        <span id={`${id}-category`} className="text-xs uppercase tracking-wide">
          Category
        </span>
        {MODES.map(({ mode: option, label }) => (
          <button
            key={option}
            type="button"
            aria-pressed={mode === option}
            onClick={() => changeMode(option)}
            className="min-h-8 cursor-pointer rounded-sm border border-legend/40 bg-white px-2 text-xs uppercase tracking-wide focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent aria-pressed:border-blue aria-pressed:bg-blue aria-pressed:text-white"
          >
            {label}
          </button>
        ))}
      </div>
      {shown && (
        <ul
          id={listId}
          role="listbox"
          aria-label="Search results"
          // Keeps focus in the box, so a click or tap on a row isn't lost to the blur.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 z-20 mt-1 max-h-72 overflow-y-auto rounded-sm border border-legend/30 bg-white shadow-lg"
        >
          {view.message !== null ? (
            <li className="px-3 py-2 text-gray-2">{view.message}</li>
          ) : (
            view.options.map((option, index) => (
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
                className="flex min-h-11 cursor-pointer items-center gap-2 px-3 py-2 aria-selected:bg-surface hover:bg-surface"
              >
                {option.kind === 'state' ? (
                  <>
                    <span className="font-semibold text-blue">
                      {option.state.name}
                    </span>
                    <span className="ml-auto text-xs">
                      {option.state.count
                        ? countText(option.state.count, 'project', 'projects')
                        : 'No projects'}
                    </span>
                  </>
                ) : (
                  <>
                    <Swatch category={option.result.category} />
                    <span className="min-w-0">
                      <span className="block font-semibold text-blue">
                        {option.result.name}
                      </span>
                      {option.result.place && (
                        <span className="block text-xs">
                          {option.result.place}
                        </span>
                      )}
                    </span>
                    {option.result.miles !== undefined && (
                      <span className="ml-auto shrink-0 text-xs">
                        {Math.round(option.result.miles)} mi
                      </span>
                    )}
                  </>
                )}
              </li>
            ))
          )}
        </ul>
      )}
      <p role="status" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
