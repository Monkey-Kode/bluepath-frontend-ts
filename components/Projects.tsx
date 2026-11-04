'use client';

import { useEffect, useReducer, useRef, useState } from 'react';
import { twMerge } from 'tailwind-merge';
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
        'w-full',
        // Off-home (/projects): inset the map below the fixed header on desktop,
        // replacing the removed global `.page section` padding. As a home box,
        // no offset is needed.
        !fullHeight &&
          'tablet:p-[5%] tablet:pt-[calc(var(--mobile-header-height)+2rem)]',
      )}
    >
      <div ref={mapRef} className="h-[70vh] min-h-100 w-full" />
      <div className="mt-6 space-y-4 px-4 tablet:px-0">
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
