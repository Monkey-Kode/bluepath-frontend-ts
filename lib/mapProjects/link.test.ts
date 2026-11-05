// @vitest-environment node
import type { Mutation } from '@sanity/client';
import { describe, expect, it } from 'vitest';

import { ChangeFailure, previewImport } from './apply';
import { BACKUP_TYPE, loadBackup } from './backups';
import { linkProject, listLinkOptions } from './link';
import { LOCK_ID, takeLock } from './lock';
import type { MapProjectsClient } from './store';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from './testing/fakeSanity';
import { type Cells, csv } from './testing/files';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const PERSON = 'Ada Editor';

const ref = (id: string) => ({ _type: 'reference', _ref: id });

/** A website-only project that the starter load gave a Website ID. */
const OLD_MILL: FakeDocument = {
  _id: '0b5e-old-mill',
  _type: 'casestudies',
  websiteId: '0b5e-old-mill',
  title: 'Old Mill',
  location: { _type: 'geopoint', lat: 42.64, lng: -71.31 },
  address: '1 Mill Rd',
  city: 'Lowell',
  state: 'Massachusetts',
  zip: '01852',
  county: 'Essex',
  entity: ['Municipal'],
  size: 500000,
  technologies: ['Solar'],
};

/** Another website-only project, so the list has an order to check. */
const ACORN: FakeDocument = {
  _id: '0f2d-acorn',
  _type: 'casestudies',
  websiteId: '0f2d-acorn',
  title: 'Acorn School',
  city: 'Salem',
  state: 'Oregon',
};

/** The plant that BlueIQ added for Old Mill. It has no County and no Entity Type. */
const ORCHARD: FakeDocument = {
  _id: 'plant-P-7',
  _type: 'casestudies',
  plantId: 'P-7',
  plantName: 'Orchard Solar',
  projectName: 'Old Mill Solar',
  projectId: 'PRJ-7',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: true,
  location: { _type: 'geopoint', lat: 42.65, lng: -71.32 },
  address: '9 Plant Rd',
  city: 'Billerica',
  state: 'Massachusetts',
  zip: '01821',
  financing: ['PPA'],
  size: 750000,
};

/** Orchard's row in a later file. */
const ORCHARD_ROW: Cells = {
  plantId: 'P-7',
  plantName: 'Orchard Solar',
  projectName: 'Old Mill Solar',
  projectId: 'PRJ-7',
  projectType: 'Solar',
  projectStatus: 'Operating',
  active: 'Yes',
  latitude: '42.65',
  longitude: '-71.32',
  address: '9 Plant Rd',
  city: 'Billerica',
  state: 'MA',
  zip: '01821',
  financing: 'PPA',
  size: '750000',
};

/** A plant that left BlueIQ's file. */
const RIVER: FakeDocument = {
  _id: 'plant-P-8',
  _type: 'casestudies',
  plantId: 'P-8',
  plantName: 'River Storage',
  hiddenAt: '2026-11-01T09:00:00.000Z',
};

/** A website project that the starter load merged with plant P-2. */
const NEWTON: FakeDocument = {
  _id: '0b5e-newton',
  _type: 'casestudies',
  websiteId: '0b5e-newton',
  plantId: 'P-2',
  plantName: 'Wells Solar',
};

/** A plant on the map with no website project. */
const LINCOLN: FakeDocument = {
  _id: 'plant-P-1',
  _type: 'casestudies',
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
};

const MILL_STORY: FakeDocument = {
  _id: 'story-mill',
  _type: 'caseStudy',
  title: 'Old Mill powers a town',
  project: ref(OLD_MILL._id),
};

const DOCUMENTS = [
  OLD_MILL,
  ACORN,
  ORCHARD,
  RIVER,
  NEWTON,
  LINCOLN,
  MILL_STORY,
];

const link = (sanity: FakeSanity, project: string, plant: string) =>
  linkProject(sanity, { project, plant, person: PERSON, now: NOW });

/** True for the transaction that patches Old Mill, which is the link. */
const patchesOldMill = (mutations: Mutation[]) =>
  mutations.some(
    (mutation) =>
      'patch' in mutation &&
      'id' in mutation.patch &&
      mutation.patch.id === OLD_MILL._id,
  );

describe('the link options (AC-4.15)', () => {
  it('offers website-only projects, and plants without a Website ID, each by name', async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...OLD_MILL, _id: 'drafts.0b5e-old-mill' },
      { ...ORCHARD, _id: 'drafts.plant-P-7' },
    ]);

    expect(await listLinkOptions(sanity)).toEqual({
      projects: [
        { id: '0f2d-acorn', name: 'Acorn School', location: 'Salem, Oregon' },
        {
          id: '0b5e-old-mill',
          name: 'Old Mill',
          location: 'Lowell, Massachusetts',
        },
      ],
      plants: [
        {
          id: 'plant-P-1',
          plantId: 'P-1',
          name: 'Lincoln Solar',
          hiddenAt: null,
        },
        {
          id: 'plant-P-7',
          plantId: 'P-7',
          name: 'Orchard Solar',
          hiddenAt: null,
        },
        {
          id: 'plant-P-8',
          plantId: 'P-8',
          name: 'River Storage',
          hiddenAt: '2026-11-01T09:00:00.000Z',
        },
      ],
    });
  });
});

describe('linking a website-only project to its plant (AC-4.15)', () => {
  it("gives the project the plant's Plant ID and BlueIQ's fields, and keeps its own record", async () => {
    const sanity = fakeSanity(DOCUMENTS);

    const result = await link(sanity, OLD_MILL._id, ORCHARD._id);

    expect(result).toEqual({
      status: 'linked',
      project: { id: '0b5e-old-mill', name: 'Old Mill' },
      plant: { id: 'plant-P-7', plantId: 'P-7', name: 'Orchard Solar' },
      backupId: expect.stringMatching(/^mapProjects\.backup\./),
      problems: [],
    });
    const { _rev, ...linked } = sanity.get(OLD_MILL._id) ?? {};
    expect(linked).toEqual({
      _id: '0b5e-old-mill',
      _type: 'casestudies',
      websiteId: '0b5e-old-mill',
      title: 'Old Mill',
      // BlueIQ's fields mirror the plant. Its blank County clears the project's.
      plantId: 'P-7',
      plantName: 'Orchard Solar',
      projectName: 'Old Mill Solar',
      projectId: 'PRJ-7',
      projectType: 'Solar',
      projectStatus: 'Operating',
      active: true,
      location: { _type: 'geopoint', lat: 42.65, lng: -71.32 },
      // The website's address stays (AC-8.6).
      address: '1 Mill Rd',
      city: 'Lowell',
      state: 'Massachusetts',
      zip: '01852',
      // The website's fields stay, and a blank one takes the plant's value.
      entity: ['Municipal'],
      financing: ['PPA'],
      size: 500000,
      technologies: ['Solar'],
    });
    expect(sanity.get(MILL_STORY._id)).toMatchObject({
      project: ref(OLD_MILL._id),
    });
  });

  it("deletes the plant's separate project with its drafts, in the same transaction as the link", async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...ORCHARD, _id: 'drafts.plant-P-7' },
      { ...ORCHARD, _id: 'versions.r1.plant-P-7' },
    ]);

    await link(sanity, OLD_MILL._id, ORCHARD._id);

    const all = sanity.documents().map(({ _id }) => _id);
    expect(all).not.toContain('plant-P-7');
    expect(all).not.toContain('drafts.plant-P-7');
    expect(all).not.toContain('versions.r1.plant-P-7');
    const written = sanity.transactions.find(({ mutations }) =>
      patchesOldMill(mutations),
    );
    expect(written?.mutations).toEqual(
      expect.arrayContaining([
        { delete: { id: 'drafts.plant-P-7' } },
        { delete: { id: 'versions.r1.plant-P-7' } },
        { delete: { id: 'plant-P-7' } },
      ]),
    );
  });

  it('saves a backup of every project before it writes', async () => {
    const sanity = fakeSanity(DOCUMENTS);

    const result = await link(sanity, OLD_MILL._id, ORCHARD._id);

    if (result.status !== 'linked' || !result.backupId) throw new Error();
    const saved = await loadBackup(sanity, result.backupId);
    expect(saved?.backup).toMatchObject({
      source: { kind: 'link' },
      person: PERSON,
      count: 6,
    });
    expect(saved?.projects).toContainEqual(expect.objectContaining(ORCHARD));
    const kinds = sanity.transactions.map(({ mutations }) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_TYPE,
      )
        ? 'backup'
        : patchesOldMill(mutations)
          ? 'link'
          : 'other',
    );
    expect(kinds.indexOf('backup')).toBeGreaterThan(-1);
    expect(kinds.indexOf('backup')).toBeLessThan(kinds.indexOf('link'));
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('lets a later file update the project like any merged project', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    await link(sanity, OLD_MILL._id, ORCHARD._id);

    const preview = await previewImport(sanity, {
      file: csv(ORCHARD_ROW),
      options: { hideMissing: false },
    });

    if (preview.status !== 'ready') throw new Error(preview.status);
    // The row's address differs and changes nothing. Its filled Size replaces the website's.
    expect(preview.plan.rows).toEqual([
      {
        action: 'update',
        row: 2,
        plantId: 'P-7',
        id: OLD_MILL._id,
        changes: { size: 750000 },
        returns: false,
        warnings: [],
      },
    ]);
  });

  it("hides the project when the plant is hidden, from the plant's date", async () => {
    const sanity = fakeSanity(DOCUMENTS);

    await link(sanity, OLD_MILL._id, RIVER._id);

    expect(sanity.get(OLD_MILL._id)).toMatchObject({
      plantId: 'P-8',
      hiddenAt: RIVER.hiddenAt,
    });
  });

  it('shows a hidden website project again when its plant is shown', async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS.filter(({ _id }) => _id !== OLD_MILL._id),
      { ...OLD_MILL, hiddenAt: '2026-10-01T09:00:00.000Z' },
    ]);

    await link(sanity, OLD_MILL._id, ORCHARD._id);

    expect(sanity.get(OLD_MILL._id)).not.toHaveProperty('hiddenAt');
  });
});

describe('a link that stops (AC-4.15)', () => {
  it("names the case studies that link to the plant's separate project, and changes nothing", async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      {
        _id: 'drafts.story-orchard',
        _type: 'caseStudy',
        title: 'Orchard Solar breaks ground',
        project: ref(ORCHARD._id),
      },
    ]);
    const before = sanity.documents();

    const result = await link(sanity, OLD_MILL._id, ORCHARD._id);

    expect(result).toEqual({
      status: 'refused',
      reason: 'case-studies',
      plant: { id: 'plant-P-7', plantId: 'P-7', name: 'Orchard Solar' },
      caseStudies: [
        {
          id: 'story-orchard',
          title: 'Orchard Solar breaks ground',
          published: false,
        },
      ],
    });
    expect(sanity.documents()).toEqual(before);
  });

  it.each([
    ['a plant as the project', LINCOLN._id, ORCHARD._id, 'project'],
    ['a merged project as the project', NEWTON._id, ORCHARD._id, 'project'],
    ['a missing project', '0b5e-gone', ORCHARD._id, 'project'],
    ['a website-only project as the plant', OLD_MILL._id, ACORN._id, 'plant'],
    ['a merged project as the plant', OLD_MILL._id, NEWTON._id, 'plant'],
    ['a missing plant', OLD_MILL._id, 'plant-P-404', 'plant'],
    ["a plant's draft", OLD_MILL._id, 'drafts.plant-P-7', 'plant'],
  ])('refuses %s, and changes nothing', async (_, project, plant, reason) => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...ORCHARD, _id: 'drafts.plant-P-7' },
    ]);
    const before = sanity.documents();

    expect(await link(sanity, project, plant)).toEqual({
      status: 'refused',
      reason,
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('replies busy while another change holds the lock (AC-4.11)', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    await takeLock(sanity, new Date(NOW.getTime() - 60_000));

    expect(await link(sanity, OLD_MILL._id, ORCHARD._id)).toEqual({
      status: 'busy',
    });
    expect(sanity.get(ORCHARD._id)).toBeDefined();
  });

  it('changes nothing when the backup fails (AC-7.1)', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_TYPE,
      ),
    );
    const before = sanity.documents().filter(({ _id }) => _id !== LOCK_ID);

    const error = await link(sanity, OLD_MILL._id, ORCHARD._id).catch(
      (caught) => caught,
    );

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({ stage: 'backup' });
    expect(sanity.documents()).toEqual(before);
  });

  it('keeps both projects when the website project changes after the read', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    let edited = false;
    // Someone publishes the project while the link checks for case studies.
    const client: MapProjectsClient = {
      mutate: (mutations, options) => sanity.mutate(mutations, options),
      async fetch<R>(
        query: string,
        params?: Record<string, unknown>,
        options?: { perspective?: 'raw' },
      ) {
        if (!edited && options?.perspective === 'raw') {
          edited = true;
          await sanity.mutate([
            { patch: { id: OLD_MILL._id, set: { title: 'Old Mill Works' } } },
          ]);
        }
        return sanity.fetch<R>(query, params, options);
      },
    };

    const error = await linkProject(client, {
      project: OLD_MILL._id,
      plant: ORCHARD._id,
      person: PERSON,
      now: NOW,
    }).catch((caught) => caught);

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({ stage: 'write' });
    expect(sanity.get(OLD_MILL._id)).toMatchObject({ title: 'Old Mill Works' });
    expect(sanity.get(OLD_MILL._id)).not.toHaveProperty('plantId');
    expect(sanity.get(ORCHARD._id)).toBeDefined();
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });
});
