import { describe, expect, it } from 'vitest';
import { parseCsv } from './parseCsv';
import {
  type CurrentProject,
  type ImportPlan,
  planImport,
  planStarterLoad,
  type RowPlan,
} from './plan';
import { type Cells, csv, starterCsv } from './testing/files';
import { validateRows, validateStarterRows } from './validate';

function planFor(
  projects: readonly CurrentProject[],
  file: Uint8Array,
  hideMissing = true,
) {
  const parsed = parseCsv(file);
  if (!parsed.ok) throw new Error(parsed.message);
  return planImport({
    projects,
    file,
    rows: validateRows(parsed.rows),
    options: { hideMissing },
  });
}

function rowAt(result: ImportPlan, row: number): RowPlan {
  const found = result.rows.find((planned) => planned.row === row);
  if (!found) throw new Error(`No row ${row}.`);
  return found;
}

function changesAt(result: ImportPlan, row: number) {
  const planned = rowAt(result, row);
  if (planned.action !== 'update') {
    throw new Error(`Row ${row} is ${planned.action}.`);
  }
  return planned.changes;
}

const HIDDEN_AT = '2026-11-04T06:00:00.000Z';

/**
 * Writes a plan into the projects as an apply would. Each written project gets a new revision.
 * A cleared field reads as undefined, as Sanity's unset leaves it.
 */
function applyPlan(
  projects: readonly CurrentProject[],
  result: ImportPlan,
): CurrentProject[] {
  const next = new Map(
    projects.map((project) => [project._id, { ...project }]),
  );
  const write = (
    id: string,
    change: (fields: Record<string, unknown>) => void,
  ) => {
    const project = next.get(id);
    if (!project) throw new Error(`No project ${id}.`);
    change(project as unknown as Record<string, unknown>);
    project._rev = `${project._rev}+`;
  };
  for (const row of result.rows) {
    if (row.action === 'create') {
      const fields = Object.fromEntries(
        Object.entries(row.fields).filter(([, value]) => value !== null),
      );
      next.set(row.id, { _id: row.id, _rev: 'rev-new', ...fields });
    } else if (row.action === 'update') {
      write(row.id, (fields) => {
        for (const [field, value] of Object.entries(row.changes)) {
          fields[field] = value ?? undefined;
        }
        if (row.returns) fields.hiddenAt = undefined;
      });
    }
  }
  for (const { id } of result.hides) {
    write(id, (fields) => {
      fields.hiddenAt = HIDDEN_AT;
    });
  }
  return [...next.values()];
}

/** A plant project that an earlier file created. */
const LINCOLN: CurrentProject = {
  _id: 'plant-P-1',
  _rev: 'rev-lincoln',
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
  projectName: 'Lincoln Schools',
  projectId: 'J-1',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: true,
  location: { lat: 40.8, lng: -96.7 },
  address: '1 Main St',
  city: 'Lincoln',
  state: 'Nebraska',
  zip: '68508',
  county: 'Lancaster',
  entity: ['Municipal'],
  financing: ['PPA'],
  size: 1200000,
  technologies: ['Solar PV'],
};

/** The row that matches LINCOLN exactly. */
const LINCOLN_ROW: Cells = {
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
  projectName: 'Lincoln Schools',
  projectId: 'J-1',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: 'Yes',
  latitude: '40.8',
  longitude: '-96.7',
  address: '1 Main St',
  city: 'Lincoln',
  state: 'NE',
  zip: '68508',
  county: 'Lancaster',
  entity: 'Municipal',
  financing: 'PPA',
  size: '$1,200,000',
  technologies: 'Solar PV',
};

/** A website project that the starter load merged with plant P-2. */
const NEWTON: CurrentProject = {
  _id: '0b5e-newton',
  _rev: 'rev-newton',
  websiteId: '0b5e-newton',
  plantId: 'P-2',
  plantName: 'Wells Solar',
  projectName: '111 Wells',
  projectType: 'Solar + BESS',
  location: { lat: 42.33, lng: -71.2 },
  address: '111 Wells Ave',
  city: 'Newton',
  state: 'Massachusetts',
  zip: '02459',
  entity: ['Commercial'],
  technologies: ['Solar PV', 'Battery Storage'],
};

/** BlueIQ's row for NEWTON. Its address differs from the website's. */
const NEWTON_ROW: Cells = {
  plantId: 'P-2',
  plantName: 'Wells Solar',
  projectName: '111 Wells',
  projectType: 'Solar + BESS',
  latitude: '42.33',
  longitude: '-71.2',
  address: '9 Plant Rd',
  city: 'Waltham',
  state: 'MA',
  zip: '02451',
};

/** A website-only project. It has no Plant ID. */
const LIBRARY: CurrentProject = {
  _id: '7c1d-library',
  _rev: 'rev-library',
  websiteId: '7c1d-library',
  title: 'Old Library',
  projectName: 'Old Library',
  projectType: 'Energy Efficiency',
  location: { lat: 41.2, lng: -95.9 },
  entity: ['Municipal'],
};

/** A plant that left an earlier file. */
const OMAHA: CurrentProject = {
  _id: 'plant-P-3',
  _rev: 'rev-omaha',
  plantId: 'P-3',
  plantName: 'Omaha Storage',
  projectType: 'BESS',
  location: { lat: 41.25, lng: -96 },
  entity: ['K-12'],
  hiddenAt: '2026-10-01T06:00:00.000Z',
};

const OMAHA_ROW: Cells = {
  plantId: 'P-3',
  plantName: 'Omaha Storage',
  projectType: 'BESS',
  latitude: '41.25',
  longitude: '-96',
};

const plantProject = (
  n: number,
  fields: Partial<CurrentProject> = {},
): CurrentProject => ({
  _id: `plant-P-${n}`,
  _rev: `rev-${n}`,
  plantId: `P-${n}`,
  plantName: `Plant ${n}`,
  projectType: 'Solar',
  ...fields,
});

const plantRow = (n: number, cells: Cells = {}): Cells => ({
  plantId: `P-${n}`,
  plantName: `Plant ${n}`,
  projectType: 'Solar',
  ...cells,
});

describe('planImport rows (AC-4.4)', () => {
  it('creates a project for a new Plant ID under its own document ID (D-23)', () => {
    const result = planFor(
      [LINCOLN],
      csv(LINCOLN_ROW, {
        plantId: 'P-9',
        projectName: 'Kearney Schools',
        projectType: 'Wind',
        state: 'ne',
        entity: 'K-12',
      }),
    );

    expect(rowAt(result, 3)).toEqual({
      action: 'create',
      row: 3,
      plantId: 'P-9',
      id: 'plant-P-9',
      fields: {
        plantId: 'P-9',
        plantName: null,
        projectId: null,
        projectName: 'Kearney Schools',
        projectType: 'Wind',
        projectStatus: null,
        active: null,
        location: null,
        address: null,
        city: null,
        state: 'Nebraska',
        zip: null,
        county: null,
        entity: ['K-12'],
        financing: null,
        size: null,
        technologies: null,
      },
      warnings: [
        expect.objectContaining({ reason: 'no-coordinates' }),
        expect.objectContaining({ reason: 'unknown-project-type' }),
      ],
    });
  });

  it('marks a row that matches its project as unchanged, reading a state code as its name', () => {
    const result = planFor([LINCOLN], csv(LINCOLN_ROW));
    expect(result.rows).toEqual([
      {
        action: 'unchanged',
        row: 2,
        plantId: 'P-1',
        id: 'plant-P-1',
        warnings: [],
      },
    ]);
  });

  it('reads a missing, null, or empty stored value as a blank cell', () => {
    const project = plantProject(10, {
      projectId: null,
      projectStatus: '',
      active: undefined,
      location: null,
      county: '',
    });
    expect(rowAt(planFor([project], csv(plantRow(10))), 2).action).toBe(
      'unchanged',
    );
  });

  it('reads a stored geopoint and a stored state code the way it reads the cells', () => {
    // Sanity returns a geopoint with its type and altitude.
    const geopoint = { _type: 'geopoint', lat: 40.8, lng: -96.7, alt: 350 };
    const project = plantProject(10, { location: geopoint, state: 'ne' });
    const row = plantRow(10, {
      latitude: '40.8',
      longitude: '-96.7',
      state: 'Nebraska',
    });
    expect(rowAt(planFor([project], csv(row)), 2).action).toBe('unchanged');
  });

  it('updates the project with the same Plant ID and names each changed field in column order', () => {
    const result = planFor(
      [LINCOLN],
      csv({
        ...LINCOLN_ROW,
        size: '1500000',
        city: 'Lincoln City',
        latitude: '40.9',
        projectStatus: 'Retired',
      }),
    );

    expect(rowAt(result, 2)).toMatchObject({
      action: 'update',
      plantId: 'P-1',
      id: 'plant-P-1',
      returns: false,
    });
    const changes = changesAt(result, 2);
    expect(changes).toEqual({
      projectStatus: 'Retired',
      location: { lat: 40.9, lng: -96.7 },
      city: 'Lincoln City',
      size: 1500000,
    });
    expect(Object.keys(changes)).toEqual([
      'projectStatus',
      'location',
      'city',
      'size',
    ]);
  });

  it('clears a BlueIQ field when its cell is blank (D-22)', () => {
    const result = planFor(
      [LINCOLN],
      csv({
        ...LINCOLN_ROW,
        projectName: '',
        projectId: ' ',
        projectType: '',
        technologies: 'Solar PV',
        projectStatus: '',
        active: '',
        latitude: '',
        longitude: '',
        address: '',
        city: '',
        state: '',
        zip: '',
        county: '',
      }),
    );

    expect(changesAt(result, 2)).toEqual({
      projectId: null,
      projectName: null,
      projectType: null,
      projectStatus: null,
      active: null,
      location: null,
      address: null,
      city: null,
      state: null,
      zip: null,
      county: null,
    });
  });

  it('keeps a website field on a blank cell and replaces it on a filled one', () => {
    const blanks = planFor(
      [LINCOLN],
      csv({
        ...LINCOLN_ROW,
        entity: '',
        financing: ' ; ',
        size: '',
        technologies: '',
      }),
    );
    expect(rowAt(blanks, 2).action).toBe('unchanged');

    const filled = planFor(
      [LINCOLN],
      csv({
        ...LINCOLN_ROW,
        entity: 'K-12; Municipal',
        financing: 'PPA',
        size: '0',
        technologies: 'Battery Storage; Solar PV',
      }),
    );
    expect(changesAt(filled, 2)).toEqual({
      entity: ['K-12', 'Municipal'],
      size: 0,
      technologies: ['Battery Storage', 'Solar PV'],
    });
  });

  it('changes address parts only on projects without a Website ID (AC-8.6)', () => {
    const result = planFor(
      [LINCOLN, NEWTON],
      csv(
        { ...LINCOLN_ROW, address: '2 Oak St', city: 'Omaha', state: 'IA' },
        { ...NEWTON_ROW, zip: '' },
      ),
    );
    expect(changesAt(result, 2)).toEqual({
      address: '2 Oak St',
      city: 'Omaha',
      state: 'Iowa',
    });
    expect(rowAt(result, 3).action).toBe('unchanged');

    const renamed = planFor(
      [NEWTON],
      csv({ ...NEWTON_ROW, plantName: 'Wells Solar II', address: '' }),
    );
    expect(changesAt(renamed, 2)).toEqual({ plantName: 'Wells Solar II' });
  });

  it('skips an error row and leaves its project as it was (D-24)', () => {
    const result = planFor(
      [LINCOLN, NEWTON],
      csv({ ...LINCOLN_ROW, latitude: 'north' }, NEWTON_ROW),
    );

    expect(rowAt(result, 2)).toEqual({
      action: 'error',
      row: 2,
      plantId: 'P-1',
      errors: [
        { reason: 'bad-coordinates', message: 'Latitude is not a number.' },
      ],
    });
    expect(result.hides).toEqual([]);
  });
});

describe('planImport hiding and returning (AC-4.5, FR-013)', () => {
  it('hides a plant missing from the file, but never a website-only project', () => {
    const result = planFor([LINCOLN, NEWTON, LIBRARY, OMAHA], csv(NEWTON_ROW));
    expect(result.hides).toEqual([
      { id: 'plant-P-1', plantId: 'P-1', name: 'Lincoln Solar' },
    ]);
    expect(result.returns).toEqual([]);
  });

  it('hides nothing when hiding is off', () => {
    const result = planFor([LINCOLN, NEWTON], csv(NEWTON_ROW), false);
    expect(result.hides).toEqual([]);
    expect(result.rejection).toBeNull();
  });

  it('never counts a plant as missing when its row has an error', () => {
    const result = planFor(
      [LINCOLN, NEWTON],
      csv({ ...LINCOLN_ROW, active: 'maybe' }, NEWTON_ROW),
    );
    expect(rowAt(result, 2).action).toBe('error');
    expect(result.hides).toEqual([]);
  });

  it('shows a returning plant again with its website fields intact', () => {
    const projects = [LINCOLN, NEWTON];
    const hidden = applyPlan(projects, planFor(projects, csv(NEWTON_ROW)));
    expect(hidden.find(({ _id }) => _id === 'plant-P-1')).toMatchObject({
      hiddenAt: HIDDEN_AT,
      entity: ['Municipal'],
    });

    const back = planFor(
      hidden,
      csv({ ...LINCOLN_ROW, entity: '' }, NEWTON_ROW),
    );
    expect(rowAt(back, 2)).toMatchObject({
      action: 'update',
      changes: {},
      returns: true,
    });
    expect(back.returns).toEqual([
      { id: 'plant-P-1', plantId: 'P-1', name: 'Lincoln Solar' },
    ]);

    const shown = applyPlan(hidden, back);
    expect(shown.map(({ _id }) => _id)).toEqual(['plant-P-1', '0b5e-newton']);
    const lincoln = shown.find(({ _id }) => _id === 'plant-P-1');
    expect(lincoln?.hiddenAt).toBeUndefined();
    expect(lincoln?.entity).toEqual(['Municipal']);
  });

  it('keeps a hidden plant hidden when its row has an error', () => {
    const result = planFor(
      [OMAHA, NEWTON],
      csv({ ...OMAHA_ROW, size: 'lots' }, NEWTON_ROW),
    );
    expect(rowAt(result, 2).action).toBe('error');
    expect(result.returns).toEqual([]);
  });
});

describe('planImport half rule (AC-4.10, D-25)', () => {
  const projects = [
    ...[11, 12, 13, 14, 15].map((n) => plantProject(n)),
    plantProject(16, { hiddenAt: HIDDEN_AT }),
    LIBRARY,
  ];

  it('rejects a file that lists fewer than half of the shown BlueIQ plants while hiding is on', () => {
    const result = planFor(
      projects,
      csv(plantRow(11), plantRow(12), plantRow(16)),
    );
    expect(result.rejection).toEqual({
      reason: 'half-rule',
      message:
        "The file lists 2 of the site's 5 BlueIQ plants. A file that hides missing plants must list at least half of them.",
    });
    expect(result.hides.map(({ plantId }) => plantId)).toEqual([
      'P-13',
      'P-14',
      'P-15',
    ]);

    expect(
      planFor(projects, csv(plantRow(1), plantRow(2), plantRow(3))).rejection,
    ).toMatchObject({ reason: 'half-rule' });
  });

  it('accepts a file that lists half of them, counting error rows as listed', () => {
    const result = planFor(
      projects,
      csv(plantRow(11), plantRow(12), plantRow(13, { latitude: '99' })),
    );
    expect(result.rejection).toBeNull();
    expect(result.hides.map(({ plantId }) => plantId)).toEqual([
      'P-14',
      'P-15',
    ]);
  });

  it('accepts a partial file with hiding off', () => {
    expect(planFor(projects, csv(plantRow(11)), false).rejection).toBeNull();
  });

  it('accepts any file while the site has no shown BlueIQ plants', () => {
    expect(planFor([LIBRARY], csv(plantRow(1))).rejection).toBeNull();
  });
});

describe('planImport rejections (AC-4.9)', () => {
  it('rejects a file with no rows free of errors', () => {
    const noName = planFor(
      [LINCOLN],
      csv({ ...LINCOLN_ROW, plantName: '', projectName: '' }),
    );
    expect(noName.rejection).toEqual({
      reason: 'no-valid-rows',
      message: 'Every row in the file has an error, so nothing changes.',
    });
    expect(planFor([], csv()).rejection).toMatchObject({
      reason: 'no-valid-rows',
    });
  });
});

describe('planImport conflicts', () => {
  it('skips a row whose Plant ID more than one project has', () => {
    const twin = { ...LINCOLN, _id: 'f00d-twin', websiteId: 'f00d-twin' };
    const result = planFor(
      [LINCOLN, twin, NEWTON],
      csv(LINCOLN_ROW, NEWTON_ROW),
    );

    expect(rowAt(result, 2)).toEqual({
      action: 'error',
      row: 2,
      plantId: 'P-1',
      errors: [
        {
          reason: 'plant-id-conflict',
          message:
            'More than one map project has this Plant ID, so the row updates none of them.',
        },
      ],
    });
    expect(result.hides).toEqual([]);
  });

  it('skips a new plant whose document ID another project already uses', () => {
    const squatter: CurrentProject = {
      ...LIBRARY,
      _id: 'plant-P-9',
      websiteId: 'plant-P-9',
    };
    const result = planFor([squatter], csv(plantRow(9)));
    expect(rowAt(result, 2)).toMatchObject({
      action: 'error',
      errors: [
        {
          reason: 'plant-id-conflict',
          message:
            "Another map project already uses this Plant ID's document ID.",
        },
      ],
    });
    expect(result.rejection).toMatchObject({ reason: 'no-valid-rows' });
  });
});

describe('planImport summary (AC-4.4)', () => {
  it('counts each outcome and says whether anything would be written', () => {
    const result = planFor(
      [LINCOLN, NEWTON, LIBRARY, OMAHA, plantProject(20), plantProject(21)],
      csv(
        LINCOLN_ROW,
        { ...NEWTON_ROW, projectStatus: 'Operating' },
        OMAHA_ROW,
        plantRow(9),
        plantRow(20, { active: 'later' }),
      ),
    );

    expect(result.rows.map(({ row, action }) => [row, action])).toEqual([
      [2, 'unchanged'],
      [3, 'update'],
      [4, 'update'],
      [5, 'create'],
      [6, 'error'],
    ]);
    expect(result.counts).toEqual({
      created: 1,
      updated: 2,
      unchanged: 1,
      skipped: 1,
      hidden: 1,
      returned: 1,
    });
    expect(result.writes).toBe(true);
    expect(result.rejection).toBeNull();
  });

  it('writes nothing for a file that changes nothing', () => {
    const result = planFor([LINCOLN], csv(LINCOLN_ROW));
    expect(result.counts).toEqual({
      created: 0,
      updated: 0,
      unchanged: 1,
      skipped: 0,
      hidden: 0,
      returned: 0,
    });
    expect(result.writes).toBe(false);
  });

  it('writes when the file only hides plants', () => {
    const result = planFor([LINCOLN, plantProject(20)], csv(LINCOLN_ROW));
    expect(result.counts).toMatchObject({ unchanged: 1, hidden: 1 });
    expect(result.rejection).toBeNull();
    expect(result.writes).toBe(true);
  });
});

describe('planImport preview token (AC-4.4)', () => {
  const projects = [LINCOLN, NEWTON, OMAHA];
  const file = csv(LINCOLN_ROW, NEWTON_ROW);
  const tokenOf = (
    current: readonly CurrentProject[],
    bytes = file,
    hideMissing = true,
  ) => planFor(current, bytes, hideMissing).token;

  it('gives the same file, options, and revisions the same token in any order', () => {
    const token = tokenOf(projects);
    expect(token).toMatch(/^[0-9a-f]{64}$/);
    expect(tokenOf([...projects].reverse())).toBe(token);
  });

  it('changes the token when the file, an option, or any project changes', () => {
    const token = tokenOf(projects);
    expect(tokenOf(projects, csv(LINCOLN_ROW, NEWTON_ROW, OMAHA_ROW))).not.toBe(
      token,
    );
    expect(tokenOf(projects, file, false)).not.toBe(token);
    expect(
      tokenOf([LINCOLN, NEWTON, { ...OMAHA, _rev: 'rev-omaha+' }]),
    ).not.toBe(token);
    expect(tokenOf([...projects, LIBRARY])).not.toBe(token);
    expect(tokenOf([LINCOLN, NEWTON])).not.toBe(token);
  });
});

describe('planImport idempotence (AC-4.6)', () => {
  const fixtures: [string, CurrentProject[], Uint8Array][] = [
    [
      'a file that creates, updates, hides, returns, and skips',
      [LINCOLN, NEWTON, LIBRARY, OMAHA, plantProject(20), plantProject(21)],
      csv(
        { ...LINCOLN_ROW, city: 'Lincoln City', entity: '', size: '1500000' },
        { ...NEWTON_ROW, projectId: 'J-2', active: 'No', zip: '' },
        OMAHA_ROW,
        plantRow(9, {
          latitude: '41',
          longitude: '-97',
          entity: 'K-12; Municipal',
        }),
        plantRow(20, { active: 'later' }),
      ),
    ],
    [
      'a file that clears every BlueIQ field it can',
      [LINCOLN, NEWTON],
      csv(
        { plantId: 'P-1', plantName: 'Lincoln Solar' },
        { plantId: 'P-2', projectName: '111 Wells' },
      ),
    ],
    [
      'a first file on a site with only website projects',
      [LIBRARY],
      csv(
        plantRow(1, { state: 'ne', technologies: 'Solar PV' }),
        plantRow(2, { latitude: '40', longitude: '-100', size: '$2,500' }),
      ),
    ],
  ];

  it.each(
    fixtures,
  )('plans a second run of %s as all unchanged', (_, projects, file) => {
    const first = planFor(projects, file);
    expect(first.writes).toBe(true);

    const second = planFor(applyPlan(projects, first), file);
    expect(second.rows.filter(({ action }) => action !== 'error')).toEqual(
      first.rows
        .filter(({ action }) => action !== 'error')
        .map((row) =>
          expect.objectContaining({ row: row.row, action: 'unchanged' }),
        ),
    );
    expect(second.hides).toEqual([]);
    expect(second.returns).toEqual([]);
    expect(second.writes).toBe(false);
  });
});

function starterPlanFor(projects: readonly CurrentProject[], file: Uint8Array) {
  const parsed = parseCsv(file, { starter: true });
  if (!parsed.ok) throw new Error(parsed.message);
  return planStarterLoad({
    projects,
    file,
    rows: validateStarterRows(parsed.rows),
  });
}

describe('planStarterLoad (AC-8.7)', () => {
  /** Website projects before the load. None has a Plant ID or a Website ID yet. */
  const WELLS: CurrentProject = {
    _id: '0b5e-newton',
    _rev: 'rev-newton',
    title: '111 Wells',
    projectName: '111 Wells',
    location: { lat: 42.33, lng: -71.2 },
    address: '111 Wells Ave',
    city: 'Newton',
    state: 'MA',
    zip: '02459',
    entity: ['Commercial'],
    financing: ['PPA'],
    technologies: ['Solar PV'],
  };
  const OLD_LIBRARY: CurrentProject = {
    _id: '7c1d-library',
    _rev: 'rev-library',
    title: 'Old Library',
    projectName: 'Old Library',
    location: { lat: 41.2, lng: -95.9 },
    entity: ['Municipal'],
    technologies: ['LED Lighting'],
  };
  const GONE: CurrentProject = {
    _id: '9f2a-gone',
    _rev: 'rev-gone',
    title: 'Gone Project',
    location: { lat: 40, lng: -100 },
  };

  /** A merged row: BlueIQ's plant P-2 with the website's address and fields. */
  const WELLS_ROW: Cells = {
    ...NEWTON_ROW,
    websiteId: '0b5e-newton',
    address: '111 Wells Ave',
    city: 'Newton',
    zip: '02459',
    entity: 'Commercial',
    technologies: 'Solar PV; Battery Storage',
  };
  const LIBRARY_ROW: Cells = {
    websiteId: '7c1d-library',
    projectName: 'Old Library',
    latitude: '41.2',
    longitude: '-95.9',
    entity: 'Municipal',
    technologies: 'LED Lighting',
  };
  const PROJECTS = [WELLS, OLD_LIBRARY, GONE];
  const WORKBOOK = starterCsv(WELLS_ROW, LIBRARY_ROW, plantRow(9));

  it('updates a website project from its row and writes every column', () => {
    expect(rowAt(starterPlanFor(PROJECTS, WORKBOOK), 2)).toEqual({
      action: 'update',
      row: 2,
      plantId: 'P-2',
      id: '0b5e-newton',
      changes: {
        plantId: 'P-2',
        plantName: 'Wells Solar',
        projectType: 'Solar + BESS',
        // A blank cell clears a website field, unlike an import.
        financing: null,
        technologies: ['Solar PV', 'Battery Storage'],
        websiteId: '0b5e-newton',
      },
      returns: false,
      warnings: [],
    });
  });

  it('writes the website address of a row over the stored one', () => {
    const result = starterPlanFor(
      PROJECTS,
      starterCsv(
        { ...WELLS_ROW, address: '9 Plant Rd', city: '' },
        LIBRARY_ROW,
      ),
    );
    expect(changesAt(result, 2)).toMatchObject({
      address: '9 Plant Rd',
      city: null,
    });
  });

  it('gives a website-only project its Website ID and no Plant ID', () => {
    expect(rowAt(starterPlanFor(PROJECTS, WORKBOOK), 3)).toEqual({
      action: 'update',
      row: 3,
      plantId: null,
      id: '7c1d-library',
      changes: { websiteId: '7c1d-library' },
      returns: false,
      warnings: [],
    });
  });

  it('creates a project for a row without a Website ID', () => {
    expect(rowAt(starterPlanFor(PROJECTS, WORKBOOK), 4)).toMatchObject({
      action: 'create',
      plantId: 'P-9',
      id: 'plant-P-9',
      fields: { plantId: 'P-9', plantName: 'Plant 9', projectType: 'Solar' },
    });
  });

  it('hides each shown website project that the workbook lacks (AC-4.5)', () => {
    const hidden = { ...GONE, _id: 'aa11-hidden', hiddenAt: HIDDEN_AT };
    const result = starterPlanFor([...PROJECTS, hidden], WORKBOOK);

    expect(result.hides).toEqual([
      { id: '9f2a-gone', plantId: null, name: 'Gone Project' },
    ]);
    expect(result.counts).toEqual({
      created: 1,
      updated: 2,
      unchanged: 0,
      skipped: 0,
      hidden: 1,
      returned: 0,
    });
    expect(result.rejection).toBeNull();
    expect(result.writes).toBe(true);
  });

  it('applies no half rule, because the workbook replaces the website list', () => {
    const many = [11, 12, 13, 14].map((n) => ({
      ...GONE,
      _id: `gone-${n}`,
      title: `Gone ${n}`,
    }));
    const result = starterPlanFor([WELLS, ...many], starterCsv(WELLS_ROW));
    expect(result.counts.hidden).toBe(4);
    expect(result.rejection).toBeNull();
  });

  it('shows a hidden website project that the workbook lists', () => {
    const result = starterPlanFor(
      [{ ...OLD_LIBRARY, hiddenAt: HIDDEN_AT }],
      starterCsv(LIBRARY_ROW),
    );
    expect(rowAt(result, 2)).toMatchObject({ action: 'update', returns: true });
    expect(result.returns).toEqual([
      { id: '7c1d-library', plantId: null, name: 'Old Library' },
    ]);
  });

  it('skips a row whose Website ID matches no map project', () => {
    const result = starterPlanFor(
      PROJECTS,
      starterCsv(WELLS_ROW, { ...LIBRARY_ROW, websiteId: 'nope' }),
    );
    expect(rowAt(result, 3)).toEqual({
      action: 'error',
      row: 3,
      plantId: null,
      errors: [
        {
          reason: 'unknown-website-id',
          message: 'No map project has this Website ID.',
        },
      ],
    });
  });

  it('never hides the project of an error row', () => {
    const result = starterPlanFor(
      PROJECTS,
      starterCsv(WELLS_ROW, { ...LIBRARY_ROW, size: 'lots' }),
    );
    expect(rowAt(result, 3).action).toBe('error');
    expect(result.hides.map(({ id }) => id)).toEqual(['9f2a-gone']);
  });

  it('skips a new plant whose document ID another project already uses', () => {
    const squatter = { ...GONE, _id: 'plant-P-9' };
    const result = starterPlanFor(
      [WELLS, squatter],
      starterCsv(WELLS_ROW, plantRow(9)),
    );
    expect(rowAt(result, 3)).toMatchObject({
      action: 'error',
      errors: [{ reason: 'plant-id-conflict' }],
    });
  });

  it('rejects a workbook with no rows free of errors', () => {
    const result = starterPlanFor(
      PROJECTS,
      starterCsv({ ...LIBRARY_ROW, websiteId: 'nope' }),
    );
    expect(result.rejection).toMatchObject({ reason: 'no-valid-rows' });
  });

  it('gives a token that no import of the same file can use', () => {
    const plan = starterPlanFor(PROJECTS, WORKBOOK);
    const imported = planImport({
      projects: PROJECTS,
      file: WORKBOOK,
      rows: [],
      options: { hideMissing: true },
    });

    expect(plan.token).toMatch(/^[0-9a-f]{64}$/);
    expect(plan.token).not.toBe(imported.token);
    expect(
      starterPlanFor(
        [WELLS, OLD_LIBRARY, { ...GONE, _rev: 'rev-gone+' }],
        WORKBOOK,
      ).token,
    ).not.toBe(plan.token);
  });

  it('plans a second run of the same workbook as all unchanged', () => {
    const first = starterPlanFor(PROJECTS, WORKBOOK);
    const second = starterPlanFor(applyPlan(PROJECTS, first), WORKBOOK);

    expect(second.rows.map(({ action }) => action)).toEqual([
      'unchanged',
      'unchanged',
      'unchanged',
    ]);
    expect(second.hides).toEqual([]);
    expect(second.writes).toBe(false);
  });

  it('leaves projects that a later import treats as merged and plants', () => {
    const loaded = applyPlan(PROJECTS, starterPlanFor(PROJECTS, WORKBOOK));
    const result = planFor(loaded, csv(NEWTON_ROW, plantRow(9)));

    // BlueIQ's own address differs, and the merged project keeps the website's (AC-8.6).
    expect(rowAt(result, 2)).toMatchObject({ action: 'unchanged' });
    expect(rowAt(result, 3)).toMatchObject({ action: 'unchanged' });
    expect(result.hides).toEqual([]);
  });
});
