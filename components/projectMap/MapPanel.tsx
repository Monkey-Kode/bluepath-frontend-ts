import { twMerge } from 'tailwind-merge';
import { type MapProject, panelOf } from '@/lib/mapProjects/display';
import type { PanelView } from '@/lib/mapProjects/selection';
import type { ProjectMapQueryResult } from '@/sanity.types';
import { MAP_OVERLAY } from './overlay';

interface MapPanelProps {
  view: PanelView;
  /** The picked project, looked up by the view's id. */
  project?: MapProject;
  /** The Studio's Project Map item. It is null until an editor publishes one. */
  copy: ProjectMapQueryResult;
  className?: string;
}

/**
 * The panel above the key and the legend (FR-004, FR-006). It shows only a picked project, so it
 * stays out of sight until a visitor picks a marker or a search result (AC-2.7). It keeps one live
 * region through every switch, so screen readers hear each change (AC-2.8). It grows upward over
 * the map, so the legend never moves. A long project scrolls inside it. A shown project takes
 * focus, so a keyboard user can scroll it too (WCAG 2.1.1). An empty panel takes no Tab stop.
 */
export default function MapPanel({
  view,
  project,
  copy,
  className,
}: MapPanelProps) {
  return (
    <div
      role="region"
      aria-label="Map details"
      tabIndex={project && view.kind === 'project' ? 0 : undefined}
      aria-live="polite"
      aria-atomic="true"
      data-map-panel
      data-view={project && view.kind === 'project' ? 'project' : 'resting'}
      className={twMerge(
        MAP_OVERLAY,
        'max-h-[35svh] w-full overflow-y-auto p-3 text-center text-gray-3 text-sm tablet:w-xl tablet:max-w-full tablet:text-base',
        // At rest, the panel shows nothing. Only screen readers get the resting prompt.
        'data-[view=resting]:bg-transparent data-[view=resting]:p-0 data-[view=resting]:shadow-none data-[view=resting]:backdrop-blur-none',
        className,
      )}
    >
      <PanelContent view={view} project={project} copy={copy} />
    </div>
  );
}

function PanelContent({ view, project, copy }: MapPanelProps) {
  if (view.kind === 'project' && project)
    return <ProjectDetails project={project} />;
  const prompt = copy?.restingPrompt?.trim();
  return prompt ? <p className="sr-only">{prompt}</p> : null;
}

function ProjectDetails({ project }: { project: MapProject }) {
  const { name, projectName, fields } = panelOf(project);
  return (
    <>
      <p className="font-semibold text-blue text-h4">{name}</p>
      {projectName && <p className="text-fine">{projectName}</p>}
      {/* The fields wrap and center, one "Label: value" pair at a time, as in the design. */}
      <dl className="mt-3 flex flex-wrap justify-center gap-x-5 gap-y-1 text-fine">
        {fields.map(({ label, value }) => (
          <div key={label} className="flex gap-1">
            <dt className="text-legend after:content-[':']">{label}</dt>
            <dd className="text-black">{value}</dd>
          </div>
        ))}
      </dl>
    </>
  );
}
