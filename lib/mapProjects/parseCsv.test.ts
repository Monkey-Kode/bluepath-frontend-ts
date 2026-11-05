import { describe, expect, it } from 'vitest';
import { MAX_FILE_BYTES, MAX_ROWS, parseCsv } from './parseCsv';

/** The Required headers, as the spec's column table names them. */
const REQUIRED = [
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
];

const encode = (text: string) => new TextEncoder().encode(text);

const csvText = (header: string[], rows: string[][]) =>
  [header, ...rows].map((cells) => cells.join(',')).join('\r\n');

const file = (header: string[], ...rows: string[][]) =>
  encode(csvText(header, rows));

/** A row with a value in every Required column, such as "Plant Name value". */
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

describe('parseCsv headers (AC-4.2, D-35)', () => {
  it('matches headers by name in any order, ignoring case and extra spaces', () => {
    const header = [
      ' zip ',
      'PLANT  NAME',
      'size ($)',
      'Plant id',
      ...REQUIRED.filter(
        (name) => !['ZIP', 'Plant Name', 'Plant ID'].includes(name),
      ),
    ];
    const [row] = rowsOf(
      file(
        header,
        fullRow(header, {
          ' zip ': '68508',
          'PLANT  NAME': 'Lincoln Solar',
          'size ($)': '1200',
          'Plant id': 'P-1',
        }),
      ),
    );

    expect(row?.cells).toMatchObject({
      plantId: 'P-1',
      plantName: 'Lincoln Solar',
      zip: '68508',
      size: '1200',
      projectType: 'Project Type value',
      county: 'County value',
    });
  });

  it('leaves an Optional column blank when the file lacks it', () => {
    const [row] = rowsOf(file(REQUIRED, fullRow(REQUIRED)));
    expect(row?.cells).toMatchObject({
      entity: '',
      financing: '',
      size: '',
      technologies: '',
      websiteId: '',
    });
  });

  it('ignores unknown columns and "Technology (BlueIQ value)"', () => {
    const header = [...REQUIRED, 'Technology (BlueIQ value)', 'Notes', ''];
    const [row] = rowsOf(
      file(
        header,
        fullRow(header, {
          'Project Type': 'Solar',
          'Technology (BlueIQ value)': 'Solar PV',
          Notes: 'Call back',
          '': 'stray',
        }),
      ),
    );

    expect(Object.keys(row?.cells ?? {}).sort()).toEqual(
      [
        'plantId',
        'plantName',
        'projectId',
        'projectName',
        'projectType',
        'projectStatus',
        'active',
        'latitude',
        'longitude',
        'address',
        'city',
        'state',
        'zip',
        'county',
        'entity',
        'financing',
        'size',
        'technologies',
        'websiteId',
      ].sort(),
    );
    expect(row?.cells.projectType).toBe('Solar');
  });

  it('rejects a file that lacks a Required column and names each missing header', () => {
    const header = [
      'Plant Identifier',
      ...REQUIRED.filter(
        (name) => !['Plant ID', 'Project ID', 'County'].includes(name),
      ),
      'Entity Type',
    ];
    const result = errorOf(file(header, fullRow(header)));

    expect(result.error).toEqual({
      reason: 'missing-columns',
      headers: ['Plant ID', 'Project ID', 'County'],
    });
    expect(result.message).toContain('Plant ID, Project ID, County');
  });

  it('rejects an empty file for its missing columns', () => {
    const result = errorOf(encode(''));
    expect(result.error).toEqual({
      reason: 'missing-columns',
      headers: REQUIRED,
    });
  });

  it('rejects a file that repeats a column', () => {
    const header = [...REQUIRED, 'plant id'];
    const result = errorOf(file(header, fullRow(header)));

    expect(result.error).toEqual({
      reason: 'repeated-columns',
      headers: ['Plant ID'],
    });
    expect(result.message).toContain('Plant ID');
  });

  it('reads Website ID only in the starter load', () => {
    const header = [...REQUIRED, 'Website ID'];
    const bytes = file(header, fullRow(header, { 'Website ID': 'project-7' }));

    expect(rowsOf(bytes)[0]?.cells.websiteId).toBe('');
    expect(rowsOf(bytes, { starter: true })[0]?.cells.websiteId).toBe(
      'project-7',
    );
    expect(
      rowsOf(file(REQUIRED, fullRow(REQUIRED)), { starter: true })[0]?.cells
        .websiteId,
    ).toBe('');
  });
});

describe('parseCsv cells and rows (NFR-006)', () => {
  it('reads UTF-8 with or without a byte-order mark', () => {
    const text = csvText(REQUIRED, [
      fullRow(REQUIRED, { 'Plant ID': 'P-1', 'Plant Name': 'Niña Solar' }),
    ]);
    const withMark = encode(`﻿${text}`);

    for (const bytes of [encode(text), withMark]) {
      expect(rowsOf(bytes)[0]?.cells).toMatchObject({
        plantId: 'P-1',
        plantName: 'Niña Solar',
      });
    }
  });

  it('rejects bytes that are not UTF-8', () => {
    const latin1 = Uint8Array.from(
      `${REQUIRED.join(',')}\r\nNi\xf1a`,
      (character) => character.charCodeAt(0),
    );
    expect(errorOf(latin1).error).toEqual({ reason: 'not-utf8' });
  });

  it('keeps every cell as written, without evaluating it', () => {
    const [row] = rowsOf(
      file(
        REQUIRED,
        fullRow(REQUIRED, {
          'Plant ID': '00123',
          'Plant Name': '=1+1',
          'Project Name': '<b>Bold</b>',
          Latitude: '1e5',
          City: ' Lincoln ',
        }),
      ),
    );
    expect(row?.cells).toMatchObject({
      plantId: '00123',
      plantName: '=1+1',
      projectName: '<b>Bold</b>',
      latitude: '1e5',
      city: ' Lincoln ',
    });
  });

  it('reads quoted cells and numbers rows as a spreadsheet does', () => {
    const header = [
      'Plant Name',
      ...REQUIRED.filter((name) => name !== 'Plant Name'),
    ];
    const text = [
      header.join(','),
      `"Lincoln, ""North""\nSolar",P-1`,
      'Short Row,P-2',
    ].join('\r\n');
    const rows = rowsOf(encode(text));

    expect(rows.map(({ row }) => row)).toEqual([2, 3]);
    expect(rows[0]?.cells).toMatchObject({
      plantName: 'Lincoln, "North"\nSolar',
      plantId: 'P-1',
    });
    expect(rows[1]?.cells).toMatchObject({
      plantName: 'Short Row',
      plantId: 'P-2',
      county: '',
    });
  });

  it('skips blank rows but keeps the row numbers', () => {
    const text = [
      REQUIRED.join(','),
      fullRow(REQUIRED, { 'Plant ID': 'P-1' }).join(','),
      '',
      ',,,',
      ' , ',
      fullRow(REQUIRED, { 'Plant ID': 'P-2' }).join(','),
    ].join('\n');
    const rows = rowsOf(encode(text));

    expect(rows.map(({ row, cells }) => [row, cells.plantId])).toEqual([
      [2, 'P-1'],
      [6, 'P-2'],
    ]);
  });

  it('rejects malformed CSV with its row, without quoting the cell', () => {
    for (const bad of ['"Secret plant,P-1', 'Secret "plant",P-1']) {
      const result = errorOf(encode(`${REQUIRED.join(',')}\n${bad}\n`));
      expect(result.error).toEqual({ reason: 'malformed', row: 2 });
      expect(result.message).toContain('row 2');
      expect(result.message).not.toContain('Secret');
    }
    const afterMultiLineCell = errorOf(
      encode(`${REQUIRED.join(',')}\n"Two\nlines",P-1\nBad "quote",P-2\n`),
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

    expect(rowsOf(file(REQUIRED, ...rows(5000), [''], ['']))).toHaveLength(
      5000,
    );
    expect(errorOf(file(REQUIRED, ...rows(5001))).error).toEqual({
      reason: 'too-many-rows',
    });
  });
});
