import { CsvError, parse } from 'csv-parse/sync';

import { COLUMN_KEYS, COLUMNS, type ColumnKey } from './columns';

/** The largest file the website reads: 5 MB. */
export const MAX_FILE_BYTES = 5 * 1024 * 1024;

/** The most project rows one file may hold, not counting the header or blank rows. */
export const MAX_ROWS = 5000;

/** One row of the file, with each known column's cell exactly as written. */
export interface ParsedRow {
  /** The row number a spreadsheet shows. The header is row 1. */
  row: number;
  /** A column the file lacks reads as an empty string. */
  cells: Record<ColumnKey, string>;
}

export type ParseCsvError =
  | { reason: 'too-big' }
  | { reason: 'not-utf8' }
  | { reason: 'malformed'; row: number }
  | { reason: 'missing-columns'; headers: string[] }
  | { reason: 'repeated-columns'; headers: string[] }
  | { reason: 'too-many-rows' };

export type ParseCsvResult =
  | { ok: true; rows: ParsedRow[] }
  | { ok: false; error: ParseCsvError; message: string };

export interface ParseCsvOptions {
  /** The one-time starter load also reads the Website ID column. */
  starter?: boolean;
}

const normalize = (header: string) =>
  header.trim().replace(/\s+/g, ' ').toLowerCase();

const KEY_BY_HEADER = new Map(
  COLUMN_KEYS.map((key) => [normalize(COLUMNS[key].header), key]),
);

const isBlank = (cells: string[]) => cells.every((cell) => cell.trim() === '');

function fail(error: ParseCsvError, message: string): ParseCsvResult {
  return { ok: false, error, message };
}

/**
 * Reads a map project file into rows of text cells. BlueIQ's feed, a Google Sheet, and a Studio
 * upload all arrive here as CSV. Messages never quote the file, because it holds client data.
 */
export function parseCsv(
  bytes: Uint8Array,
  { starter = false }: ParseCsvOptions = {},
): ParseCsvResult {
  if (bytes.byteLength > MAX_FILE_BYTES) {
    return fail({ reason: 'too-big' }, 'The file is larger than 5 MB.');
  }

  let text: string;
  try {
    // The decoder drops a leading byte-order mark.
    text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return fail(
      { reason: 'not-utf8' },
      'The file is not UTF-8 text. Save it as "CSV UTF-8" and try again.',
    );
  }

  let records: string[][];
  try {
    records = parse(text, { relax_column_count: true });
  } catch (error) {
    if (!(error instanceof CsvError)) throw error;
    // csv-parse counts the header as a record, so the failed record is one past the count.
    const parsed = typeof error.records === 'number' ? error.records : 0;
    const row = parsed + 1;
    return fail(
      { reason: 'malformed', row },
      `The file is not valid CSV at row ${row}. Check that row for a stray or unclosed quote.`,
    );
  }

  const [header = [], ...body] = records;
  const indexes = new Map<ColumnKey, number>();
  const repeated = new Set<ColumnKey>();
  header.forEach((name, index) => {
    const key = KEY_BY_HEADER.get(normalize(name));
    if (!key) return;
    if (COLUMNS[key].presence === 'starter' && !starter) return;
    if (indexes.has(key)) repeated.add(key);
    else indexes.set(key, index);
  });

  const missing = COLUMN_KEYS.filter(
    (key) => COLUMNS[key].presence === 'required' && !indexes.has(key),
  ).map((key) => COLUMNS[key].header);
  if (missing.length > 0) {
    return fail(
      { reason: 'missing-columns', headers: missing },
      `The file is missing these columns: ${missing.join(', ')}.`,
    );
  }

  if (repeated.size > 0) {
    const headers = COLUMN_KEYS.filter((key) => repeated.has(key)).map(
      (key) => COLUMNS[key].header,
    );
    return fail(
      { reason: 'repeated-columns', headers },
      `The file has these columns more than once: ${headers.join(', ')}.`,
    );
  }

  const rows: ParsedRow[] = [];
  for (const [index, cells] of body.entries()) {
    if (isBlank(cells)) continue;
    if (rows.length === MAX_ROWS) {
      return fail(
        { reason: 'too-many-rows' },
        'The file has more than 5,000 rows.',
      );
    }
    rows.push({
      // The header is row 1, so the first body record is row 2.
      row: index + 2,
      cells: Object.fromEntries(
        COLUMN_KEYS.map((key) => {
          const column = indexes.get(key);
          return [key, column === undefined ? '' : (cells[column] ?? '')];
        }),
      ) as Record<ColumnKey, string>,
    });
  }

  return { ok: true, rows };
}
