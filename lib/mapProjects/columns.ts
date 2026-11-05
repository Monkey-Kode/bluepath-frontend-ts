/**
 * The one column list for map project files. BlueIQ's daily file, a Google Sheet, an uploaded
 * .xlsx or .csv, the template, and the starter load all use these headers.
 */

/** Required columns must be in every file. Starter columns count only in the starter load. */
export type ColumnPresence = 'required' | 'optional' | 'starter';

export interface Column {
  /** The header as BlueIQ names it. */
  header: string;
  presence: ColumnPresence;
}

/** In the starter workbook's order, so the template and backups match its layout. */
export const COLUMNS = {
  plantId: { header: 'Plant ID', presence: 'required' },
  plantName: { header: 'Plant Name', presence: 'required' },
  projectId: { header: 'Project ID', presence: 'required' },
  projectName: { header: 'Project Name', presence: 'required' },
  projectType: { header: 'Project Type', presence: 'required' },
  projectStatus: { header: 'Project Status', presence: 'required' },
  active: { header: 'Active', presence: 'required' },
  latitude: { header: 'Latitude', presence: 'required' },
  longitude: { header: 'Longitude', presence: 'required' },
  address: { header: 'Address', presence: 'required' },
  city: { header: 'City', presence: 'required' },
  state: { header: 'State', presence: 'required' },
  zip: { header: 'ZIP', presence: 'required' },
  county: { header: 'County', presence: 'required' },
  entity: { header: 'Entity Type', presence: 'optional' },
  financing: { header: 'Financing Type', presence: 'optional' },
  size: { header: 'Size ($)', presence: 'optional' },
  technologies: { header: 'Technologies', presence: 'optional' },
  websiteId: { header: 'Website ID', presence: 'starter' },
} as const satisfies Record<string, Column>;

export type ColumnKey = keyof typeof COLUMNS;

export const COLUMN_KEYS = Object.keys(COLUMNS) as ColumnKey[];
