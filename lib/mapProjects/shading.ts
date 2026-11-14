/**
 * State shading for the projects map (FR-003, AC-2.2). The map's states and the "Plants per
 * state" key both read `SHADES`, so they always agree.
 */
import { isPlotted, type MapProject } from './display';
import { type StateOutlines, stateAt } from './outlines';

/**
 * The D-3 steps, darkest first. Each step starts at `from` projects and lasts until the next
 * step. The colors are sampled from the design's key in `.agents/specs/assets/bluepath-map.jpg`.
 */
export const SHADES = [
  { from: 1, color: '#6788B1' },
  { from: 5, color: '#7899C2' },
  { from: 10, color: '#8DABD1' },
  { from: 20, color: '#A1BEDC' },
  { from: 40, color: '#B2CEE6' },
  { from: 70, color: '#C8DEF3' },
] as const;

/** The shade for a state's count. No projects gives null, so the state keeps the base fill. */
export function shadeFor(count: number): string | null {
  return SHADES.findLast((step) => count >= step.from)?.color ?? null;
}

/**
 * Counts plotted projects per state by their coordinates, not their State field. It takes no
 * legend filter, so the shading stays fixed while a filter is on.
 */
export function countByState(
  outlines: StateOutlines,
  projects: readonly MapProject[],
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const project of projects) {
    if (!isPlotted(project)) continue;
    const state = stateAt(outlines, project.location);
    if (state) counts.set(state, (counts.get(state) ?? 0) + 1);
  }
  return counts;
}
