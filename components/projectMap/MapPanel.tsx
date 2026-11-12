import { twMerge } from 'tailwind-merge';
import { CATEGORY_BY_KEY, type CategoryKey } from '@/lib/categories';
import { type MapProject, panelOf } from '@/lib/mapProjects/display';
import type { PanelView } from '@/lib/mapProjects/selection';
import type { ProjectMapQueryResult } from '@/sanity.types';
import { MAP_OVERLAY } from './overlay';
import Swatch from './Swatch';

interface MapPanelProps {
  view: PanelView;
  /** The picked project, looked up by the view's id. */
  project?: MapProject;
  /** The Studio's Project Map item. It is null until an editor publishes one. */
  copy: ProjectMapQueryResult;
  className?: string;
}

/**
 * The panel above the key and the legend (FR-004, FR-006). It keeps one live region through every
 * switch, so screen readers hear each change (AC-2.7, AC-2.8). It grows upward over the map, so
 * the legend never moves. With nothing to show, it takes no room. A long project scrolls inside
 * it. The panel takes focus, so a keyboard user can scroll it too (WCAG 2.1.1).
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
      tabIndex={0}
      aria-live="polite"
      aria-atomic="true"
      data-map-panel
      data-view={view.kind}
      className={twMerge(
        MAP_OVERLAY,
        'max-h-[35svh] w-full overflow-y-auto p-3 text-center text-gray-3 text-sm tablet:w-xl tablet:max-w-full tablet:text-base empty:bg-transparent empty:p-0 empty:shadow-none empty:backdrop-blur-none',
        // On a phone, the resting prompt would cover the map, so only screen readers get it.
        'max-tablet:data-[view=resting]:bg-transparent max-tablet:data-[view=resting]:p-0 max-tablet:data-[view=resting]:shadow-none max-tablet:data-[view=resting]:backdrop-blur-none',
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
  if (view.kind === 'category')
    return (
      <CategoryDetails
        category={view.category}
        description={copy?.categoryDescriptions?.[view.category]}
      />
    );
  const prompt = copy?.restingPrompt?.trim();
  return prompt ? (
    <p className="whitespace-pre-line max-tablet:sr-only">{prompt}</p>
  ) : null;
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

function CategoryDetails({
  category,
  description,
}: {
  category: CategoryKey;
  description: string | null | undefined;
}) {
  const text = description?.trim();
  return (
    <>
      <p className="flex items-center justify-center gap-2 font-semibold text-blue text-h4">
        <Swatch category={category} />
        {CATEGORY_BY_KEY[category].label}
      </p>
      {text && <p className="mt-2 whitespace-pre-line">{text}</p>}
    </>
  );
}
