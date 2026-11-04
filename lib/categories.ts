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
  { key: 'solarBess', label: 'Solar + BESS', color: '#39FF14' },
  { key: 'bess', label: 'BESS', color: '#FF1493' },
];

export const CATEGORY_BY_KEY = Object.fromEntries(
  CATEGORIES.map((category) => [category.key, category]),
) as Record<CategoryKey, Category>;

const normalize = (value: string) =>
  value.trim().replace(/\s+/g, ' ').toLowerCase();

const PROJECT_TYPES = new Map<string, CategoryKey>([
  ['energy efficiency', 'energyEfficiency'],
  ['solar', 'solar'],
  ['solar + ev', 'solar'],
  ['solar + bess', 'solarBess'],
  ['bess', 'bess'],
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
 * A project's category comes from its Project Type. Only a blank Project Type falls back to
 * Technologies, so inference never overrides BlueIQ. Anything else has no category and stays
 * off the map (AC-2.11).
 */
export function categoryOf(project: {
  projectType?: string | null;
  technologies?: readonly (string | null)[] | null;
}): CategoryKey | null {
  const projectType = normalize(project.projectType ?? '');
  if (projectType) return PROJECT_TYPES.get(projectType) ?? null;
  return inferFromTechnologies(project.technologies ?? []);
}
