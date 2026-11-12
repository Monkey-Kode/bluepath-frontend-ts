/**
 * The map's four project categories. Markers, legend swatches, and the panel all read this one
 * definition. The keys match the description fields in the Studio's `projectMap` singleton.
 */

export type CategoryKey = 'energyEfficiency' | 'solar' | 'solarBess' | 'bess';

export interface Category {
  key: CategoryKey;
  label: string;
  color: string;
}

/** In legend order. */
export const CATEGORIES: readonly Category[] = [
  { key: 'energyEfficiency', label: 'Energy Efficiency', color: '#00FFFF' },
  { key: 'solar', label: 'Solar', color: '#F5A623' },
  { key: 'solarBess', label: 'Solar + Battery', color: '#39FF14' },
  { key: 'bess', label: 'Battery', color: '#FF1493' },
];

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category]),
) as Record<CategoryKey, Category>;

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

/** BlueIQ's older names from the starter workbook, then its names in the daily file (D-44). */
const PROJECT_TYPES = new Map<string, CategoryKey>([
  ['energy efficiency', 'energyEfficiency'],
  ['solar', 'solar'],
  ['solar + ev', 'solar'],
  ['solar + bess', 'solarBess'],
  ['bess', 'bess'],
  ['solar + battery', 'solarBess'],
  ['battery', 'bess'],
]);

const SOLAR = /\bsolar\b/;
const STORAGE = /\b(storage|battery|bess)\b/;
const EFFICIENCY =
  /\b(lighting|controls|hvac|water|building envelope|piping)\b/;

function inferFromTechnologies(
  technologies: readonly (string | null)[],
): CategoryKey | null {
  const values = technologies.flatMap((value) =>
    value ? [normalize(value)] : [],
  );
  const solar = values.some((value) => SOLAR.test(value));
  const storage = values.some((value) => STORAGE.test(value));
  if (solar) return storage ? 'solarBess' : 'solar';
  if (storage) return 'bess';
  return values.some((value) => EFFICIENCY.test(value))
    ? 'energyEfficiency'
    : null;
}

/**
 * True for a blank Project Type and for BlueIQ's "Other" (G4). Both take their category from
 * Technologies.
 */
export function fallsBackToTechnologies(
  projectType: string | null | undefined,
) {
  const type = normalize(projectType ?? '');
  return type === '' || type === 'other';
}

/**
 * A project's category comes from its Project Type. Only a blank or "Other" Project Type falls
 * back to Technologies, so inference never overrides BlueIQ. Anything else has no category and
 * stays off the map (AC-2.11).
 */
export function categoryOf(project: {
  projectType?: string | null;
  technologies?: readonly (string | null)[] | null;
}): CategoryKey | null {
  if (fallsBackToTechnologies(project.projectType)) {
    return inferFromTechnologies(project.technologies ?? []);
  }
  return PROJECT_TYPES.get(normalize(project.projectType ?? '')) ?? null;
}
