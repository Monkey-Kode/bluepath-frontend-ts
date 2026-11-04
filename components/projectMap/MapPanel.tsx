import { CATEGORY_BY_KEY, type CategoryKey } from '@/lib/categories';
import { type MapProject, panelOf } from '@/lib/mapProjects/display';
import type { PanelView } from '@/lib/mapProjects/selection';
import type { ProjectMapQueryResult } from '@/sanity.types';
import Swatch from './Swatch';

interface MapPanelProps {
  view: PanelView;
  /** The picked project, looked up by the view's id. */
  project?: MapProject;
  /** The Studio's Project Map item. It is null until an editor publishes one. */
  copy: ProjectMapQueryResult;
}

/**
 * The panel under the legend (FR-004, FR-006). It keeps one live region and one fixed height
 * through every switch, so screen readers hear each change and the content below never moves
 * (AC-2.7, AC-2.8). The height fits a project with every field at today's longest value.
 * At 320 px, that project needs 340 of the 384 px. A longer project scrolls.
 */
export default function MapPanel({ view, project, copy }: MapPanelProps) {
  return (
    <div
      aria-live="polite"
      aria-atomic="true"
      data-map-panel
      className="mx-auto h-96 max-w-3xl overflow-y-auto text-center text-base text-gray-3 tablet:h-56"
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
  return prompt ? <p className="whitespace-pre-line">{prompt}</p> : null;
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
