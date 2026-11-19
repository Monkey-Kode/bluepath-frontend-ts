import { categoryOf, fallsBackToTechnologies } from '@/lib/categories';
import { stateName } from '@/utils/extractState';

import { COLUMN_KEYS, type ColumnKey, IMPORT_KEYS } from './columns';
import type { ParsedRow } from './parseCsv';

/** The six reasons in AC-4.3. A row with any of them writes nothing. */
export type RowErrorReason =
  | 'no-plant-id'
  | 'bad-plant-id'
  | 'no-name'
  | 'bad-coordinates'
  | 'bad-size'
  | 'bad-active';

/** Warnings don't stop a row. Each one but the last keeps the project off the map. */
export type RowWarningReason =
  | 'no-coordinates'
  | 'unknown-project-type'
  | 'inactive'
  | 'financing-not-number';

export interface RowIssue<Reason extends string> {
  reason: Reason;
  /** Plain language for editors. It never quotes the row's cells. */
  message: string;
}

/** The fields a row sets on its map project. A blank cell reads as null. */
export interface MapProjectFields {
  plantId: string;
  plantName: string | null;
  projectName: string | null;
  projectId: string | null;
  projectType: string | null;
  projectStatus: string | null;
  active: boolean | null;
  location: { lat: number; lng: number } | null;
  address: string | null;
  city: string | null;
  /** The full name, such as "Nebraska". */
  state: string | null;
  zip: string | null;
  county: string | null;
  entity: string[] | null;
  financing: string[] | null;
  size: number | null;
  technologies: string[] | null;
  /** Megawatts DC, each plant's own. */
  sizeMw: number | null;
  /** Dollars, blank until BluePath decides what BlueIQ sends here. */
  financingAmount: number | null;
  websiteId: string | null;
}

export type ValidatedRow =
  | {
      ok: true;
      row: number;
      plantId: string;
      fields: MapProjectFields;
      warnings: RowIssue<RowWarningReason>[];
    }
  | {
      ok: false;
      row: number;
      /** The trimmed Plant ID, so a plan never hides the project of an error row. */
      plantId: string | null;
      errors: RowIssue<RowErrorReason>[];
    };

/** The starter load also checks that no two rows share a Website ID (AC-8.7). */
export type StarterErrorReason = RowErrorReason | 'bad-website-id';

/** A starter row's fields. A website project's row may lack a Plant ID. */
export type StarterFields = Omit<MapProjectFields, 'plantId'> & {
  plantId: string | null;
};

/** A starter row names a plant, a website project, or both. */
type StarterIds =
  | { plantId: string; websiteId: null }
  | { plantId: string | null; websiteId: string };

export type StarterRow =
  | (StarterIds & {
      ok: true;
      row: number;
      fields: StarterFields;
      warnings: RowIssue<RowWarningReason>[];
    })
  | {
      ok: false;
      row: number;
      /** Both trimmed IDs, so the plan never hides the project of an error row. */
      plantId: string | null;
      websiteId: string | null;
      errors: RowIssue<StarterErrorReason>[];
    };

/** A new plant project's `_id` is `plant-<Plant ID>`, so the ID must be safe in a document ID. */
const PLANT_ID = /^[A-Za-z0-9_-]{1,64}$/;
const DECIMAL = /^[+-]?(\d+(\.\d*)?|\.\d+)$/;
/** Plain numbers, plus a leading "$" and thousands commas. */
const SIZE = /^[+-]?\$?\s*(\d{1,3}(,\d{3})+|\d+)(\.\d*)?$/;

const text = (cell: string) => cell.trim() || null;

function list(cell: string) {
  const values = cell
    .split(';')
    .map((value) => value.trim())
    .filter(Boolean);
  return values.length > 0 ? values : null;
}

const rowList = new Intl.ListFormat('en', { type: 'conjunction' });

type IdColumn = 'plantId' | 'websiteId';

const ID_NAMES = { plantId: 'Plant ID', websiteId: 'Website ID' } as const;

/** The rows that hold each trimmed ID in a column. */
function rowsById(rows: readonly ParsedRow[], column: IdColumn) {
  const byId = new Map<string, number[]>();
  for (const { row, cells } of rows) {
    const id = cells[column].trim();
    if (id) byId.set(id, [...(byId.get(id) ?? []), row]);
  }
  return byId;
}

/** Names the other rows that hold the same ID, or gives null when no other row does. */
function repeatMessage(
  column: IdColumn,
  id: string,
  row: number,
  byId: Map<string, number[]>,
) {
  const otherRows = (byId.get(id) ?? []).filter((other) => other !== row);
  if (otherRows.length === 0) return null;
  return otherRows.length === 1
    ? `Row ${otherRows[0]} has the same ${ID_NAMES[column]}.`
    : `Rows ${rowList.format(otherRows.map(String))} have the same ${ID_NAMES[column]}.`;
}

function plantIdError(
  plantId: string,
  row: number,
  byPlantId: Map<string, number[]>,
): RowIssue<RowErrorReason> | null {
  if (!PLANT_ID.test(plantId)) {
    return {
      reason: 'bad-plant-id',
      message:
        'The Plant ID can hold only letters, digits, "_", and "-", up to 64 characters.',
    };
  }
  const message = repeatMessage('plantId', plantId, row, byPlantId);
  return message ? { reason: 'bad-plant-id', message } : null;
}

function readCoordinate(
  name: 'Latitude' | 'Longitude',
  cell: string,
  limit: number,
  errors: RowIssue<RowErrorReason>[],
) {
  if (!DECIMAL.test(cell)) {
    errors.push({
      reason: 'bad-coordinates',
      message: `${name} is not a number.`,
    });
    return null;
  }
  const value = Number(cell);
  if (Math.abs(value) > limit) {
    errors.push({
      reason: 'bad-coordinates',
      message: `${name} must be between -${limit} and ${limit}.`,
    });
    return null;
  }
  return value;
}

function readLocation(
  latitudeCell: string,
  longitudeCell: string,
  errors: RowIssue<RowErrorReason>[],
) {
  const latitude = latitudeCell.trim();
  const longitude = longitudeCell.trim();
  if (!latitude && !longitude) return null;
  if (!latitude || !longitude) {
    errors.push({
      reason: 'bad-coordinates',
      message: latitude
        ? 'Latitude has no Longitude.'
        : 'Longitude has no Latitude.',
    });
    return null;
  }
  const lat = readCoordinate('Latitude', latitude, 90, errors);
  const lng = readCoordinate('Longitude', longitude, 180, errors);
  return lat === null || lng === null ? null : { lat, lng };
}

function readSize(cell: string, errors: RowIssue<RowErrorReason>[]) {
  const size = cell.trim();
  if (!size) return null;
  if (!SIZE.test(size)) {
    errors.push({ reason: 'bad-size', message: 'Size ($) is not a number.' });
    return null;
  }
  return Number(size.replace(/[$,\s]/g, ''));
}

function readSizeMw(cell: string, errors: RowIssue<RowErrorReason>[]) {
  const size = cell.trim();
  if (!size) return null;
  if (!DECIMAL.test(size)) {
    errors.push({
      reason: 'bad-size',
      message: 'Size (MWdc) is not a number.',
    });
    return null;
  }
  return Number(size);
}

/** Text such as "needs to be decided" warns and reads as blank, so the plant still updates. */
function readFinancingAmount(
  cell: string,
  notes: RowIssue<RowWarningReason>[],
) {
  const amount = cell.trim();
  if (!amount) return null;
  if (!SIZE.test(amount)) {
    notes.push({
      reason: 'financing-not-number',
      message:
        'Financing Amount ($) is not a number, so the website leaves it blank.',
    });
    return null;
  }
  return Number(amount.replace(/[$,\s]/g, ''));
}

function readActive(cell: string, errors: RowIssue<RowErrorReason>[]) {
  const active = cell.trim().toLowerCase();
  if (!active) return null;
  if (active === 'yes') return true;
  if (active === 'no') return false;
  errors.push({
    reason: 'bad-active',
    message: 'Active must be Yes, No, or blank.',
  });
  return null;
}

/**
 * An import reads BlueIQ's 7 columns (D-44). It never reads the starter workbook's other
 * columns, and BlueIQ lists only active plants, so a listed plant counts as active.
 */
type RowKind = 'import' | 'starter';

const IMPORTED = new Set<ColumnKey>(IMPORT_KEYS);

const importCells = (cells: ParsedRow['cells']) =>
  Object.fromEntries(
    COLUMN_KEYS.map((key) => [key, IMPORTED.has(key) ? cells[key] : '']),
  ) as ParsedRow['cells'];

/**
 * An import can't see the website's Technologies, which still give a blank or "Other" type its
 * category (G4). `open` names that type as "blank" or "Other".
 */
const UNKNOWN_TYPE = {
  import: {
    unknown:
      'The map has no category for this Technology / Project Type, so the plant stays off the map.',
    open: (type: string) =>
      `Technology / Project Type is ${type}, so the plant stays off the map unless the website's Technologies give it a category.`,
  },
  starter: {
    unknown:
      'The map has no category for this Project Type, so the row stays off the map.',
    open: (type: string) =>
      `Project Type is ${type}, and Technologies match no map category, so the row stays off the map.`,
  },
} as const;

function warningsFor(
  fields: Omit<MapProjectFields, 'plantId'>,
  notes: RowIssue<RowWarningReason>[],
  kind: RowKind,
) {
  const warnings: RowIssue<RowWarningReason>[] = [];
  if (!fields.location) {
    warnings.push({
      reason: 'no-coordinates',
      message: 'The row has no Latitude or Longitude, so it stays off the map.',
    });
  }
  if (!categoryOf(fields)) {
    const { unknown, open } = UNKNOWN_TYPE[kind];
    warnings.push({
      reason: 'unknown-project-type',
      message: fallsBackToTechnologies(fields.projectType)
        ? open(fields.projectType ? 'Other' : 'blank')
        : unknown,
    });
  }
  if (fields.active === false) {
    warnings.push({
      reason: 'inactive',
      message: 'Active is No, so the project stays off the map and ticker.',
    });
  }
  return [...warnings, ...notes];
}

/** Reads every cell but the Plant ID. A cell that can't be read adds an error. */
function readCells(rowCells: ParsedRow['cells'], kind: RowKind) {
  const cells = kind === 'import' ? importCells(rowCells) : rowCells;
  const errors: RowIssue<RowErrorReason>[] = [];
  const notes: RowIssue<RowWarningReason>[] = [];
  const plantName = text(cells.plantName);
  const projectName = text(cells.projectName);
  if (!plantName && !projectName) {
    errors.push({
      reason: 'no-name',
      message:
        kind === 'import'
          ? 'The row has no Project Name.'
          : 'The row has no Plant Name or Project Name.',
    });
  }

  // Errors follow column order: name, coordinates, sizes, then Active.
  const location = readLocation(cells.latitude, cells.longitude, errors);
  const size = readSize(cells.size, errors);
  const sizeMw = readSizeMw(cells.sizeMw, errors);
  const financingAmount = readFinancingAmount(cells.financingAmount, notes);
  const active = kind === 'import' ? true : readActive(cells.active, errors);

  const fields: Omit<MapProjectFields, 'plantId'> = {
    plantName,
    projectName,
    projectId: text(cells.projectId),
    projectType: text(cells.projectType),
    projectStatus: text(cells.projectStatus),
    active,
    location,
    address: text(cells.address),
    city: text(cells.city),
    state: stateName(cells.state),
    zip: text(cells.zip),
    county: text(cells.county),
    entity: list(cells.entity),
    financing: list(cells.financing),
    size,
    technologies: list(cells.technologies),
    sizeMw,
    financingAmount,
    websiteId: text(cells.websiteId),
  };
  return { fields, errors, notes };
}

/**
 * Checks each row of an import and reads BlueIQ's 7 columns into map project fields (AC-4.3).
 * The other fields read as blank, and Active reads as Yes. Every row gets a result, in file order.
 */
export function validateRows(rows: readonly ParsedRow[]): ValidatedRow[] {
  const byPlantId = rowsById(rows, 'plantId');

  return rows.map(({ row, cells }) => {
    const plantId = text(cells.plantId);
    const idError = plantId
      ? plantIdError(plantId, row, byPlantId)
      : ({
          reason: 'no-plant-id',
          message: 'The row has no Plant ID.',
        } as const);
    const read = readCells(cells, 'import');
    const errors = idError ? [idError, ...read.errors] : read.errors;

    if (!plantId || errors.length > 0) {
      return { ok: false, row, plantId, errors };
    }
    const fields = { plantId, ...read.fields };
    return {
      ok: true,
      row,
      plantId,
      fields,
      warnings: warningsFor(fields, read.notes, 'import'),
    };
  });
}

/**
 * Checks the rows of the one-time starter load (AC-8.7). It reads every column: lists split on
 * semicolons, and State becomes the full name. A row with a Website ID may lack a Plant ID, and no
 * two rows may share a Website ID. Otherwise the rules match `validateRows`.
 */
export function validateStarterRows(rows: readonly ParsedRow[]): StarterRow[] {
  const byPlantId = rowsById(rows, 'plantId');
  const byWebsiteId = rowsById(rows, 'websiteId');

  return rows.map(({ row, cells }) => {
    const plantId = text(cells.plantId);
    const websiteId = text(cells.websiteId);
    const ids: StarterIds | null =
      websiteId !== null
        ? { plantId, websiteId }
        : plantId !== null
          ? { plantId, websiteId }
          : null;

    const errors: RowIssue<StarterErrorReason>[] = [];
    if (!ids) {
      errors.push({
        reason: 'no-plant-id',
        message: 'The row has no Plant ID or Website ID.',
      });
    }
    const idError = plantId && plantIdError(plantId, row, byPlantId);
    if (idError) errors.push(idError);
    const repeat =
      websiteId && repeatMessage('websiteId', websiteId, row, byWebsiteId);
    if (repeat) errors.push({ reason: 'bad-website-id', message: repeat });
    const read = readCells(cells, 'starter');
    errors.push(...read.errors);

    if (!ids || errors.length > 0) {
      return { ok: false, row, plantId, websiteId, errors };
    }
    const fields = { ...read.fields, plantId: ids.plantId };
    return {
      ok: true,
      row,
      ...ids,
      fields,
      warnings: warningsFor(fields, read.notes, 'starter'),
    };
  });
}
