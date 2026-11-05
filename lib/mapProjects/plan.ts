import { createHash } from 'node:crypto';

import { stateName } from '@/utils/extractState';

import { displayName, type MapProject } from './display';
import type {
  MapProjectFields,
  RowErrorReason,
  RowIssue,
  RowWarningReason,
  ValidatedRow,
} from './validate';

/**
 * Who owns each field that a file sets, in the file's column order.
 * - `blueiq`: the field mirrors the file, so a blank cell clears it (D-22).
 * - `address`: the same, except on a merged project, which keeps the website's address (AC-8.6).
 * - `website`: a filled cell replaces the value, and a blank cell keeps it (AC-4.4).
 */
const FIELD_OWNERS = {
  plantName: 'blueiq',
  projectId: 'blueiq',
  projectName: 'blueiq',
  projectType: 'blueiq',
  projectStatus: 'blueiq',
  active: 'blueiq',
  location: 'blueiq',
  address: 'address',
  city: 'address',
  state: 'address',
  zip: 'address',
  county: 'blueiq',
  entity: 'website',
  financing: 'website',
  size: 'website',
  technologies: 'website',
} as const satisfies Partial<
  Record<keyof MapProjectFields, 'blueiq' | 'address' | 'website'>
>;

/** A field that a file can change. Plant ID only matches a row to its project. */
export type PlanField = keyof typeof FIELD_OWNERS;

export type FieldValues = Pick<MapProjectFields, PlanField>;

const PLAN_FIELDS = Object.keys(FIELD_OWNERS) as PlanField[];

/** A map project as the plan reads it. Hidden and website-only projects count too. */
export interface CurrentProject extends MapProject {
  _id: string;
  _rev: string;
  plantId?: string | null;
  projectId?: string | null;
  address?: string | null;
  zip?: string | null;
  county?: string | null;
  websiteId?: string | null;
}

export interface PlanOptions {
  /** The feed always hides missing plants. A manual import has this on by default (AC-4.5). */
  hideMissing: boolean;
}

export interface PlanInput {
  /** Every map project. */
  projects: readonly CurrentProject[];
  /** The file as it arrived, for the preview token. */
  file: Uint8Array;
  /** The file's rows from `validateRows`. */
  rows: readonly ValidatedRow[];
  options: PlanOptions;
}

/** A row the plan skips. A Plant ID that two projects share is a conflict in the data. */
export type PlanErrorReason = RowErrorReason | 'plant-id-conflict';

type Warnings = RowIssue<RowWarningReason>[];

export type RowPlan =
  | {
      action: 'create';
      row: number;
      plantId: string;
      /** The new project's document ID, `plant-<Plant ID>`. */
      id: string;
      fields: { plantId: string } & FieldValues;
      warnings: Warnings;
    }
  | {
      action: 'update';
      row: number;
      plantId: string;
      id: string;
      /** Each changed field's new value, in column order. Null clears the field. */
      changes: Partial<FieldValues>;
      /** The project is hidden and shows again. */
      returns: boolean;
      warnings: Warnings;
    }
  | {
      action: 'unchanged';
      row: number;
      plantId: string;
      id: string;
      warnings: Warnings;
    }
  | {
      action: 'error';
      row: number;
      plantId: string | null;
      errors: RowIssue<PlanErrorReason>[];
    };

export interface ProjectRef {
  id: string;
  plantId: string;
  name: string;
}

export type PlanRejection =
  | { reason: 'no-valid-rows'; message: string }
  | { reason: 'half-rule'; message: string };

export interface ImportPlan {
  /** One entry per file row, in file order. */
  rows: RowPlan[];
  /** Shown plants that the file lacks. Empty while hiding is off. */
  hides: ProjectRef[];
  /** Hidden plants that the file lists again. Each one's row is an update. */
  returns: ProjectRef[];
  counts: {
    created: number;
    updated: number;
    unchanged: number;
    skipped: number;
    hidden: number;
    returned: number;
  };
  /** True when applying would write anything. A rejected plan still writes nothing. */
  writes: boolean;
  /** Why the plan must write nothing, or null when it may apply. */
  rejection: PlanRejection | null;
  /** Changes when the file, the options, or any map project changes (AC-4.4). */
  token: string;
}

/** A stored value in the form that `validateRows` gives a file cell, so equal values compare equal. */
function storedValue(project: CurrentProject, field: PlanField) {
  switch (field) {
    case 'state':
      return stateName(project.state);
    case 'location': {
      const { lat, lng } = project.location ?? {};
      return lat == null && lng == null
        ? null
        : { lat: lat ?? null, lng: lng ?? null };
    }
    case 'active':
    case 'size':
    case 'entity':
    case 'financing':
    case 'technologies':
      return project[field] ?? null;
    default:
      // An empty stored string reads as a blank cell.
      return project[field] || null;
  }
}

const sameValue = (stored: unknown, next: unknown) =>
  JSON.stringify(stored) === JSON.stringify(next);

function changesFor(project: CurrentProject, fields: FieldValues) {
  const merged = Boolean(project.websiteId);
  const changes: Partial<Record<PlanField, unknown>> = {};
  for (const field of PLAN_FIELDS) {
    const owner = FIELD_OWNERS[field];
    const value = fields[field];
    if (owner === 'address' && merged) continue;
    if (owner === 'website' && value === null) continue;
    if (!sameValue(storedValue(project, field), value)) changes[field] = value;
  }
  return changes as Partial<FieldValues>;
}

/**
 * What a website-only project gains from its plant when an editor links the two (AC-4.15).
 * BlueIQ's fields come from the plant. The project keeps its address and its website fields. A blank
 * website field takes the plant's value. The project must have its Website ID.
 */
export function linkChanges(project: CurrentProject, plant: CurrentProject) {
  const fields = Object.fromEntries(
    PLAN_FIELDS.map((field) => {
      const kept =
        FIELD_OWNERS[field] === 'website' &&
        storedValue(project, field) !== null;
      // A null website value keeps the project's own.
      return [field, kept ? null : storedValue(plant, field)];
    }),
  ) as FieldValues;
  return changesFor(project, fields);
}

function fieldValues(fields: MapProjectFields): FieldValues {
  return Object.fromEntries(
    PLAN_FIELDS.map((field) => [field, fields[field]]),
  ) as FieldValues;
}

const refOf = (project: CurrentProject & { plantId: string }): ProjectRef => ({
  id: project._id,
  plantId: project.plantId,
  name: displayName(project),
});

const hasPlantId = (
  project: CurrentProject,
): project is CurrentProject & { plantId: string } => Boolean(project.plantId);

function conflict(row: number, plantId: string, message: string): RowPlan {
  return {
    action: 'error',
    row,
    plantId,
    errors: [{ reason: 'plant-id-conflict', message }],
  };
}

/** The token covers the file, the options, and each project's `_id` and `_rev`, in `_id` order. */
function previewToken(
  file: Uint8Array,
  options: PlanOptions,
  projects: readonly CurrentProject[],
) {
  const revisions = projects
    .map(({ _id, _rev }) => [_id, _rev])
    .sort(([a = ''], [b = '']) => (a < b ? -1 : a > b ? 1 : 0));
  const fileHash = createHash('sha256').update(file).digest();
  return createHash('sha256')
    .update(fileHash)
    .update(JSON.stringify({ hideMissing: options.hideMissing, revisions }))
    .digest('hex');
}

function halfRuleMessage(listed: number, current: number) {
  return `The file lists ${listed} of the site's ${current} BlueIQ plants. A file that hides missing plants must list at least half of them.`;
}

/**
 * Plans what a file would change, without writing (FR-007, FR-013). A row updates the project
 * with its Plant ID or creates one. The file's shown plants that it lacks hide when hiding is on.
 * An error row writes nothing, and its plant never counts as missing.
 */
export function planImport({
  projects,
  file,
  rows,
  options,
}: PlanInput): ImportPlan {
  const byPlantId = new Map<string, CurrentProject[]>();
  for (const project of projects.filter(hasPlantId)) {
    byPlantId.set(project.plantId, [
      ...(byPlantId.get(project.plantId) ?? []),
      project,
    ]);
  }
  const takenIds = new Set(projects.map(({ _id }) => _id));
  const listed = new Set(rows.flatMap(({ plantId }) => plantId ?? []));

  const returns: ProjectRef[] = [];
  const planned = rows.map((row): RowPlan => {
    if (!row.ok) {
      return {
        action: 'error',
        row: row.row,
        plantId: row.plantId,
        errors: row.errors,
      };
    }
    const { plantId, warnings } = row;
    const fields = fieldValues(row.fields);
    const matches = byPlantId.get(plantId) ?? [];
    if (matches.length > 1) {
      return conflict(
        row.row,
        plantId,
        'More than one map project has this Plant ID, so the row updates none of them.',
      );
    }

    const [project] = matches;
    if (!project) {
      const id = `plant-${plantId}`;
      if (takenIds.has(id)) {
        return conflict(
          row.row,
          plantId,
          "Another map project already uses this Plant ID's document ID.",
        );
      }
      return {
        action: 'create',
        row: row.row,
        plantId,
        id,
        fields: { plantId, ...fields },
        warnings,
      };
    }

    const changes = changesFor(project, fields);
    const returning = Boolean(project.hiddenAt);
    if (returning) returns.push(refOf({ ...project, plantId }));
    if (!returning && Object.keys(changes).length === 0) {
      return {
        action: 'unchanged',
        row: row.row,
        plantId,
        id: project._id,
        warnings,
      };
    }
    return {
      action: 'update',
      row: row.row,
      plantId,
      id: project._id,
      changes,
      returns: returning,
      warnings,
    };
  });

  const shownPlants = projects
    .filter(hasPlantId)
    .filter((project) => !project.hiddenAt);
  const missing = shownPlants.filter(({ plantId }) => !listed.has(plantId));
  const hides = options.hideMissing ? missing.map(refOf) : [];

  const count = (action: RowPlan['action']) =>
    planned.filter((row) => row.action === action).length;
  const counts = {
    created: count('create'),
    updated: count('update'),
    unchanged: count('unchanged'),
    skipped: count('error'),
    hidden: hides.length,
    returned: returns.length,
  };

  const listedCount = shownPlants.length - missing.length;
  let rejection: PlanRejection | null = null;
  if (counts.skipped === planned.length) {
    rejection = {
      reason: 'no-valid-rows',
      message: 'Every row in the file has an error, so nothing changes.',
    };
  } else if (options.hideMissing && listedCount * 2 < shownPlants.length) {
    rejection = {
      reason: 'half-rule',
      message: halfRuleMessage(listedCount, shownPlants.length),
    };
  }

  return {
    rows: planned,
    hides,
    returns,
    counts,
    writes: counts.created + counts.updated + counts.hidden > 0,
    rejection,
    token: previewToken(file, options, projects),
  };
}
