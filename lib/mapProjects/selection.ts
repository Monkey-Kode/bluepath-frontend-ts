/**
 * What the projects map has selected, and how markers, the legend, and the panel look for it
 * (FR-004, AC-2.4 to AC-2.6). The map has no camera action here, so pan and zoom can never clear
 * a selection.
 */
import type { CategoryKey } from '@/lib/categories';

export interface PickedProject {
  readonly id: string;
  readonly category: CategoryKey;
}

export interface Selection {
  /** The legend entry that filters the markers. */
  readonly filter: CategoryKey | null;
  readonly project: PickedProject | null;
}

export type Action =
  | { readonly type: 'pickMarker'; readonly project: PickedProject }
  | { readonly type: 'pickLegend'; readonly category: CategoryKey }
  /** A pick from the map search (AC-9.3). */
  | { readonly type: 'pickResult'; readonly project: PickedProject }
  /** A click on the map that hits no marker. */
  | { readonly type: 'clickMap' }
  /** A click outside the map, the legend, the panel, and the search. */
  | { readonly type: 'clickAway' }
  | { readonly type: 'escape' };

export const idle: Selection = { filter: null, project: null };

/** How the markers and the legend look while the preview shows one category. */
export const previewOf = (category: CategoryKey): Selection => ({
  filter: category,
  project: null,
});

export function select(state: Selection, action: Action): Selection {
  switch (action.type) {
    case 'pickMarker':
      // Picking the shown project again steps back to the filter, if one is on.
      return state.project?.id === action.project.id
        ? { ...state, project: null }
        : { ...state, project: action.project };
    case 'pickResult':
      // A search pick never toggles off. It drops a filter that would hide its marker.
      return {
        filter: state.filter === action.project.category ? state.filter : null,
        project: action.project,
      };
    case 'pickLegend':
      return state.filter === action.category
        ? idle
        : { filter: action.category, project: null };
    case 'clickMap':
    case 'clickAway':
    case 'escape':
      return idle;
  }
}

export type MarkerLook = 'normal' | 'selected' | 'dimmed' | 'hidden';

export function markerLook(
  state: Selection,
  marker: PickedProject,
): MarkerLook {
  if (state.project?.id === marker.id) return 'selected';
  if (state.filter)
    return marker.category === state.filter ? 'normal' : 'hidden';
  if (state.project && marker.category !== state.project.category)
    return 'dimmed';
  return 'normal';
}

/** `filter` scales the entry up (AC-2.5). `match` turns it bold (AC-2.4). */
export type LegendLook = 'normal' | 'filter' | 'match' | 'faded';

export function legendLook(
  state: Selection,
  category: CategoryKey,
): LegendLook {
  if (state.filter) return state.filter === category ? 'filter' : 'faded';
  if (state.project)
    return state.project.category === category ? 'match' : 'faded';
  return 'normal';
}

export type PanelView =
  | { readonly kind: 'resting' }
  | { readonly kind: 'project'; readonly id: string };

/** Only a picked project opens the panel. A legend filter leaves it at rest (AC-2.5, AC-2.7). */
export function panelView(state: Selection): PanelView {
  return state.project
    ? { kind: 'project', id: state.project.id }
    : { kind: 'resting' };
}
