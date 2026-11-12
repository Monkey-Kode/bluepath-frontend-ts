import { createHash } from 'node:crypto';

import { stateName } from '@/utils/extractState';

import { displayName, type MapProject } from './display';
import type {
  MapProjectFields,
  RowIssue,
  RowWarningReason,
  StarterErrorReason,
  StarterFields,
  StarterRow,
  ValidatedRow,
} from './validate';

/**
 * Who owns each field, in the full layout's column order. Linking a plant to a website project
 * follows these owners (AC-4.15).
 * - `blueiq`: the field comes from BlueIQ (D-22).
 * - `address`: the same, except on a merged project, which keeps the website's address (AC-8.6).
 * - `website`: a value replaces the project's own, and a blank keeps it.
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
  sizeMw: 'blueiq',
  financingAmount: 'blueiq',
} as const satisfies Partial<
  Record<keyof MapProjectFields, 'blueiq' | 'address' | 'website'>
>;

/** A field that a file can change. Plant ID only matches a row to its project. */
export type PlanField = keyof typeof FIELD_OWNERS;

export type FieldValues = Pick<MapProjectFields, PlanField>;

const PLAN_FIELDS = Object.keys(FIELD_OWNERS) as PlanField[];

/**
 * The fields an import writes: BlueIQ's 7 columns, plus Active, because the file lists only
 * active plants (D-44). Each one mirrors the file, so a blank cell clears it (D-22). Imports
 * never touch the other fields, which keep the starter load's values (G1).
 */
const IMPORT_WRITES = new Set<PlanField>([
  'projectName',
  'projectType',
  'active',
  'location',
  'sizeMw',
  'financingAmount',
]);

const IMPORT_FIELDS = PLAN_FIELDS.filter((field) => IMPORT_WRITES.has(field));

/** Every field that the starter load writes, in column order, including both IDs (AC-8.7). */
const STARTER_FIELDS = ['plantId', ...PLAN_FIELDS, 'websiteId'] as const;

type StarterField = (typeof STARTER_FIELDS)[number];

export type StarterValues = Pick<StarterFields, StarterField>;

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

/**
 * A row the plan skips. A Plant ID that two projects share is a conflict in the data. A starter
 * row's Website ID must name a map project.
 */
export type PlanErrorReason =
  | StarterErrorReason
  | 'plant-id-conflict'
  | 'unknown-website-id';

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
      /** A starter row for a website-only project has none. */
      plantId: string | null;
      id: string;
      /** Each changed field's new value, in column order. Null clears the field. */
      changes: Partial<StarterValues>;
      /** The project is hidden and shows again. */
      returns: boolean;
      warnings: Warnings;
    }
  | {
      action: 'unchanged';
      row: number;
      plantId: string | null;
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
  /** A website project has none until the starter load. */
  plantId: string | null;
  name: string;
}

export type PlanRejection =
  | { reason: 'no-valid-rows'; message: string }
  | { reason: 'half-rule'; message: string };

export interface ImportPlan {
  /** One entry per file row, in file order. */
  rows: RowPlan[];
  /** Shown projects that the file lacks. An import hides only plants, and none while hiding is off. */
  hides: ProjectRef[];
  /** Hidden projects that the file lists again. Each one's row is an update. */
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
  /** Changes when the file, the options, the kind of change, or any map project changes (AC-4.4). */
  token: string;
}

/** A stored value in the form that `validateRows` gives a file cell, so equal values compare equal. */
function storedValue(project: CurrentProject, field: StarterField) {
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
    case 'sizeMw':
    case 'financingAmount':
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

/** Each given field whose value differs from the stored one. */
function diff<Field extends StarterField>(
  project: CurrentProject,
  values: Pick<StarterValues, Field>,
  fields: readonly Field[],
) {
  const changes: Partial<Pick<StarterValues, Field>> = {};
  for (const field of fields) {
    if (!sameValue(storedValue(project, field), values[field])) {
      changes[field] = values[field];
    }
  }
  return changes;
}

/** A link's changes, which follow each field's owner. */
function changesFor(project: CurrentProject, fields: FieldValues) {
  const merged = Boolean(project.websiteId);
  const owned = PLAN_FIELDS.filter((field) => {
    const owner = FIELD_OWNERS[field];
    if (owner === 'address') return !merged;
    if (owner === 'website') return fields[field] !== null;
    return true;
  });
  return diff(project, fields, owned);
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

function fieldValues(fields: FieldValues): FieldValues {
  return Object.fromEntries(
    PLAN_FIELDS.map((field) => [field, fields[field]]),
  ) as FieldValues;
}

function starterValues(fields: StarterFields): StarterValues {
  return Object.fromEntries(
    STARTER_FIELDS.map((field) => [field, fields[field]]),
  ) as StarterValues;
}

/** A project's ID, Plant ID, and name, as the routes report it. */
export const refOf = (
  project: Pick<
    CurrentProject,
    '_id' | 'plantId' | 'plantName' | 'projectName' | 'title'
  >,
): ProjectRef => ({
  id: project._id,
  plantId: project.plantId ?? null,
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

/**
 * The token covers the file, the settings, and each project's `_id` and `_rev`, in `_id` order.
 * An import's settings are its options, and the starter load's mark it as the starter load.
 */
function previewToken(
  file: Uint8Array,
  settings: PlanOptions | { starter: true },
  projects: readonly CurrentProject[],
) {
  const revisions = projects
    .map(({ _id, _rev }) => [_id, _rev])
    .sort(([a = ''], [b = '']) => (a < b ? -1 : a > b ? 1 : 0));
  const fileHash = createHash('sha256').update(file).digest();
  return createHash('sha256')
    .update(fileHash)
    .update(JSON.stringify({ ...settings, revisions }))
    .digest('hex');
}

function halfRuleMessage(listed: number, current: number) {
  return `The file lists ${listed} of the site's ${current} BlueIQ plants. A file that hides missing plants must list at least half of them.`;
}

/** Each project with a Plant ID, by that ID. */
function byPlantIdOf(projects: readonly CurrentProject[]) {
  const byPlantId = new Map<string, CurrentProject[]>();
  for (const project of projects.filter(hasPlantId)) {
    byPlantId.set(project.plantId, [
      ...(byPlantId.get(project.plantId) ?? []),
      project,
    ]);
  }
  return byPlantId;
}

type PlantTarget =
  | { kind: 'project'; project: CurrentProject }
  | { kind: 'new'; id: string }
  | { kind: 'error'; plan: RowPlan };

/** The project with a row's Plant ID, the document ID for a new one, or the conflict that stops the row. */
function plantTarget(
  row: number,
  plantId: string,
  byPlantId: Map<string, CurrentProject[]>,
  takenIds: Set<string>,
): PlantTarget {
  const matches = byPlantId.get(plantId) ?? [];
  if (matches.length > 1) {
    return {
      kind: 'error',
      plan: conflict(
        row,
        plantId,
        'More than one map project has this Plant ID, so the row updates none of them.',
      ),
    };
  }
  const [project] = matches;
  if (project) return { kind: 'project', project };
  const id = `plant-${plantId}`;
  if (takenIds.has(id)) {
    return {
      kind: 'error',
      plan: conflict(
        row,
        plantId,
        "Another map project already uses this Plant ID's document ID.",
      ),
    };
  }
  return { kind: 'new', id };
}

const errorPlan = (
  row: Extract<ValidatedRow | StarterRow, { ok: false }>,
): RowPlan => ({
  action: 'error',
  row: row.row,
  plantId: row.plantId,
  errors: row.errors,
});

/** An update or unchanged row. A hidden project shows again, and joins `returns`. */
function updatePlan(
  row: number,
  plantId: string | null,
  project: CurrentProject,
  changes: Partial<StarterValues>,
  warnings: Warnings,
  returns: ProjectRef[],
): RowPlan {
  const returning = Boolean(project.hiddenAt);
  if (returning) returns.push(refOf({ ...project, plantId }));
  if (!returning && Object.keys(changes).length === 0) {
    return { action: 'unchanged', row, plantId, id: project._id, warnings };
  }
  return {
    action: 'update',
    row,
    plantId,
    id: project._id,
    changes,
    returns: returning,
    warnings,
  };
}

/** Counts the rows and rejects a file without a row free of errors (AC-4.9). */
function planOf(
  rows: RowPlan[],
  hides: ProjectRef[],
  returns: ProjectRef[],
  token: string,
  otherRejection: PlanRejection | null = null,
): ImportPlan {
  const count = (action: RowPlan['action']) =>
    rows.filter((row) => row.action === action).length;
  const counts = {
    created: count('create'),
    updated: count('update'),
    unchanged: count('unchanged'),
    skipped: count('error'),
    hidden: hides.length,
    returned: returns.length,
  };
  const rejection: PlanRejection | null =
    counts.skipped === rows.length
      ? {
          reason: 'no-valid-rows',
          message: 'Every row in the file has an error, so nothing changes.',
        }
      : otherRejection;

  return {
    rows,
    hides,
    returns,
    counts,
    writes: counts.created + counts.updated + counts.hidden > 0,
    rejection,
    token,
  };
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
  const byPlantId = byPlantIdOf(projects);
  const takenIds = new Set(projects.map(({ _id }) => _id));
  const listed = new Set(rows.flatMap(({ plantId }) => plantId ?? []));

  const returns: ProjectRef[] = [];
  const planned = rows.map((row): RowPlan => {
    if (!row.ok) return errorPlan(row);
    const { plantId, warnings } = row;
    const target = plantTarget(row.row, plantId, byPlantId, takenIds);
    if (target.kind === 'error') return target.plan;
    const fields = fieldValues(row.fields);
    if (target.kind === 'new') {
      return {
        action: 'create',
        row: row.row,
        plantId,
        id: target.id,
        fields: { plantId, ...fields },
        warnings,
      };
    }
    const { project } = target;
    return updatePlan(
      row.row,
      plantId,
      project,
      diff(project, fields, IMPORT_FIELDS),
      warnings,
      returns,
    );
  });

  const shownPlants = projects
    .filter(hasPlantId)
    .filter((project) => !project.hiddenAt);
  const missing = shownPlants.filter(({ plantId }) => !listed.has(plantId));
  const hides = options.hideMissing ? missing.map(refOf) : [];

  const listedCount = shownPlants.length - missing.length;
  const halfRule: PlanRejection | null =
    options.hideMissing && listedCount * 2 < shownPlants.length
      ? {
          reason: 'half-rule',
          message: halfRuleMessage(listedCount, shownPlants.length),
        }
      : null;

  return planOf(
    planned,
    hides,
    returns,
    previewToken(file, options, projects),
    halfRule,
  );
}

export interface StarterInput {
  /** Every map project. */
  projects: readonly CurrentProject[];
  /** The workbook's Projects tab as it arrived, for the preview token. */
  file: Uint8Array;
  /** The tab's rows from `validateStarterRows`. */
  rows: readonly StarterRow[];
}

/**
 * Plans the one-time starter load, without writing (AC-8.7). A row with a Website ID updates that
 * project, and a row without one updates or creates its plant. Unlike an import, the load writes
 * every column, so a blank cell clears any field. Each shown project that no row names hides. The
 * workbook replaces the whole list, so no half rule applies.
 */
export function planStarterLoad({
  projects,
  file,
  rows,
}: StarterInput): ImportPlan {
  const byId = new Map(projects.map((project) => [project._id, project]));
  const byPlantId = byPlantIdOf(projects);
  const takenIds = new Set(byId.keys());

  const returns: ProjectRef[] = [];
  const planned = rows.map((row): RowPlan => {
    if (!row.ok) return errorPlan(row);
    let project: CurrentProject | undefined;
    if (row.websiteId === null) {
      const target = plantTarget(row.row, row.plantId, byPlantId, takenIds);
      if (target.kind === 'error') return target.plan;
      if (target.kind === 'new') {
        return {
          action: 'create',
          row: row.row,
          plantId: row.plantId,
          id: target.id,
          fields: { plantId: row.plantId, ...fieldValues(row.fields) },
          warnings: row.warnings,
        };
      }
      project = target.project;
    } else {
      project = byId.get(row.websiteId);
      if (!project) {
        return {
          action: 'error',
          row: row.row,
          plantId: row.plantId,
          errors: [
            {
              reason: 'unknown-website-id',
              message: 'No map project has this Website ID.',
            },
          ],
        };
      }
    }
    return updatePlan(
      row.row,
      row.plantId,
      project,
      diff(project, starterValues(row.fields), STARTER_FIELDS),
      row.warnings,
      returns,
    );
  });

  // An error row names its projects too, so they never hide.
  const namedIds = new Set(rows.flatMap(({ websiteId }) => websiteId ?? []));
  const namedPlants = new Set(rows.flatMap(({ plantId }) => plantId ?? []));
  const hides = projects
    .filter(
      (project) =>
        !project.hiddenAt &&
        !namedIds.has(project._id) &&
        !(project.plantId && namedPlants.has(project.plantId)),
    )
    .map(refOf);

  return planOf(
    planned,
    hides,
    returns,
    previewToken(file, { starter: true }, projects),
  );
}
