import { COLUMN_KEYS, COLUMNS, type ColumnKey } from '../columns';

/** One file row's cells by column. A missing cell is blank. */
export type Cells = Partial<Record<ColumnKey, string>>;

const FILE_KEYS = COLUMN_KEYS.filter(
  (key) => COLUMNS[key].presence !== 'starter',
);

/** A CSV file with every column that BlueIQ sends, and the given rows from row 2 on. */
export function csv(...rows: Cells[]) {
  const quote = (cell: string) => `"${cell.replaceAll('"', '""')}"`;
  const lines = [
    FILE_KEYS.map((key) => COLUMNS[key].header),
    ...rows.map((cells) => FILE_KEYS.map((key) => cells[key] ?? '')),
  ];
  return new TextEncoder().encode(
    lines.map((cells) => cells.map(quote).join(',')).join('\r\n'),
  );
}
