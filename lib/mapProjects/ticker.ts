/**
 * The homepage National Projects ticker. Plants that share a Project ID form one entry, so a
 * project with several plants appears once (D-13).
 */
import { extractState, stateName } from '@/utils/extractState';
import formatNumber from '@/utils/formatNumber';
import { clean, distinct, isShown, type MapProject } from './display';

export interface TickerProject extends MapProject {
  _id: string;
  projectId?: string | null;
  address?: string | null;
}

export interface TickerEntry {
  /** The shared Project ID, or the project's own document ID when it has none. */
  key: string;
  /** The document ID of every project in the entry. */
  ids: string[];
  /** The states and entity types, such as "Nebraska: Municipal". Blank parts drop out. */
  heading: string;
  /** The entity types, which pick the entry's icon. */
  entityTypes: string[];
  /** The technologies, or a plant's Project Type when its Technologies is blank. */
  technologies: string;
  /** The added sizes, such as "$2,000". Blank when no plant has a size. */
  size: string;
}

const stateOf = (project: TickerProject) =>
  stateName(project.state) ?? extractState(project.address);

const technologiesOf = (project: TickerProject) => {
  const technologies = distinct(project.technologies);
  return technologies.length > 0 ? technologies : [clean(project.projectType)];
};

function entryOf(key: string, projects: TickerProject[]): TickerEntry {
  const states = distinct(projects.map(stateOf));
  const entityTypes = distinct(projects.flatMap(({ entity }) => entity ?? []));
  const sizes = projects
    .map(({ size }) => size)
    .filter((size): size is number => Number.isFinite(size));
  return {
    key,
    ids: projects.map(({ _id }) => _id),
    heading: [states.join(', '), entityTypes.join(', ')]
      .filter(Boolean)
      .join(': '),
    entityTypes,
    technologies: distinct(projects.flatMap(technologiesOf)).join(', '),
    size:
      sizes.length > 0
        ? `$${formatNumber(sizes.reduce((sum, size) => sum + size, 0))}`
        : '',
  };
}

/** One entry per shown project, in the order that each project first appears (AC-4.7). */
export function tickerEntries(
  projects: readonly TickerProject[],
): TickerEntry[] {
  const groups = new Map<string, TickerProject[]>();
  for (const project of projects.filter(isShown)) {
    const projectId = clean(project.projectId);
    const key = projectId ? `project:${projectId}` : `document:${project._id}`;
    groups.set(key, [...(groups.get(key) ?? []), project]);
  }
  return [...groups].map(([key, members]) => entryOf(key, members));
}
