/**
 * Map search (FR-016, AC-9.2, AC-9.4, AC-9.5). It filters the projects that the page already
 * loads, so a search sends no request to Sanity (AC-9.9). Only plotted projects match, because a
 * pick zooms to a marker.
 */
import { type CategoryKey, categoryOf } from '@/lib/categories';
import { STATE_ABBREVIATIONS, stateName } from '@/utils/extractState';
import {
  clean,
  displayName,
  isPlotted,
  locationOf,
  type MapProject,
} from './display';
import { type StateOutlines, stateAt } from './outlines';

/** Plain and State search start at two characters (D-43). */
export const MIN_QUERY_LENGTH = 2;

/** Plain and ZIP Code search list at most this many projects (AC-9.2, AC-9.5). */
export const MAX_RESULTS = 10;

export interface SearchProject extends MapProject {
  id: string;
  address?: string | null;
}

export interface ProjectResult {
  id: string;
  name: string;
  category: CategoryKey;
  /** The city and state, such as "Phoenix, Arizona", or null. */
  place: string | null;
  /** The distance from a searched ZIP. Only ZIP Code search sets it. */
  miles?: number;
}

export interface StateResult {
  code: string;
  name: string;
  /** The state's plotted projects. A state without any still matches, so the list can say so. */
  count: number;
}

/** The 50 states and DC, by two-letter code. */
const US_STATES = Object.entries(STATE_ABBREVIATIONS);

/** Gives the full name of the state that a plotted project belongs to, or null. */
export type StateOf = (
  project: SearchProject,
  location: google.maps.LatLngLiteral,
) => string | null;

/**
 * State search places a project by its pin, as the shading does (AC-2.2). So a picked state's
 * count and list match the map. A pin outside every outline, or a failed outlines load, falls back
 * to the State field.
 */
export function stateByOutlines(outlines: StateOutlines | null): StateOf {
  return (project, location) =>
    (outlines && stateAt(outlines, location)) || stateName(project.state);
}

const byField = stateByOutlines(null);

const normalize = (text: string | null | undefined) =>
  clean(text).toLowerCase();

interface Plotted {
  project: SearchProject;
  category: CategoryKey;
  location: google.maps.LatLngLiteral;
}

function plotted(projects: readonly SearchProject[]): Plotted[] {
  return projects.flatMap((project) => {
    if (!isPlotted(project)) return [];
    const category = categoryOf(project);
    return category ? [{ project, category, location: project.location }] : [];
  });
}

const resultOf = ({ project, category }: Plotted): ProjectResult => ({
  id: project.id,
  name: displayName(project),
  category,
  place: locationOf(project),
});

const byName = (a: ProjectResult, b: ProjectResult) =>
  a.name.localeCompare(b.name);

/** The text a plain search looks in. Each field stays apart, so a match never spans two. */
function searchText(project: SearchProject) {
  return [
    project.plantName,
    project.projectName,
    project.title,
    project.address,
    project.city,
    stateName(project.state),
  ]
    .map(normalize)
    .join('\n');
}

/** A name that starts with the text comes first, then a name with a word that does. */
function rank(name: string, query: string) {
  const lower = name.toLowerCase();
  if (lower.startsWith(query)) return 0;
  return lower.split(' ').some((word) => word.startsWith(query)) ? 1 : 2;
}

/** Plotted projects whose name or place holds the text (AC-9.2). */
export function matchProjects(
  projects: readonly SearchProject[],
  text: string,
): ProjectResult[] {
  const query = normalize(text);
  if (query.length < MIN_QUERY_LENGTH) return [];
  return plotted(projects)
    .filter(({ project }) => searchText(project).includes(query))
    .map(resultOf)
    .sort((a, b) => rank(a.name, query) - rank(b.name, query) || byName(a, b))
    .slice(0, MAX_RESULTS);
}

/**
 * States whose code is the text, or whose name starts with it (AC-9.4). From three characters, a
 * word inside the name counts too, so "carolina" finds both Carolinas. Two letters stay a code,
 * so "ca" finds only California.
 */
export function matchStates(
  projects: readonly SearchProject[],
  text: string,
  stateOf: StateOf = byField,
): StateResult[] {
  const query = normalize(text);
  if (query.length < MIN_QUERY_LENGTH) return [];
  const counts = new Map<string, number>();
  for (const { project, location } of plotted(projects)) {
    const name = stateOf(project, location);
    if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return US_STATES.filter(([code, name]) => {
    const lower = name.toLowerCase();
    return (
      code.toLowerCase() === query ||
      lower.startsWith(query) ||
      (query.length > 2 &&
        lower.split(' ').some((word) => word.startsWith(query)))
    );
  })
    .map(([code, name]) => ({ code, name, count: counts.get(name) ?? 0 }))
    .sort(
      (a, b) =>
        Number(b.code.toLowerCase() === query) -
          Number(a.code.toLowerCase() === query) ||
        a.name.localeCompare(b.name),
    );
}

/** Every plotted project in a state, by name. A state's list can pass 10, so it scrolls. */
export function projectsInState(
  projects: readonly SearchProject[],
  name: string,
  stateOf: StateOf = byField,
): ProjectResult[] {
  return plotted(projects)
    .filter(({ project, location }) => stateOf(project, location) === name)
    .map(resultOf)
    .sort(byName);
}

/** ZIP Code search waits for exactly five digits (AC-9.5). */
export const isZip = (text: string) => /^\d{5}$/.test(text.trim());

const EARTH_RADIUS_MILES = 3958.8;
const radians = (degrees: number) => (degrees * Math.PI) / 180;

/** The great-circle distance in miles. */
function milesBetween(
  a: google.maps.LatLngLiteral,
  b: google.maps.LatLngLiteral,
) {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(radians(a.lat)) *
      Math.cos(radians(b.lat)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_MILES * Math.asin(Math.sqrt(h));
}

/** The plotted projects nearest a point, closest first, with their miles (AC-9.5). */
export function nearestProjects(
  projects: readonly SearchProject[],
  point: google.maps.LatLngLiteral,
): ProjectResult[] {
  return plotted(projects)
    .map((entry) => ({
      ...resultOf(entry),
      miles: milesBetween(point, entry.location),
    }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, MAX_RESULTS);
}
