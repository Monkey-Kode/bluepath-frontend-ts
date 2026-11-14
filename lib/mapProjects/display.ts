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
  /** Megawatts DC, from BlueIQ's daily file. */
  sizeMw?: number | null;
  /** Dollars, from BlueIQ's daily file. */
  financingAmount?: number | null;
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

const megawatts = new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 });

/** Whole dollars without cents, and any other amount with them. */
const dollars = (amount: number) =>
  amount.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
  });

const numberOf = (value: number | null | undefined) =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

/**
 * What the panel shows for a picked marker (AC-2.4). After the category and location, it shows
 * the fields from BlueIQ's daily file, each only when filled (G2, G3).
 */
export function panelOf(project: MapProject): ProjectPanel {
  const name = displayName(project);
  const projectName = clean(project.projectName);
  const category = categoryOf(project);
  const sizeMw = numberOf(project.sizeMw);
  const financingAmount = numberOf(project.financingAmount);
  const fields: [string, string | null][] = [
    ['Category', category && CATEGORY_BY_KEY[category].label],
    ['Location', locationOf(project)],
    ['Technology / Project Type', clean(project.projectType)],
    ['Financing', financingAmount === null ? null : dollars(financingAmount)],
    ['Size', sizeMw === null ? null : `${megawatts.format(sizeMw)} MWdc`],
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
