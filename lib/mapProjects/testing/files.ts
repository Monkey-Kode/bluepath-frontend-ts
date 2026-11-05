import { COLUMN_KEYS, COLUMNS, type ColumnKey } from '../columns';

/** One file row's cells by column. A missing cell is blank. */
export type Cells = Partial<Record<ColumnKey, string>>;

const FILE_KEYS = COLUMN_KEYS.filter(
  (key) => COLUMNS[key].presence !== 'starter',
);

function fileOf(keys: readonly ColumnKey[], rows: Cells[]) {
  const quote = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  const lines = [
    keys.map((key) => COLUMNS[key].header),
    ...rows.map((cells) => keys.map((key) => cells[key] ?? '')),
  ];
  return new TextEncoder().encode(
    lines.map((cells) => cells.map(quote).join(',')).join('\r\n'),
  );
}

/** A CSV file with every column that BlueIQ sends, and the given rows from row 2 on. */
export const csv = (...rows: Cells[]) => fileOf(FILE_KEYS, rows);

/** The starter workbook's Projects tab as CSV. It adds the Website ID column. */
export const starterCsv = (...rows: Cells[]) => fileOf(COLUMN_KEYS, rows);
