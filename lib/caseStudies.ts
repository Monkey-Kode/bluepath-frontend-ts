/** How a case study shows its project. The archive card and the detail page share these rules. */
import { CATEGORY_BY_KEY, categoryOf } from '@/lib/categories';
import {
  displayName,
  locationOf,
  type MapProject,
} from '@/lib/mapProjects/display';

type CaseStudyProject = Pick<
  MapProject,
  | 'plantName'
  | 'projectName'
  | 'title'
  | 'projectType'
  | 'technologies'
  | 'city'
  | 'state'
>;

/** The project's category and place, such as "Solar · Lincoln, Nebraska". Either part may be missing. */
export function caseStudyLabel(
  project: CaseStudyProject | null | undefined,
): string | null {
  if (!project) return null;
  const category = categoryOf(project);
  return (
    [category && CATEGORY_BY_KEY[category].label, locationOf(project)]
      .filter(Boolean)
      .join(' · ') || null
  );
}

/** The case study's own title. A blank one uses the project's name. */
export function caseStudyTitle(caseStudy: {
  title?: string | null;
  project?: CaseStudyProject | null;
}): string {
  return (
    caseStudy.title?.trim() ||
    (caseStudy.project && displayName(caseStudy.project)) ||
    'Untitled case study'
  );
}
