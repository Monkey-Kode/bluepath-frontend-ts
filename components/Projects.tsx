'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
import MapKey from '@/components/projectMap/MapKey';
import MapLegend from '@/components/projectMap/MapLegend';
import MapPanel from '@/components/projectMap/MapPanel';
import { createMapLayer, type MapLayer } from '@/lib/mapProjects/mapLayer';
import { loadStateOutlines } from '@/lib/mapProjects/outlines';
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
       * 21rem covers the header gap, the legend and its gaps, the panel's 14rem, and a margin.
       * It never gets narrower than 40rem, or the screen width when that is less.
       */}
      <div className="relative mx-auto w-full min-w-[min(100%,40rem)] max-w-[calc((100svh-var(--header-height,100px)-21rem)*9/5)]">
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
