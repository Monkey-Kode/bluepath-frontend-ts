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

/** The cells of an import row that passes: a Plant ID, a name, coordinates, and a known type. */
const VALID: Partial<Record<ColumnKey, string>> = {
  plantId: 'P-1',
  projectName: 'Lincoln Solar',
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

function errorsOf(result: ValidatedRow | StarterRow) {
  return result.ok ? [] : result.errors.map((error) => error.reason);
}

function warningsOf(cells: Partial<Record<ColumnKey, string>>) {
  const result = validateOne(cells);
  if (!result.ok) throw new Error(result.errors[0]?.message);
  return result.warnings.map((warning) => warning.reason);
}

/** A blank value for every field, so a test names only the ones it sets. */
const BLANK_FIELDS = {
  plantName: null,
  projectName: null,
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
  sizeMw: null,
  financingAmount: null,
  websiteId: null,
};

describe('validateRows fields (FR-007, D-44)', () => {
  it("reads BlueIQ's 7 columns and counts a listed plant as active", () => {
    expect(
      fieldsOf({
        plantId: ' P_100-a ',
        projectName: ' Lincoln Schools ',
        projectType: 'Solar + Battery',
        latitude: ' 40.80 ',
        longitude: '-96.7',
        sizeMw: ' 0.5465 ',
        financingAmount: '$1,250,000',
      }),
    ).toEqual({
      ...BLANK_FIELDS,
      plantId: 'P_100-a',
      projectName: 'Lincoln Schools',
      projectType: 'Solar + Battery',
      active: true,
      location: { lat: 40.8, lng: -96.7 },
      sizeMw: 0.5465,
      financingAmount: 1250000,
    });
  });

  // The parser leaves these blank in an import. The import never writes them (G1).
  it("never reads the starter workbook's other columns", () => {
    expect(
      fieldsOf({
        ...VALID,
        plantName: 'Lincoln Solar',
        city: 'Lincoln',
        state: 'NE',
        technologies: 'Solar PV',
        size: '$1,200',
        active: 'No',
        websiteId: 'project-7',
      }),
    ).toMatchObject({
      plantName: null,
      city: null,
      state: null,
      technologies: null,
      size: null,
      active: true,
      websiteId: null,
    });
  });

  it('reads a blank cell as null', () => {
    expect(
      fieldsOf({
        ...VALID,
        sizeMw: '  ',
        financingAmount: '',
        projectType: ' ',
      }),
    ).toMatchObject({ sizeMw: null, financingAmount: null, projectType: null });
  });

  it('reads Size (MWdc) as a plain number', () => {
    const sizeOf = (sizeMw: string) => fieldsOf({ ...VALID, sizeMw }).sizeMw;
    expect(sizeOf('0.5465')).toBe(0.5465);
    expect(sizeOf('6')).toBe(6);
    expect(sizeOf('0.0000')).toBe(0);
  });

  it('reads Financing Amount ($) with or without a dollar sign and thousands commas', () => {
    const amountOf = (financingAmount: string) =>
      fieldsOf({ ...VALID, financingAmount }).financingAmount;
    expect(amountOf('1250000')).toBe(1250000);
    expect(amountOf('$ 1,250,000.50')).toBe(1250000.5);
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

  it('rejects a row without a Project Name', () => {
    expect(validateOne({ ...VALID, projectName: ' ' })).toMatchObject({
      ok: false,
      errors: [{ reason: 'no-name', message: 'The row has no Project Name.' }],
    });
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
    '0.5 MW',
    '1,000',
    '$5',
    '1e3',
    'lots',
  ])('rejects the Size (MWdc) %j', (sizeMw) => {
    expect(validateOne({ ...VALID, sizeMw })).toMatchObject({
      ok: false,
      errors: [{ reason: 'bad-size', message: 'Size (MWdc) is not a number.' }],
    });
  });

  it('lists every problem on a row in the spec order and keeps its Plant ID', () => {
    const result = validateOne({
      plantId: 'P 1',
      latitude: '91',
      longitude: 'west',
      sizeMw: 'lots',
    });

    expect(result).toMatchObject({ ok: false, row: 2, plantId: 'P 1' });
    expect(
      result.ok ? [] : result.errors.map((error) => error.message),
    ).toEqual([
      'The Plant ID can hold only letters, digits, "_", and "-", up to 64 characters.',
      'The row has no Project Name.',
      'Latitude must be between -90 and 90.',
      'Longitude is not a number.',
      'Size (MWdc) is not a number.',
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

  it("warns about a type with no map category, in the import column's words", () => {
    expect(validateOne({ ...VALID, projectType: 'Wind' })).toMatchObject({
      warnings: [
        {
          reason: 'unknown-project-type',
          message:
            'The map has no category for this Technology / Project Type, so the plant stays off the map.',
        },
      ],
    });
    expect(validateOne({ ...VALID, projectType: '' })).toMatchObject({
      warnings: [
        {
          reason: 'unknown-project-type',
          message:
            "Technology / Project Type is blank, so the plant stays off the map unless the website's Technologies give it a category.",
        },
      ],
    });
  });

  // The sample file holds "needs to be decided with BluePath" in every row.
  it('warns about text in Financing Amount ($), reads it as blank, and keeps the row', () => {
    const result = validateOne({
      ...VALID,
      financingAmount: 'needs to be decided with BluePath',
    });

    expect(result).toMatchObject({
      ok: true,
      fields: { financingAmount: null },
      warnings: [
        {
          reason: 'financing-not-number',
          message:
            'Financing Amount ($) is not a number, so the website leaves it blank.',
        },
      ],
    });
    expect(JSON.stringify(result)).not.toContain('needs to be decided');
  });

  it('lists every warning on a row', () => {
    expect(
      warningsOf({
        ...VALID,
        latitude: '',
        longitude: '',
        projectType: 'Wind',
        financingAmount: 'TBD',
      }),
    ).toEqual([
      'no-coordinates',
      'unknown-project-type',
      'financing-not-number',
    ]);
  });

  it('gives an error row no warnings', () => {
    const result = validateOne({
      ...VALID,
      plantId: '',
      financingAmount: 'TBD',
    });
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

  it('reads every column of a plant row', () => {
    expect(
      starterOne({
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
      ok: true,
      row: 2,
      plantId: 'P_100-a',
      websiteId: null,
      warnings: [],
      fields: {
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
        sizeMw: null,
        financingAmount: null,
        websiteId: null,
      },
    });
  });

  it('reads a list with only separators as null', () => {
    expect(
      starterOne({ ...VALID, entity: ' ; ; ', city: '   ' }),
    ).toMatchObject({
      fields: { entity: null, city: null },
    });
  });

  it('accepts a state code or name in any case, and keeps an unknown state as written', () => {
    const stateOf = (state: string) => {
      const result = starterOne({ ...VALID, state });
      return result.ok ? result.fields.state : undefined;
    };
    expect(stateOf('ne')).toBe('Nebraska');
    expect(stateOf(' new  york ')).toBe('New York');
    expect(stateOf('District of Columbia')).toBe('District of Columbia');
    expect(stateOf(' Ontario ')).toBe('Ontario');
  });

  it('reads Active as Yes, No, or blank in any case, and warns about No', () => {
    const activeOf = (active: string) => {
      const result = starterOne({ ...VALID, active });
      return result.ok ? result.fields.active : undefined;
    };
    expect(activeOf(' yes ')).toBe(true);
    expect(activeOf('NO')).toBe(false);
    expect(activeOf('')).toBeNull();
    expect(starterOne({ ...VALID, active: 'No' })).toMatchObject({
      warnings: [{ reason: 'inactive' }],
    });
  });

  it.each([
    'Y',
    'true',
    '1',
    'Inactive',
  ])('rejects the Active value %j', (active) => {
    expect(starterErrors(starterOne({ ...VALID, active }))).toEqual([
      'bad-active',
    ]);
  });

  it('reads a size with or without a dollar sign and thousands commas', () => {
    const sizeOf = (size: string) => {
      const result = starterOne({ ...VALID, size });
      return result.ok ? result.fields.size : undefined;
    };
    expect(sizeOf('1200')).toBe(1200);
    expect(sizeOf('$ 1,200')).toBe(1200);
    expect(sizeOf('0')).toBe(0);
    expect(sizeOf('2500000.75')).toBe(2500000.75);
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
    expect(starterErrors(starterOne({ ...VALID, size }))).toEqual(['bad-size']);
  });

  it('names Plant Name or Project Name when a row has neither', () => {
    expect(
      starterOne({ ...VALID, plantName: '', projectName: ' ' }),
    ).toMatchObject({
      ok: false,
      errors: [
        {
          reason: 'no-name',
          message: 'The row has no Plant Name or Project Name.',
        },
      ],
    });
    expect(
      starterOne({ ...VALID, projectName: '', plantName: 'Plant' }).ok,
    ).toBe(true);
  });

  it('words the category warning for the Project Type column', () => {
    expect(
      starterOne({ ...VALID, projectType: '', technologies: 'Geothermal' }),
    ).toMatchObject({
      warnings: [
        {
          reason: 'unknown-project-type',
          message:
            'Project Type is blank, and Technologies match no map category, so the row stays off the map.',
        },
      ],
    });
    expect(
      starterOne({ ...VALID, projectType: ' ', technologies: 'Solar PV' }),
    ).toMatchObject({ warnings: [] });
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
