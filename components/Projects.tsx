'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import { twMerge } from 'tailwind-merge';
import MapKey from '@/components/projectMap/MapKey';
import MapLegend from '@/components/projectMap/MapLegend';
import MapPanel from '@/components/projectMap/MapPanel';
import MapPreviewStop from '@/components/projectMap/MapPreviewStop';
import MapSearch from '@/components/projectMap/MapSearch';
import {
  previewCategories,
  useCategoryPreview,
} from '@/components/projectMap/useCategoryPreview';
import { NO_PADDING, paddingAround } from '@/lib/mapProjects/camera';
import {
  createMapLayer,
  type FocusTarget,
  type MapLayer,
} from '@/lib/mapProjects/mapLayer';
import {
  loadStateOutlines,
  type StateOutlines,
} from '@/lib/mapProjects/outlines';
import type { ProjectResult } from '@/lib/mapProjects/search';
import {
  idle,
  panelView,
  previewOf,
  select,
} from '@/lib/mapProjects/selection';
import { loadMaps } from '@/lib/mapsLoader';
import type {
  CasestudiesQueryResult,
  PageBySlugQueryResult,
  ProjectMapQueryResult,
} from '@/sanity.types';

interface ProjectsProps {
  page: Pick<NonNullable<PageBySlugQueryResult>, 'id'>;
  casestudies: CasestudiesQueryResult;
  /** The Studio's Project Map item, with the resting prompt. A home section passes none. */
  projectMap?: ProjectMapQueryResult;
  fullHeight?: boolean;
}

/** The map's open area keeps this gap from the map's sides. */
const SIDE_GAP = 16;

/** How far the search, panel, key, and legend reach over the map's top and bottom. */
const overlayPadding = (map: HTMLElement, overlay: HTMLElement) =>
  paddingAround(
    map.getBoundingClientRect(),
    [...overlay.children].map((part) => part.getBoundingClientRect()),
    SIDE_GAP,
  );

/** Moves keyboard focus to the legend's first entry, when the control that held it goes away. */
const focusLegend = (overlay: HTMLElement | null) =>
  overlay
    ?.querySelector<HTMLButtonElement>('[data-map-legend] button')
    ?.focus();

/** Clicks here keep the selection. Google reports clicks on the map itself (AC-2.6). */
const KEEPS_SELECTION =
  '[data-map-root], [data-map-legend], [data-map-panel], [data-map-search]';

/**
 * The projects map with its search, panel, key, and legend on top (FR-002 to FR-006). The map
 * fills the screen under the header, as in the design (AC-2.9). This component owns the
 * selection. The map layer draws it on Google's map.
 */
function Projects({
  page,
  casestudies,
  projectMap = null,
  fullHeight = false,
}: ProjectsProps) {
  const sectionRef = useRef<HTMLElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const [layer, setLayer] = useState<MapLayer | null>(null);
  const [outlines, setOutlines] = useState<StateOutlines | null>(null);
  const [selection, dispatch] = useReducer(select, idle);

  useEffect(() => {
    const element = mapRef.current;
    if (!element) return;
    let cancelled = false;
    let created: MapLayer | null = null;
    // Without the outlines, the map still shows its markers.
    const outlines = loadStateOutlines().catch((error: unknown) => {
      console.error('The state outlines failed to load:', error);
      return null;
    });
    // State search uses them even when Google Maps fails.
    outlines.then((loaded) => {
      if (!cancelled) setOutlines(loaded);
    });
    Promise.all([loadMaps(), outlines])
      .then(([libraries, stateOutlines]) => {
        if (cancelled) return;
        created = createMapLayer(element, libraries, {
          projects: casestudies,
          outlines: stateOutlines,
          onPickMarker: (project) => dispatch({ type: 'pickMarker', project }),
          onClickMap: () => dispatch({ type: 'clickMap' }),
          padding: () =>
            overlayRef.current
              ? overlayPadding(element, overlayRef.current)
              : NO_PADDING,
        });
        setLayer(created);
      })
      // The legend and the panel still work without the map.
      .catch((error: unknown) => {
        console.error('The projects map failed to load:', error);
      });
    return () => {
      cancelled = true;
      created?.destroy();
      setLayer(null);
    };
  }, [casestudies]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // The search's first Escape only closes its list (AC-9.7).
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      // An emptied panel takes no Tab stop, so focus on it would fall to the page.
      if (
        document.activeElement instanceof Element &&
        document.activeElement.closest('[data-map-panel]')
      )
        focusLegend(overlayRef.current);
      dispatch({ type: 'escape' });
    };
    // The legend has no "all" entry, so a click anywhere else turns a filter off (AC-2.6).
    // The path is the one the click took. React may already have removed the clicked element,
    // such as a search result, by the time the click reaches the document.
    const onClick = (event: MouseEvent) => {
      const kept = event
        .composedPath()
        .some(
          (node) => node instanceof Element && node.matches(KEEPS_SELECTION),
        );
      if (!kept) dispatch({ type: 'clickAway' });
    };
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('click', onClick);
    };
  }, []);

  const categories = useMemo(
    () => previewCategories(casestudies),
    [casestudies],
  );
  const { preview, stop: stopPreview } = useCategoryPreview(
    sectionRef,
    categories,
    layer !== null,
  );
  // The preview only changes the look. The selection stays idle under it.
  const shown = useMemo(
    () => (preview ? previewOf(preview) : selection),
    [preview, selection],
  );
  useEffect(() => {
    layer?.show(shown);
  }, [layer, shown]);
  const onStopPreview = (byKeyboard: boolean) => {
    stopPreview();
    // The button leaves with the preview, so keyboard focus moves to the legend it previewed.
    if (byKeyboard) focusLegend(overlayRef.current);
  };

  // A search moves the map after the panel renders, so the map frames the pick in the area that
  // the panel leaves open. Without the map, a pick still selects the project and fills the panel
  // (AC-9.3).
  const [target, setTarget] = useState<FocusTarget | null>(null);
  useEffect(() => {
    if (!layer || !target) return;
    layer.focus(target);
    setTarget(null);
  }, [layer, target]);
  const pickResult = useCallback(({ id, category }: ProjectResult) => {
    dispatch({ type: 'pickResult', project: { id, category } });
    setTarget({ kind: 'project', id });
  }, []);

  const view = panelView(selection);
  const picked =
    view.kind === 'project'
      ? casestudies.find((project) => project.id === view.id)
      : undefined;

  return (
    <section
      ref={sectionRef}
      id={page.id}
      className={twMerge(
        // From 800 px, the map always holds the stacked UI and some open map. A shorter screen
        // scrolls the page instead (AC-2.9).
        'relative h-svh min-h-[32rem] w-full tablet:min-h-[calc(var(--header-height,100px)+30rem)]',
        // Off home (/projects), the map starts under the fixed header. A home box needs no offset.
        !fullHeight && 'pt-[var(--header-height,100px)]',
      )}
    >
      <div className="relative size-full">
        <div ref={mapRef} data-map-root className="absolute inset-0" />
        {/*
         * The UI sits on top of the map in a grid that lets clicks through its gaps. The search
         * sits at the top, full width below 800 px and top right from 800 px. The panel, the key,
         * and the legend stack at the bottom. The panel sits above them and grows up over the map,
         * so the legend never moves. Below 800 px, the parts stay clear of Google's zoom buttons in
         * the right column. From 1280 px, the key moves beside the panel and the legend, to leave
         * the map more height. The bottom row clears Google's logo and attribution (AC-2.9).
         */}
        <div
          ref={overlayRef}
          className="pointer-events-none absolute inset-0 grid grid-cols-[minmax(0,1fr)_2.75rem] grid-rows-[auto_1fr_auto_auto_auto] gap-2 p-3 pb-8 [grid-template-areas:'search_search'_'._.'_'panel_.'_'key_.'_'legend_.'] tablet:grid-cols-[minmax(0,1fr)_auto] tablet:gap-3 tablet:p-4 tablet:pb-8 tablet:[grid-template-areas:'._search'_'._.'_'panel_panel'_'key_.'_'legend_legend'] xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:grid-rows-[auto_1fr_auto_auto] xl:[grid-template-areas:'._search_search'_'._._.'_'key_panel_.'_'key_legend_.']"
        >
          <MapSearch
            projects={casestudies}
            onPickProject={pickResult}
            outlines={outlines}
            onFocus={setTarget}
            // The results list hangs over the legend and the panel, so the search draws above them.
            className="pointer-events-auto z-10 [grid-area:search] tablet:justify-self-end"
          />
          <MapKey className="pointer-events-auto [grid-area:key] justify-self-start xl:self-end" />
          <MapLegend
            selection={selection}
            shown={shown}
            onPick={(category) => dispatch({ type: 'pickLegend', category })}
            // From 1280 px, the taller key spans the panel's row and this one. Sitting at the row's
            // bottom keeps the legend still when the panel empties (AC-2.7).
            className="pointer-events-auto self-end [grid-area:legend] justify-self-center"
          />
          {/* While the preview runs, the panel is empty, so its stop button takes the panel's place. */}
          {preview && (
            <MapPreviewStop
              onStop={onStopPreview}
              className="pointer-events-auto self-end [grid-area:panel] justify-self-center"
            />
          )}
          {/*
           * The panel sits above the legend but follows it in the page, so Tab moves from a legend
           * entry to the picked project.
           */}
          <MapPanel
            view={view}
            project={picked}
            copy={projectMap}
            className="pointer-events-auto self-end [grid-area:panel] justify-self-center"
          />
        </div>
      </div>
    </section>
  );
}

export default Projects;
