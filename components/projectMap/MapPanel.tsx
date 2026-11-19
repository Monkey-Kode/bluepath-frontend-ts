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
 * The panel above the key and the legend (FR-004, FR-006). It shows a picked project, or a clicked
 * legend category that has a description, so it stays out of sight until a visitor clicks (AC-2.5,
 * AC-2.7). It keeps one live region through every switch, so screen readers hear each change
 * (AC-2.8). It grows upward over the map, so the legend never moves. Long content scrolls inside it. Shown content takes
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
  const description =
    view.kind === 'category'
      ? copy?.categoryDescriptions?.[view.category]?.trim()
      : undefined;
  // A picked project that is gone leaves the panel at rest. So does a category without a
  // description, because its name alone repeats the legend (Nov 16).
  const shown =
    (view.kind === 'project' && !project) ||
    (view.kind === 'category' && !description)
      ? 'resting'
      : view.kind;
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
        'data-[view=resting]:bg-transparent data-[view=resting]:p-0 data-[view=resting]:backdrop-blur-none',
        className,
      )}
    >
      <PanelContent
        view={view}
        project={project}
        copy={copy}
        description={description}
      />
    </div>
  );
}

function PanelContent({
  view,
  project,
  copy,
  description,
}: Omit<MapPanelProps, 'className'> & { description: string | undefined }) {
  // A new key mounts the content afresh, so its starting style plays the fade again.
  if (view.kind === 'project' && project)
    return (
      <FadeIn key={`project-${view.id}`}>
        <ProjectDetails project={project} />
      </FadeIn>
    );
  if (view.kind === 'category' && description)
    return (
      <FadeIn key={`category-${view.category}`}>
        <CategoryDetails category={view.category} description={description} />
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

/** A category's name above its editor's description. */
function CategoryDetails({
  category,
  description,
}: {
  category: CategoryKey;
  description: string;
}) {
  return (
    <>
      <p className="flex items-center justify-center gap-2 font-semibold text-blue text-h4">
        <Swatch category={category} />
        {CATEGORY_BY_KEY[category].label}
      </p>
      <p className="mt-2 whitespace-pre-line">{description}</p>
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
