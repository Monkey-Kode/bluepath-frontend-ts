/**
 * The column lists for map project files. BlueIQ's daily file and every manual import use the
 * import columns. The one-time starter workbook and backups use the full layout.
 */

export interface Column {
  /** The header in the starter workbook and in backups. */
  header: string;
  /** The header in BlueIQ's daily file, when it differs. */
  importHeader?: string;
  /** The starter workbook must have a `required` column. */
  starter: 'required' | 'optional';
}

/**
 * The full layout, in the starter workbook's order, then the fields that only BlueIQ's daily file
 * sends, then Website ID. Backups write every column in this order.
 */
export const COLUMNS = {
  plantId: { header: 'Plant ID', starter: 'required' },
  plantName: { header: 'Plant Name', starter: 'required' },
  projectId: { header: 'Project ID', starter: 'required' },
  projectName: { header: 'Project Name', starter: 'required' },
  projectType: {
    header: 'Project Type',
    importHeader: 'Technology / Project Type',
    starter: 'required',
  },
  projectStatus: { header: 'Project Status', starter: 'required' },
  active: { header: 'Active', starter: 'required' },
  latitude: { header: 'Latitude', starter: 'required' },
  longitude: { header: 'Longitude', starter: 'required' },
  address: { header: 'Address', starter: 'required' },
  city: { header: 'City', starter: 'required' },
  state: { header: 'State', starter: 'required' },
  zip: { header: 'ZIP', starter: 'required' },
  county: { header: 'County', starter: 'required' },
  entity: { header: 'Entity Type', starter: 'optional' },
  financing: { header: 'Financing Type', starter: 'optional' },
  size: { header: 'Size ($)', starter: 'optional' },
  technologies: { header: 'Technologies', starter: 'optional' },
  sizeMw: { header: 'Size (MWdc)', starter: 'optional' },
  financingAmount: { header: 'Financing Amount ($)', starter: 'optional' },
  websiteId: { header: 'Website ID', starter: 'required' },
} as const satisfies Record<string, Column>;

export type ColumnKey = keyof typeof COLUMNS;

export const COLUMN_KEYS = Object.keys(COLUMNS) as ColumnKey[];

/**
 * BlueIQ's daily file, in its column order (D-44). Every import needs each of these, and imports
 * ignore every other column.
 */
export const IMPORT_KEYS = [
  'plantId',
  'latitude',
  'longitude',
  'financingAmount',
  'sizeMw',
  'projectType',
  'projectName',
] as const satisfies readonly ColumnKey[];

export type ImportKey = (typeof IMPORT_KEYS)[number];

/** A column's header in an import file. */
export const importHeaderOf = (key: ColumnKey) => {
  const column: Column = COLUMNS[key];
  return column.importHeader ?? column.header;
};
