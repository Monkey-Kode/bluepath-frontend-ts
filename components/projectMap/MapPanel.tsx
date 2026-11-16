import type { ReactNode } from 'react';
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
 * The panel above the key and the legend (FR-004, FR-006). It shows a picked project or a clicked
 * legend category, so it stays out of sight until a visitor clicks (AC-2.5, AC-2.7). It keeps one
 * live region through every switch, so screen readers hear each change (AC-2.8). It grows upward
 * over the map, so the legend never moves. Long content scrolls inside it. Shown content takes
 * focus, so a keyboard user can scroll it too (WCAG 2.1.1). An empty panel takes no Tab stop.
 * Each new project or category fades in, and the box fades in with the first one. Reduced motion
 * shows both at once (NFR-002).
 */
export default function MapPanel({
  view,
  project,
  copy,
  className,
}: MapPanelProps) {
  // A picked project that is gone leaves the panel at rest.
  const shown = view.kind === 'project' && !project ? 'resting' : view.kind;
  return (
    <div
      role="region"
      aria-label="Map details"
      tabIndex={shown === 'resting' ? undefined : 0}
      aria-live="polite"
      aria-atomic="true"
      data-map-panel
      data-view={shown}
      className={twMerge(
        MAP_OVERLAY,
        'max-h-[35svh] w-full overflow-y-auto p-3 text-center text-gray-3 text-sm motion-safe:transition motion-safe:duration-300 tablet:w-xl tablet:max-w-full tablet:text-base',
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
  // A new key mounts the content afresh, so its starting style plays the fade again.
  if (view.kind === 'project' && project)
    return (
      <FadeIn key={`project-${view.id}`}>
        <ProjectDetails project={project} />
      </FadeIn>
    );
  if (view.kind === 'category')
    return (
      <FadeIn key={`category-${view.category}`}>
        <CategoryDetails
          category={view.category}
          description={copy?.categoryDescriptions?.[view.category]}
        />
      </FadeIn>
    );
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

/** The descriptions are optional. Without one, the panel still names the category. */
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

/** Fades its content in when it mounts. Reduced motion shows it at once (NFR-002). */
function FadeIn({ children }: { children: ReactNode }) {
  return (
    <div className="motion-safe:transition-opacity motion-safe:duration-300 starting:opacity-0">
      {children}
    </div>
  );
}
