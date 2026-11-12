import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, MAX_ROWS, parseCsv } from './parseCsv';

/** BlueIQ's daily file, as Jason sent it on Nov 12 (D-44). */
const IMPORT = [
  'Plant ID',
  'Latitude',
  'Longitude',
  'Financing Amount ($)',
  'Size (MWdc)',
  'Technology / Project Type',
  'Project Name',
];

/** The starter workbook's Required headers, as the spec's column table names them. */
const STARTER = [
  'Plant ID',
  'Plant Name',
  'Project ID',
  'Project Name',
  'Project Type',
  'Project Status',
  'Active',
  'Latitude',
  'Longitude',
  'Address',
  'City',
  'State',
  'ZIP',
  'County',
  'Website ID',
];

const encode = (text: string) => new TextEncoder().encode(text);

const csvText = (header: string[], rows: string[][]) =>
  [header, ...rows].map((cells) => cells.join(',')).join('\r\n');

const file = (header: string[], ...rows: string[][]) =>
  encode(csvText(header, rows));

/** A row with a value in every column, such as "Plant ID value". */
const fullRow = (header: string[], values: Record<string, string> = {}) =>
  header.map((name) => values[name] ?? `${name} value`);

function rowsOf(...args: Parameters<typeof parseCsv>) {
  const result = parseCsv(...args);
  if (!result.ok) throw new Error(result.message);
  return result.rows;
}

function errorOf(...args: Parameters<typeof parseCsv>) {
  const result = parseCsv(...args);
  if (result.ok) throw new Error('The file parsed.');
  return result;
}

describe('parseCsv headers in an import (AC-4.2, D-44)', () => {
  it("reads BlueIQ's 7 columns, with Technology / Project Type as the Project Type", () => {
    const [row] = rowsOf(
      file(IMPORT, [
        '1149',
        '32.832423',
        '-117.135577',
        '',
        '0.3240',
        'Solar + Battery',
        'Kearny Mesa Court',
      ]),
    );

    expect(row?.cells).toMatchObject({
      plantId: '1149',
      latitude: '32.832423',
      longitude: '-117.135577',
      financingAmount: '',
      sizeMw: '0.3240',
      projectType: 'Solar + Battery',
      projectName: 'Kearny Mesa Court',
    });
  });

  it('matches headers in any order, ignoring case and extra spaces', () => {
    const header = [
      ' project  name ',
      'SIZE (MWDC)',
      ...IMPORT.filter(
        (name) => !['Project Name', 'Size (MWdc)'].includes(name),
      ),
    ];
    const [row] = rowsOf(
      file(
        header,
        fullRow(header, {
          ' project  name ': 'Wells CSG',
          'SIZE (MWDC)': '1.5092',
        }),
      ),
    );

    expect(row?.cells).toMatchObject({
      projectName: 'Wells CSG',
      sizeMw: '1.5092',
      plantId: 'Plant ID value',
    });
  });

  // The file no longer sends these, and imports leave their fields alone (G1).
  it("ignores the starter workbook's other columns and unknown columns", () => {
    const header = [...IMPORT, 'Plant Name', 'City', 'Website ID', 'Notes', ''];
    const [row] = rowsOf(file(header, fullRow(header)));

    expect(row?.cells).toMatchObject({
      plantName: '',
      city: '',
      websiteId: '',
      projectName: 'Project Name value',
    });
  });

  it("rejects the old 15-column file and names the columns it lacks, in BlueIQ's order", () => {
    const old = STARTER.filter((name) => name !== 'Website ID');
    const result = errorOf(file(old, fullRow(old)));

    expect(result.error).toEqual({
      reason: 'missing-columns',
      headers: [
        'Financing Amount ($)',
        'Size (MWdc)',
        'Technology / Project Type',
      ],
    });
    expect(result.message).toBe(
      'The file is missing these columns: Financing Amount ($), Size (MWdc), Technology / Project Type.',
    );
  });

  // Numbers on a Mac exports the table's name above the headers.
  it('rejects a title line above the headers', () => {
    const text = `bluepath-website-map-sample\r\n${csvText(IMPORT, [fullRow(IMPORT)])}`;
    const result = errorOf(encode(text));

    expect(result.error).toEqual({
      reason: 'missing-columns',
      headers: IMPORT,
    });
  });

  it('rejects an empty file for its missing columns', () => {
    expect(errorOf(encode('')).error).toEqual({
      reason: 'missing-columns',
      headers: IMPORT,
    });
  });

  it('rejects a file that repeats a column', () => {
    const header = [...IMPORT, 'plant id'];
    const result = errorOf(file(header, fullRow(header)));

    expect(result.error).toEqual({
      reason: 'repeated-columns',
      headers: ['Plant ID'],
    });
    expect(result.message).toContain('Plant ID');
  });
});

describe('parseCsv headers in the starter load (AC-8.3, AC-8.7)', () => {
  it("reads the starter workbook's layout, with Project Type under its own name", () => {
    const header = [...STARTER, 'Entity Type', 'Technology (BlueIQ value)'];
    const [row] = rowsOf(
      file(
        header,
        fullRow(header, {
          'Project Type': 'Solar + BESS',
          'Website ID': 'project-7',
          'Entity Type': 'Municipal',
        }),
      ),
      { starter: true },
    );

    expect(row?.cells).toMatchObject({
      projectType: 'Solar + BESS',
      plantName: 'Plant Name value',
      county: 'County value',
      websiteId: 'project-7',
      entity: 'Municipal',
      // Optional in the starter workbook, which predates them.
      sizeMw: '',
      financingAmount: '',
      size: '',
    });
  });

  // Without the column, the load would add every plant as a new project and hide every website
  // project. That points to the wrong tab or an import file.
  it('needs the Website ID column', () => {
    const header = STARTER.filter((name) => name !== 'Website ID');
    const result = errorOf(file(header, fullRow(header)), { starter: true });

    expect(result.error).toEqual({
      reason: 'missing-columns',
      headers: ['Website ID'],
    });
    expect(result.message).toBe(
      'The file is missing these columns: Website ID.',
    );
  });

  it("rejects BlueIQ's 7-column file, which lacks the starter workbook's columns", () => {
    const result = errorOf(file(IMPORT, fullRow(IMPORT)), { starter: true });

    expect(result.error).toMatchObject({ reason: 'missing-columns' });
    expect(result.error).toHaveProperty('headers', [
      'Plant Name',
      'Project ID',
      'Project Type',
      'Project Status',
      'Active',
      'Address',
      'City',
      'State',
      'ZIP',
      'County',
      'Website ID',
    ]);
  });

  it('names a repeated optional column', () => {
    const header = [...STARTER, 'Entity Type', 'entity type'];
    const result = errorOf(file(header, fullRow(header)), { starter: true });

    expect(result.error).toEqual({
      reason: 'repeated-columns',
      headers: ['Entity Type'],
    });
  });
});

describe('parseCsv cells and rows (NFR-006)', () => {
  it('reads UTF-8 with or without a byte-order mark', () => {
    const text = csvText(IMPORT, [
      fullRow(IMPORT, { 'Plant ID': 'P-1', 'Project Name': 'Niña Solar' }),
    ]);
    const withMark = encode(`﻿${text}`);

    for (const bytes of [encode(text), withMark]) {
      expect(rowsOf(bytes)[0]?.cells).toMatchObject({
        plantId: 'P-1',
        projectName: 'Niña Solar',
      });
    }
  });

  it('rejects bytes that are not UTF-8', () => {
    const latin1 = Uint8Array.from(
      `${IMPORT.join(',')}\r\nNi\xf1a`,
      (character) => character.charCodeAt(0),
    );
    expect(errorOf(latin1).error).toEqual({ reason: 'not-utf8' });
  });

  it('keeps every cell as written, without evaluating it', () => {
    const [row] = rowsOf(
      file(
        IMPORT,
        fullRow(IMPORT, {
          'Plant ID': '00123',
          'Technology / Project Type': '=1+1',
          'Project Name': '<b>Bold</b>',
          Latitude: '1e5',
          'Size (MWdc)': ' 0.5 ',
        }),
      ),
    );
    expect(row?.cells).toMatchObject({
      plantId: '00123',
      projectType: '=1+1',
      projectName: '<b>Bold</b>',
      latitude: '1e5',
      sizeMw: ' 0.5 ',
    });
  });

  it('reads quoted cells and numbers rows as a spreadsheet does', () => {
    const header = [
      'Project Name',
      ...IMPORT.filter((name) => name !== 'Project Name'),
    ];
    const text = [
      header.join(','),
      `"Lincoln, ""North""\nSolar",P-1`,
      'Short Row,P-2',
    ].join('\r\n');
    const rows = rowsOf(encode(text));

    expect(rows.map(({ row }) => row)).toEqual([2, 3]);
    expect(rows[0]?.cells).toMatchObject({
      projectName: 'Lincoln, "North"\nSolar',
      plantId: 'P-1',
    });
    expect(rows[1]?.cells).toMatchObject({
      projectName: 'Short Row',
      plantId: 'P-2',
      sizeMw: '',
    });
  });

  it('skips blank rows but keeps the row numbers', () => {
    const text = [
      IMPORT.join(','),
      fullRow(IMPORT, { 'Plant ID': 'P-1' }).join(','),
      '',
      ',,,',
      ' , ',
      fullRow(IMPORT, { 'Plant ID': 'P-2' }).join(','),
    ].join('\n');
    const rows = rowsOf(encode(text));

    expect(rows.map(({ row, cells }) => [row, cells.plantId])).toEqual([
      [2, 'P-1'],
      [6, 'P-2'],
    ]);
  });

  it('rejects malformed CSV with its row, without quoting the cell', () => {
    for (const bad of ['"Secret plant,P-1', 'Secret "plant",P-1']) {
      const result = errorOf(encode(`${IMPORT.join(',')}\n${bad}\n`));
      expect(result.error).toEqual({ reason: 'malformed', row: 2 });
      expect(result.message).toContain('row 2');
      expect(result.message).not.toContain('Secret');
    }
    const afterMultiLineCell = errorOf(
      encode(`${IMPORT.join(',')}\n"Two\nlines",P-1\nBad "quote",P-2\n`),
    );
    expect(afterMultiLineCell.error).toEqual({ reason: 'malformed', row: 3 });
  });
});

describe('parseCsv limits (NFR-006)', () => {
  it('rejects a file over 5 MB before reading it', () => {
    expect(MAX_FILE_BYTES).toBe(5 * 1024 * 1024);
    const atLimit = new Uint8Array(MAX_FILE_BYTES).fill(0x61);
    const overLimit = new Uint8Array(MAX_FILE_BYTES + 1).fill(0x61);

    expect(errorOf(atLimit).error.reason).toBe('missing-columns');
    expect(errorOf(overLimit).error).toEqual({ reason: 'too-big' });
  });

  it('accepts 5,000 rows and rejects more', () => {
    expect(MAX_ROWS).toBe(5000);
    const rows = (count: number) =>
      Array.from({ length: count }, (_, index) => [`P-${index}`]);

    expect(rowsOf(file(IMPORT, ...rows(5000), [''], ['']))).toHaveLength(5000);
    expect(errorOf(file(IMPORT, ...rows(5001))).error).toEqual({
      reason: 'too-many-rows',
    });
  });
});
