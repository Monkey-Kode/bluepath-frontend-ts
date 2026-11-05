// @vitest-environment node
import type { Mutation } from '@sanity/client';
import { describe, expect, it } from 'vitest';

import { ChangeFailure } from './apply';
import { BACKUP_TYPE, loadBackup } from './backups';
import { LOCK_ID, takeLock } from './lock';
import { listHidden, removeHidden } from './remove';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from './testing/fakeSanity';

const NOW = new Date('2026-11-04T12:00:00.000Z');
const PERSON = 'Ada Editor';

const project = (
  fields: { _id: string } & Record<string, unknown>,
): FakeDocument => ({
  _type: 'casestudies',
  ...fields,
});

const ref = (id: string) => ({ _type: 'reference', _ref: id });

/** A plant that left BlueIQ's file. No case study links to it. */
const ORCHARD = project({
  _id: 'plant-P-7',
  plantId: 'P-7',
  plantName: 'Orchard Solar',
  hiddenAt: '2026-11-03T09:00:00.000Z',
});

/** A hidden plant with a blank Plant Name, so its Project Name names it. */
const MILL = project({
  _id: 'plant-P-8',
  plantId: 'P-8',
  plantName: '',
  projectName: 'Mill Street',
  hiddenAt: '2026-11-01T09:00:00.000Z',
});

/** A hidden plant that a published case study and its draft link to. */
const HARBOR = project({
  _id: 'plant-P-9',
  plantId: 'P-9',
  plantName: 'Harbor Storage',
  hiddenAt: '2026-11-02T09:00:00.000Z',
});

/** A hidden plant that only a draft case study links to. */
const RIDGE = project({
  _id: 'plant-P-10',
  plantId: 'P-10',
  plantName: 'Ridge Wind',
  hiddenAt: '2026-10-30T09:00:00.000Z',
});

/** A plant on the map. */
const LINCOLN = project({
  _id: 'plant-P-1',
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
});

/** A website-only project. It has no Plant ID, so it never hides. */
const OLD_MILL = project({
  _id: '0b5e-old-mill',
  websiteId: '0b5e-old-mill',
  title: 'Old Mill',
});

const HARBOR_STORY: FakeDocument = {
  _id: 'story-harbor',
  _type: 'caseStudy',
  title: 'Harbor Storage cuts peak costs',
  slug: { _type: 'slug', current: 'harbor-storage' },
  project: ref(HARBOR._id),
};

const HARBOR_STORY_DRAFT: FakeDocument = {
  ...HARBOR_STORY,
  _id: 'drafts.story-harbor',
  title: 'Harbor Storage cuts peak costs by half',
};

/** A new case study, never published, with no title yet. */
const RIDGE_STORY_DRAFT: FakeDocument = {
  _id: 'drafts.story-ridge',
  _type: 'caseStudy',
  slug: { _type: 'slug', current: 'ridge-wind' },
  project: ref(RIDGE._id),
};

const DOCUMENTS = [
  ORCHARD,
  MILL,
  HARBOR,
  RIDGE,
  LINCOLN,
  OLD_MILL,
  // A raw read in ID order gives the draft first.
  HARBOR_STORY_DRAFT,
  HARBOR_STORY,
  RIDGE_STORY_DRAFT,
];

const HARBOR_LINKS = [
  {
    id: 'story-harbor',
    title: 'Harbor Storage cuts peak costs',
    published: true,
  },
];
const RIDGE_LINKS = [
  { id: 'story-ridge', title: 'ridge-wind', published: false },
];

const ofType = (sanity: FakeSanity, type: string) =>
  sanity.documents().filter(({ _type }) => _type === type);

const ids = (docs: FakeDocument[]) => docs.map(({ _id }) => _id);

const deletes = (mutations: Mutation[]) =>
  mutations.flatMap((mutation) =>
    'delete' in mutation && 'id' in mutation.delete ? [mutation.delete.id] : [],
  );

const remove = (sanity: FakeSanity, chosen: string[]) =>
  removeHidden(sanity, { ids: chosen, person: PERSON, now: NOW });

describe('the hidden list (AC-4.14)', () => {
  it('lists each hidden project with the date it went missing, newest first', async () => {
    const hidden = await listHidden(fakeSanity(DOCUMENTS));

    expect(hidden).toEqual([
      {
        id: 'plant-P-7',
        plantId: 'P-7',
        name: 'Orchard Solar',
        hiddenAt: '2026-11-03T09:00:00.000Z',
        caseStudies: [],
      },
      {
        id: 'plant-P-9',
        plantId: 'P-9',
        name: 'Harbor Storage',
        hiddenAt: '2026-11-02T09:00:00.000Z',
        caseStudies: HARBOR_LINKS,
      },
      {
        id: 'plant-P-8',
        plantId: 'P-8',
        name: 'Mill Street',
        hiddenAt: '2026-11-01T09:00:00.000Z',
        caseStudies: [],
      },
      {
        id: 'plant-P-10',
        plantId: 'P-10',
        name: 'Ridge Wind',
        hiddenAt: '2026-10-30T09:00:00.000Z',
        caseStudies: RIDGE_LINKS,
      },
    ]);
  });

  it('lists a case study once when both its published copy and its draft link', async () => {
    const hidden = await listHidden(fakeSanity(DOCUMENTS));

    const harbor = hidden.find(({ id }) => id === HARBOR._id);
    expect(harbor?.caseStudies).toEqual(HARBOR_LINKS);
  });

  it("leaves out a hidden project's draft", async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...LINCOLN, _id: 'drafts.plant-P-1', hiddenAt: NOW.toISOString() },
    ]);

    const hidden = await listHidden(sanity);

    expect(hidden.map(({ id }) => id)).not.toContain('drafts.plant-P-1');
  });
});

describe('deleting hidden projects (AC-4.14)', () => {
  it('saves a backup of every project, then deletes the chosen ones', async () => {
    const sanity = fakeSanity(DOCUMENTS);

    const result = await remove(sanity, [ORCHARD._id, MILL._id]);

    expect(result).toEqual({
      status: 'deleted',
      deleted: [
        { id: 'plant-P-7', name: 'Orchard Solar' },
        { id: 'plant-P-8', name: 'Mill Street' },
      ],
      backupId: expect.stringMatching(/^mapProjects\.backup\./),
      problems: [],
    });
    expect(ids(ofType(sanity, 'casestudies'))).toEqual([
      '0b5e-old-mill',
      'plant-P-1',
      'plant-P-10',
      'plant-P-9',
    ]);

    if (result.status !== 'deleted' || !result.backupId) throw new Error();
    const saved = await loadBackup(sanity, result.backupId);
    expect(saved?.backup).toMatchObject({
      source: { kind: 'delete' },
      person: PERSON,
      count: 6,
    });
    expect(ids(saved?.projects ?? [])).toContain(ORCHARD._id);

    const order = sanity.transactions.map(({ mutations }) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_TYPE,
      )
        ? 'backup'
        : deletes(mutations).includes(ORCHARD._id)
          ? 'delete'
          : 'other',
    );
    expect(order.indexOf('backup')).toBeGreaterThan(-1);
    expect(order.indexOf('backup')).toBeLessThan(order.indexOf('delete'));
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it("deletes a project's draft and release versions before the project", async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...ORCHARD, _id: 'drafts.plant-P-7' },
      { ...ORCHARD, _id: 'versions.r1.plant-P-7' },
      { ...LINCOLN, _id: 'drafts.plant-P-1' },
    ]);

    await remove(sanity, [ORCHARD._id]);

    const all = ids(sanity.documents());
    expect(all).not.toContain('drafts.plant-P-7');
    expect(all).not.toContain('versions.r1.plant-P-7');
    expect(all).toContain('drafts.plant-P-1');
    const order = sanity.transactions.flatMap(({ mutations }) =>
      deletes(mutations),
    );
    expect(order.indexOf('drafts.plant-P-7')).toBeLessThan(
      order.indexOf(ORCHARD._id),
    );
    expect(order.indexOf('versions.r1.plant-P-7')).toBeLessThan(
      order.indexOf(ORCHARD._id),
    );
  });

  it('refuses a project that a case study links to, lists its case studies, and deletes nothing', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    const before = sanity.documents();

    const result = await remove(sanity, [ORCHARD._id, HARBOR._id]);

    expect(result).toEqual({
      status: 'refused',
      refused: [
        {
          id: 'plant-P-9',
          reason: 'linked',
          name: 'Harbor Storage',
          caseStudies: HARBOR_LINKS,
        },
      ],
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('refuses a project that only a draft case study links to', async () => {
    const sanity = fakeSanity(DOCUMENTS);

    const result = await remove(sanity, [RIDGE._id]);

    expect(result).toEqual({
      status: 'refused',
      refused: [
        {
          id: 'plant-P-10',
          reason: 'linked',
          name: 'Ridge Wind',
          caseStudies: RIDGE_LINKS,
        },
      ],
    });
    expect(sanity.get(RIDGE._id)).toBeDefined();
  });

  it('refuses a project on the map, a missing one, and a draft, and deletes nothing', async () => {
    const sanity = fakeSanity([
      ...DOCUMENTS,
      { ...ORCHARD, _id: 'drafts.plant-P-7' },
    ]);
    const before = sanity.documents();

    const result = await remove(sanity, [
      LINCOLN._id,
      'plant-P-404',
      'drafts.plant-P-7',
      ORCHARD._id,
    ]);

    expect(result).toEqual({
      status: 'refused',
      refused: [
        { id: 'plant-P-1', reason: 'shown', name: 'Lincoln Solar' },
        { id: 'plant-P-404', reason: 'not-found' },
        { id: 'drafts.plant-P-7', reason: 'not-found' },
      ],
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('replies busy while another change holds the lock, and deletes nothing (AC-4.11)', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    await takeLock(sanity, new Date(NOW.getTime() - 60_000));

    expect(await remove(sanity, [ORCHARD._id])).toEqual({ status: 'busy' });
    expect(sanity.get(ORCHARD._id)).toBeDefined();
  });

  it('deletes nothing when the backup fails (AC-7.1)', async () => {
    const sanity = fakeSanity(DOCUMENTS);
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_TYPE,
      ),
    );

    const error = await remove(sanity, [ORCHARD._id]).catch((caught) => caught);

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({ stage: 'backup' });
    expect(sanity.get(ORCHARD._id)).toBeDefined();
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });
});
