import { describe, expect, it } from 'vitest';
import { COLUMN_KEYS, type ColumnKey } from './columns';
import type { ParsedRow } from './parseCsv';
import {
  type StarterRow,
  type ValidatedRow,
  validateRows,
  validateStarterRows,
} from './validate';

/** A row with every cell blank, then the given cells. */
function parsedRow(
  row: number,
  cells: Partial<Record<ColumnKey, string>>,
): ParsedRow {
  const blank = Object.fromEntries(
    COLUMN_KEYS.map((key) => [key, '']),
  ) as Record<ColumnKey, string>;
  return { row, cells: { ...blank, ...cells } };
}

/** The cells of a row that passes, with a Plant ID, a name, coordinates, and a known type. */
const VALID: Partial<Record<ColumnKey, string>> = {
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
  latitude: '40.8',
  longitude: '-96.7',
  projectType: 'Solar',
};

function validateOne(cells: Partial<Record<ColumnKey, string>>) {
  const [result] = validateRows([parsedRow(2, cells)]);
  if (!result) throw new Error('No result.');
  return result;
}

function fieldsOf(cells: Partial<Record<ColumnKey, string>>) {
  const result = validateOne(cells);
  if (!result.ok) throw new Error(result.errors[0]?.message);
  return result.fields;
}

function errorsOf(result: ValidatedRow) {
  return result.ok ? [] : result.errors.map((error) => error.reason);
}

function warningsOf(cells: Partial<Record<ColumnKey, string>>) {
  const result = validateOne(cells);
  if (!result.ok) throw new Error(result.errors[0]?.message);
  return result.warnings.map((warning) => warning.reason);
}

describe('validateRows fields (FR-007)', () => {
  it('turns a row into the fields a map project stores', () => {
    expect(
      fieldsOf({
        plantId: ' P_100-a ',
        plantName: ' Lincoln Solar ',
        projectName: 'Lincoln Schools',
        projectId: 'J-7',
        projectType: 'Solar + BESS',
        projectStatus: 'Operating',
        active: 'Yes',
        latitude: ' 40.80 ',
        longitude: '-96.7',
        address: '1 Main St\nSuite 2',
        city: 'Lincoln',
        state: 'NE',
        zip: '00123',
        county: 'Lancaster',
        entity: 'Municipal; K-12 ;',
        financing: 'PPA',
        size: '$1,200,000.50',
        technologies: 'Solar PV;;Battery Storage',
      }),
    ).toEqual({
      plantId: 'P_100-a',
      plantName: 'Lincoln Solar',
      projectName: 'Lincoln Schools',
      projectId: 'J-7',
      projectType: 'Solar + BESS',
      projectStatus: 'Operating',
      active: true,
      location: { lat: 40.8, lng: -96.7 },
      address: '1 Main St\nSuite 2',
      city: 'Lincoln',
      state: 'Nebraska',
      zip: '00123',
      county: 'Lancaster',
      entity: ['Municipal', 'K-12'],
      financing: ['PPA'],
      size: 1200000.5,
      technologies: ['Solar PV', 'Battery Storage'],
      websiteId: null,
    });
  });

  it('reads a blank cell as null, including a list with only separators', () => {
    expect(
      fieldsOf({
        plantId: 'P-1',
        projectName: 'Lincoln Schools',
        entity: ' ; ; ',
        city: '   ',
      }),
    ).toEqual({
      plantId: 'P-1',
      plantName: null,
      projectName: 'Lincoln Schools',
      projectId: null,
      projectType: null,
      projectStatus: null,
      active: null,
      location: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      county: null,
      entity: null,
      financing: null,
      size: null,
      technologies: null,
      websiteId: null,
    });
  });

  it('accepts a state code or name in any case, and keeps an unknown state as written', () => {
    const stateOf = (state: string) => fieldsOf({ ...VALID, state }).state;
    expect(stateOf('ne')).toBe('Nebraska');
    expect(stateOf(' new  york ')).toBe('New York');
    expect(stateOf('District of Columbia')).toBe('District of Columbia');
    expect(stateOf(' Ontario ')).toBe('Ontario');
  });

  it('reads Active as Yes, No, or blank in any case', () => {
    const activeOf = (active: string) => fieldsOf({ ...VALID, active }).active;
    expect(activeOf(' yes ')).toBe(true);
    expect(activeOf('NO')).toBe(false);
    expect(activeOf('')).toBeNull();
  });

  it('reads a size with or without a dollar sign and thousands commas', () => {
    const sizeOf = (size: string) => fieldsOf({ ...VALID, size }).size;
    expect(sizeOf('1200')).toBe(1200);
    expect(sizeOf('$ 1,200')).toBe(1200);
    expect(sizeOf('0')).toBe(0);
    expect(sizeOf('2500000.75')).toBe(2500000.75);
  });

  it('keeps the Website ID from the starter load', () => {
    expect(fieldsOf({ ...VALID, websiteId: ' 0a1b-2c3d ' }).websiteId).toBe(
      '0a1b-2c3d',
    );
  });
});

describe('validateRows errors (AC-4.3)', () => {
  it('rejects a row without a Plant ID', () => {
    expect(errorsOf(validateOne({ ...VALID, plantId: '  ' }))).toEqual([
      'no-plant-id',
    ]);
  });

  it('accepts letters, digits, "_" and "-" up to 64 characters in a Plant ID', () => {
    expect(validateOne({ ...VALID, plantId: 'a'.repeat(64) }).ok).toBe(true);
    for (const plantId of ['P 1', 'P/1', 'P.1', 'Plänt', 'a'.repeat(65)]) {
      const result = validateOne({ ...VALID, plantId });
      expect(errorsOf(result)).toEqual(['bad-plant-id']);
      expect(result.ok ? '' : result.errors[0]?.message).not.toContain(plantId);
    }
  });

  it('rejects every row that repeats a Plant ID and names the other rows', () => {
    const results = validateRows([
      parsedRow(2, { ...VALID, plantId: 'P-1' }),
      parsedRow(3, { ...VALID, plantId: 'P-2' }),
      parsedRow(5, { ...VALID, plantId: ' P-1' }),
      parsedRow(9, { ...VALID, plantId: 'P-1' }),
      parsedRow(11, { ...VALID, plantId: 'P-3' }),
      parsedRow(12, { ...VALID, plantId: 'P-3' }),
      parsedRow(14, { ...VALID, plantId: 'p-3' }),
    ]);

    expect(
      results.map((result) => [
        result.row,
        result.ok ? 'ok' : result.errors.map((error) => error.message),
      ]),
    ).toEqual([
      [2, ['Rows 5 and 9 have the same Plant ID.']],
      [3, 'ok'],
      [5, ['Rows 2 and 9 have the same Plant ID.']],
      [9, ['Rows 2 and 5 have the same Plant ID.']],
      [11, ['Row 12 has the same Plant ID.']],
      [12, ['Row 11 has the same Plant ID.']],
      [14, 'ok'],
    ]);
    expect(errorsOf(results[0] as ValidatedRow)).toEqual(['bad-plant-id']);
  });

  it('rejects a row without a Plant Name or a Project Name', () => {
    const noName = { ...VALID, plantName: '', projectName: ' ' };
    expect(errorsOf(validateOne(noName))).toEqual(['no-name']);
    expect(validateOne({ ...noName, projectName: 'Schools' }).ok).toBe(true);
  });

  it.each([
    [{ latitude: 'north' }, 'Latitude is not a number.'],
    [{ longitude: '96.7W' }, 'Longitude is not a number.'],
    [{ latitude: '4e1' }, 'Latitude is not a number.'],
    [{ latitude: '90.01' }, 'Latitude must be between -90 and 90.'],
    [{ latitude: '-90.5' }, 'Latitude must be between -90 and 90.'],
    [{ longitude: '180.2' }, 'Longitude must be between -180 and 180.'],
    [{ longitude: '-181' }, 'Longitude must be between -180 and 180.'],
    [{ longitude: '' }, 'Latitude has no Longitude.'],
    [{ latitude: ' ' }, 'Longitude has no Latitude.'],
  ])('rejects the coordinates %j', (cells, message) => {
    expect(validateOne({ ...VALID, ...cells })).toMatchObject({
      ok: false,
      errors: [{ reason: 'bad-coordinates', message }],
    });
  });

  it('accepts coordinates at the edges of their range', () => {
    expect(
      fieldsOf({ ...VALID, latitude: '-90', longitude: '180.0' }).location,
    ).toEqual({ lat: -90, lng: 180 });
    expect(
      fieldsOf({ ...VALID, latitude: '+90', longitude: '-180' }).location,
    ).toEqual({ lat: 90, lng: -180 });
  });

  it.each([
    '12abc',
    '$',
    '1,20',
    '12,3456',
    '1.2.3',
    '1e6',
    'USD 100',
  ])('rejects the size %j', (size) => {
    expect(errorsOf(validateOne({ ...VALID, size }))).toEqual(['bad-size']);
  });

  it.each([
    'Y',
    'true',
    '1',
    'Inactive',
  ])('rejects the Active value %j', (active) => {
    expect(errorsOf(validateOne({ ...VALID, active }))).toEqual(['bad-active']);
  });

  it('lists every problem on a row in the spec order and keeps its Plant ID', () => {
    const result = validateOne({
      plantId: 'P 1',
      latitude: '91',
      longitude: 'west',
      size: 'lots',
      active: 'maybe',
    });

    expect(result).toMatchObject({ ok: false, row: 2, plantId: 'P 1' });
    expect(errorsOf(result)).toEqual([
      'bad-plant-id',
      'no-name',
      'bad-coordinates',
      'bad-coordinates',
      'bad-size',
      'bad-active',
    ]);
    expect(
      result.ok ? [] : result.errors.map((error) => error.message),
    ).toEqual([
      'The Plant ID can hold only letters, digits, "_", and "-", up to 64 characters.',
      'The row has no Plant Name or Project Name.',
      'Latitude must be between -90 and 90.',
      'Longitude is not a number.',
      'Size ($) is not a number.',
      'Active must be Yes, No, or blank.',
    ]);
  });

  it('gives a row without a Plant ID a null one', () => {
    expect(validateOne({ ...VALID, plantId: '' })).toMatchObject({
      ok: false,
      plantId: null,
    });
  });
});

describe('validateRows warnings (AC-4.3)', () => {
  it('gives no warning to a row the map can show', () => {
    expect(warningsOf(VALID)).toEqual([]);
  });

  it('warns about a row without coordinates', () => {
    expect(warningsOf({ ...VALID, latitude: '', longitude: '' })).toEqual([
      'no-coordinates',
    ]);
  });

  it('warns about a Project Type with no map category', () => {
    expect(warningsOf({ ...VALID, projectType: 'Wind' })).toEqual([
      'unknown-project-type',
    ]);
    expect(
      warningsOf({ ...VALID, projectType: '', technologies: 'Geothermal' }),
    ).toEqual(['unknown-project-type']);
    expect(
      warningsOf({ ...VALID, projectType: ' ', technologies: 'Solar PV' }),
    ).toEqual([]);
  });

  it('warns about a row with Active set to No', () => {
    expect(warningsOf({ ...VALID, active: 'No' })).toEqual(['inactive']);
  });

  it('lists every warning on a row', () => {
    expect(
      warningsOf({
        ...VALID,
        latitude: '',
        longitude: '',
        projectType: 'Wind',
        active: 'no',
      }),
    ).toEqual(['no-coordinates', 'unknown-project-type', 'inactive']);
  });

  it('gives an error row no warnings', () => {
    const result = validateOne({ ...VALID, plantId: '', active: 'No' });
    expect(result).not.toHaveProperty('warnings');
  });
});

describe('validateStarterRows (AC-8.7)', () => {
  /** A website-only row of the starter workbook (AC-8.3). */
  const WEBSITE_ONLY = {
    websiteId: ' 7c1d-library ',
    projectName: 'Old Library',
    technologies: 'LED Lighting',
  };

  const starterOne = (cells: Partial<Record<ColumnKey, string>>) => {
    const [result] = validateStarterRows([parsedRow(2, cells)]);
    if (!result) throw new Error('No result.');
    return result;
  };

  const starterErrors = (result: StarterRow) =>
    result.ok ? [] : result.errors.map((error) => error.reason);

  it('accepts a website project row without a Plant ID', () => {
    const result = starterOne(WEBSITE_ONLY);

    expect(result).toMatchObject({
      ok: true,
      row: 2,
      plantId: null,
      websiteId: '7c1d-library',
      fields: {
        plantId: null,
        websiteId: '7c1d-library',
        projectName: 'Old Library',
        technologies: ['LED Lighting'],
      },
    });
  });

  it('reads the cells of a plant row exactly as an import does', () => {
    const cells = {
      ...VALID,
      state: 'ne',
      entity: 'K-12; Municipal',
      size: '$1,200',
      active: 'No',
    };
    const [imported] = validateRows([parsedRow(2, cells)]);

    expect(starterOne(cells)).toEqual({ ...imported, websiteId: null });
  });

  it('keeps both IDs on a merged row', () => {
    expect(starterOne({ ...VALID, websiteId: '0b5e-newton' })).toMatchObject({
      ok: true,
      plantId: 'P-1',
      websiteId: '0b5e-newton',
      fields: { plantId: 'P-1', websiteId: '0b5e-newton' },
    });
  });

  it('still needs a Plant ID on a row without a Website ID', () => {
    expect(starterOne({ ...VALID, plantId: ' ' })).toMatchObject({
      ok: false,
      errors: [
        {
          reason: 'no-plant-id',
          message: 'The row has no Plant ID or Website ID.',
        },
      ],
    });
  });

  it('checks a Plant ID beside a Website ID', () => {
    expect(
      starterErrors(starterOne({ ...WEBSITE_ONLY, plantId: 'P 1' })),
    ).toEqual(['bad-plant-id']);
  });

  it('rejects every row that repeats a Website ID or a Plant ID', () => {
    const results = validateStarterRows([
      parsedRow(2, { ...WEBSITE_ONLY, websiteId: 'a-1' }),
      parsedRow(3, { ...WEBSITE_ONLY, websiteId: ' a-1' }),
      parsedRow(4, { ...WEBSITE_ONLY, websiteId: 'A-1' }),
      parsedRow(5, { ...VALID, plantId: 'P-1', websiteId: 'b-2' }),
      parsedRow(6, { ...VALID, plantId: 'P-1' }),
    ]);

    expect(
      results.map((result) => [
        result.row,
        result.ok ? 'ok' : result.errors.map((error) => error.message),
      ]),
    ).toEqual([
      [2, ['Row 3 has the same Website ID.']],
      [3, ['Row 2 has the same Website ID.']],
      [4, 'ok'],
      [5, ['Row 6 has the same Plant ID.']],
      [6, ['Row 5 has the same Plant ID.']],
    ]);
    expect(starterErrors(results[0] as StarterRow)).toEqual(['bad-website-id']);
  });

  it('keeps the IDs of an error row, so the plan never hides its project', () => {
    expect(starterOne({ ...WEBSITE_ONLY, size: 'lots' })).toEqual({
      ok: false,
      row: 2,
      plantId: null,
      websiteId: '7c1d-library',
      errors: [{ reason: 'bad-size', message: 'Size ($) is not a number.' }],
    });
  });
});
