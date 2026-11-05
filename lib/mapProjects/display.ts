/**
 * Display rules for map projects. The map, the ticker, and case studies all read them, so a
 * project shows the same name, location, and fields everywhere.
 */
import {
  CATEGORY_BY_KEY,
  type CategoryKey,
  categoryOf,
} from '@/lib/categories';
import { stateName } from '@/utils/extractState';
import formatNumber from '@/utils/formatNumber';

type Text = string | null | undefined;
type List = readonly (string | null)[] | null | undefined;

export interface MapProject {
  plantName?: Text;
  projectName?: Text;
  title?: Text;
  projectType?: Text;
  projectStatus?: Text;
  active?: boolean | null;
  hiddenAt?: Text;
  location?: { lat?: number | null; lng?: number | null } | null;
  city?: Text;
  state?: Text;
  entity?: List;
  financing?: List;
  size?: number | null;
  technologies?: List;
}

export interface PanelField {
  label: string;
  value: string;
}

export interface ProjectPanel {
  name: string;
  /** Blank when it matches the name. */
  projectName: string | null;
  category: CategoryKey | null;
  /** In panel order, with blank fields dropped. */
  fields: PanelField[];
}

/** Trims a value and collapses its inner spaces. A missing value becomes blank. */
export const clean = (value: Text) => value?.trim().replace(/\s+/g, ' ') ?? '';

/** Trims each value and drops blanks and repeats. */
export const distinct = (values: List) => [
  ...new Set((values ?? []).map(clean).filter(Boolean)),
];

const list = (values: List) => distinct(values).join(', ');

/**
 * A blank Active counts as Yes. A project hides once it leaves BlueIQ's latest file (AC-4.5).
 * The ticker lists every shown project.
 */
export function isShown(project: MapProject) {
  return project.active !== false && !project.hiddenAt;
}

/** A marker needs a shown project with a latitude, a longitude, and a category (AC-2.1). */
export function isPlotted<T extends MapProject>(
  project: T,
): project is T & { location: google.maps.LatLngLiteral } {
  const { location } = project;
  return (
    isShown(project) &&
    Number.isFinite(location?.lat) &&
    Number.isFinite(location?.lng) &&
    categoryOf(project) !== null
  );
}

/** Plant Name, else Project Name, else the website's old title. */
export function displayName(
  project: Pick<MapProject, 'plantName' | 'projectName' | 'title'>,
) {
  return (
    [project.plantName, project.projectName, project.title]
      .map(clean)
      .find(Boolean) ?? ''
  );
}

/** The city and the state's full name, such as "Newton, Massachusetts". */
export function locationOf(project: Pick<MapProject, 'city' | 'state'>) {
  return (
    [clean(project.city), stateName(project.state)]
      .filter(Boolean)
      .join(', ') || null
  );
}

/** What the panel shows for a picked marker (AC-2.4). */
export function panelOf(project: MapProject): ProjectPanel {
  const name = displayName(project);
  const projectName = clean(project.projectName);
  const category = categoryOf(project);
  const { size } = project;
  const fields: [string, string | null][] = [
    ['Category', category && CATEGORY_BY_KEY[category].label],
    ['Status', clean(project.projectStatus)],
    ['Location', locationOf(project)],
    ['Entity type', list(project.entity)],
    ['Technologies', list(project.technologies)],
    ['Financing', list(project.financing)],
    [
      'Size',
      typeof size === 'number' && Number.isFinite(size)
        ? `$${formatNumber(size)}`
        : null,
    ],
  ];
  return {
    name,
    projectName:
      projectName && projectName.toLowerCase() !== name.toLowerCase()
        ? projectName
        : null,
    category,
    fields: fields.flatMap(([label, value]) =>
      value ? [{ label, value }] : [],
    ),
  };
}
