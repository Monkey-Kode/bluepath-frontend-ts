import {
  COLUMN_KEYS,
  COLUMNS,
  type ColumnKey,
  IMPORT_KEYS,
  importHeaderOf,
} from '../columns';

/** One file row's cells by column. A missing cell is blank, and a column the file lacks is dropped. */
export type Cells = Partial<Record<ColumnKey, string>>;

function fileOf(
  keys: readonly ColumnKey[],
  headerOf: (key: ColumnKey) => string,
  rows: Cells[],
) {
  const quote = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  const lines = [
    keys.map(headerOf),
    ...rows.map((cells) => keys.map((key) => cells[key] ?? '')),
  ];
  return new TextEncoder().encode(
    lines.map((cells) => cells.map(quote).join(',')).join('\r\n'),
  );
}

/** A CSV file in BlueIQ's 7-column layout, with the given rows from row 2 on. */
export const csv = (...rows: Cells[]) =>
  fileOf(IMPORT_KEYS, importHeaderOf, rows);

/** The starter workbook's Projects tab as CSV, with every column of the full layout. */
export const starterCsv = (...rows: Cells[]) =>
  fileOf(COLUMN_KEYS, (key) => COLUMNS[key].header, rows);
