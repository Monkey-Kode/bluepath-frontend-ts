'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import MapKey from '@/components/projectMap/MapKey';
import MapLegend from '@/components/projectMap/MapLegend';
import MapPanel from '@/components/projectMap/MapPanel';
import MapSearch from '@/components/projectMap/MapSearch';
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
import { idle, panelView, select } from '@/lib/mapProjects/selection';
import { loadMaps } from '@/lib/mapsLoader';
import type {
  CasestudiesQueryResult,
  PageBySlugQueryResult,
  ProjectMapQueryResult,
} from '@/sanity.types';

interface ProjectsProps {
  page: Pick<NonNullable<PageBySlugQueryResult>, 'id'>;
  casestudies: CasestudiesQueryResult;
  /** The category descriptions and the resting prompt. A home section passes none. */
  projectMap?: ProjectMapQueryResult;
  fullHeight?: boolean;
}

/**
 * The projects map with its legend and panel (FR-002 to FR-006). This component owns the
 * selection. The map layer draws it on Google's map.
 */
function Projects({
  page,
  casestudies,
  projectMap = null,
  fullHeight = false,
}: ProjectsProps) {
  const mapRef = useRef<HTMLDivElement>(null);
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
      if (event.key === 'Escape') dispatch({ type: 'escape' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  useEffect(() => {
    layer?.show(selection);
  }, [layer, selection]);

  // Without the map, a search pick still selects the project and fills the panel (AC-9.3).
  const focus = useCallback(
    (target: FocusTarget) => layer?.focus(target),
    [layer],
  );
  const pickResult = useCallback(
    ({ id, category }: ProjectResult) => {
      dispatch({ type: 'pickResult', project: { id, category } });
      focus({ kind: 'project', id });
    },
    [focus],
  );

  const view = panelView(selection);
  const picked =
    view.kind === 'project'
      ? casestudies.find((project) => project.id === view.id)
      : undefined;

  return (
    <section
      id={page.id}
      className={twMerge(
        'w-full px-5',
        // Off home (/projects), the section clears the fixed header. A home box needs no offset.
        !fullHeight && 'header-offset mx-auto max-w-7xl pb-16',
      )}
    >
      {/*
       * The frame keeps the lower 48's shape, about 9:5 in Google's projection. Its width follows
       * the screen's height, so the map, legend, and panel fit on one 1440×900 screen (AC-2.9).
       * 25.5rem covers the header gap, the search row, the legend and its gaps, the panel's 14rem,
       * and a margin.
       * It never gets narrower than 40rem, or the screen width when that is less.
       */}
      <div className="relative mx-auto w-full min-w-[min(100%,40rem)] max-w-[calc((100svh-var(--header-height,100px)-25.5rem)*9/5)]">
        {/*
         * The search sits above the map: full width below 800 px, and in one row over the map's
         * top-right corner from 800 px (AC-9.1). Over the map, it would cover the Northeast's markers.
         */}
        <MapSearch
          projects={casestudies}
          onPickProject={pickResult}
          outlines={outlines}
          onFocus={focus}
          className="mb-3 tablet:ml-auto tablet:w-fit"
        />
        <div ref={mapRef} data-map-root className="aspect-[9/5] w-full" />
        <MapKey />
      </div>
      <div className="mt-6 space-y-4">
        <MapLegend
          selection={selection}
          onPick={(category) => dispatch({ type: 'pickLegend', category })}
        />
        <MapPanel view={view} project={picked} copy={projectMap} />
      </div>
    </section>
  );
}

export default Projects;
