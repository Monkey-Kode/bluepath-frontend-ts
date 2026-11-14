// @vitest-environment node
import type { Mutation } from '@sanity/client';
import { describe, expect, it } from 'vitest';

import type { Casestudies } from '@/sanity.types';

import { ChangeFailure, previewImport, starterLoadDone } from './apply';
import { BACKUP_TYPE, loadBackup, saveBackup } from './backups';
import { linkProject } from './link';
import { LOCK_ID, takeLock } from './lock';
import { previewRestore, restoreBackup } from './restore';
import { type MapProjectsClient, readProjects } from './store';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from './testing/fakeSanity';
import { csv } from './testing/files';

const BACKUP_AT = new Date('2026-11-03T12:00:00.000Z');
const NOW = new Date('2026-11-04T12:00:00.000Z');
const PERSON = 'Ada Editor';

const ref = (id: string) => ({ _type: 'reference', _ref: id });

const SAVED_TIMES = {
  _createdAt: '2026-10-01T00:00:00Z',
  _updatedAt: '2026-10-02T00:00:00Z',
};

/** A website project that the starter load merged with plant P-2. */
const NEWTON: FakeDocument = {
  _id: '0b5e-newton',
  _type: 'casestudies',
  ...SAVED_TIMES,
  websiteId: '0b5e-newton',
  plantId: 'P-2',
  plantName: 'Wells Solar',
  projectStatus: 'Operating',
  city: 'Newton',
  state: 'MA',
};

const LINCOLN: FakeDocument = {
  _id: 'plant-P-1',
  _type: 'casestudies',
  ...SAVED_TIMES,
  plantId: 'P-1',
  plantName: 'Lincoln Solar',
  location: { _type: 'geopoint', lat: 42.4, lng: -71.3 },
};

/** A plant that an editor deleted after the backup. */
const GONE: FakeDocument = {
  _id: 'plant-P-3',
  _type: 'casestudies',
  ...SAVED_TIMES,
  plantId: 'P-3',
  plantName: 'Gone Storage',
  technologies: ['Storage'],
  hiddenAt: '2026-10-20T00:00:00.000Z',
};

const QUIET: FakeDocument = {
  _id: 'plant-P-4',
  _type: 'casestudies',
  plantId: 'P-4',
  plantName: 'Quiet Solar',
  hiddenAt: '2026-10-01T00:00:00.000Z',
};

/** Plants that files added after the backup. */
const ADDED: FakeDocument = {
  _id: 'plant-P-5',
  _type: 'casestudies',
  plantId: 'P-5',
  plantName: 'Added Wind',
};
const LINKED: FakeDocument = {
  _id: 'plant-P-6',
  _type: 'casestudies',
  plantId: 'P-6',
  plantName: 'Linked Hydro',
};
const HIDDEN_LINKED: FakeDocument = {
  _id: 'plant-P-9',
  _type: 'casestudies',
  plantId: 'P-9',
  plantName: 'Hidden Linked',
  hiddenAt: '2026-11-02T00:00:00.000Z',
};

const KEPT = [LINKED._id, HIDDEN_LINKED._id];

/** A project's own fields, without the ones that Sanity sets on each write. */
const contentOf = ({
  _rev,
  _createdAt,
  _updatedAt,
  ...content
}: FakeDocument | Casestudies) => content;

/** A stored document's own fields. */
function stored(sanity: FakeSanity, id: string) {
  const doc = sanity.get(id);
  if (!doc) throw new Error(`${id} is missing.`);
  return contentOf(doc);
}

const backups = (sanity: FakeSanity) =>
  sanity.documents().filter(({ _type }) => _type === BACKUP_TYPE);

/** Saves a backup of the current projects at `at`, as a change does before it writes. */
async function backUp(sanity: FakeSanity, at = BACKUP_AT) {
  return saveBackup(sanity, {
    projects: await readProjects(sanity),
    source: { kind: 'file', name: 'plants.xlsx' },
    person: PERSON,
    now: at,
  });
}

/**
 * Backs up four projects, then changes them: one project changes, one goes, three plants arrive,
 * and case studies link two of the new plants. One project changes only in ways that don't count.
 */
async function scenario() {
  const sanity = fakeSanity([NEWTON, LINCOLN, GONE, QUIET]);
  const id = await backUp(sanity);
  const recorded = await readProjects(sanity);
  await sanity.mutate([
    {
      patch: {
        id: NEWTON._id,
        set: {
          projectStatus: 'Retired',
          location: { _type: 'geopoint', lat: 42.3, lng: -71.2 },
          financing: ['PPA'],
        },
        unset: ['city'],
      },
    },
    // The same location with its keys in another order, a new _rev, and a new _updatedAt.
    {
      patch: {
        id: LINCOLN._id,
        set: {
          location: { lng: -71.3, lat: 42.4, _type: 'geopoint' },
          _updatedAt: '2026-11-04T00:00:00Z',
        },
      },
    },
    { delete: { id: GONE._id } },
    { create: ADDED },
    { create: { ...ADDED, _id: 'drafts.plant-P-5' } },
    { create: LINKED },
    { create: HIDDEN_LINKED },
    {
      create: {
        _id: 'story-hydro',
        _type: 'caseStudy',
        title: 'Hydro story',
        project: ref(LINKED._id),
      },
    },
    {
      create: {
        _id: 'drafts.story-quiet',
        _type: 'caseStudy',
        title: 'Quiet story',
        project: ref(HIDDEN_LINKED._id),
      },
    },
  ]);
  return { sanity, id, recorded };
}

async function planFor(client: MapProjectsClient, id: string) {
  const preview = await previewRestore(client, id);
  if (preview.status !== 'ready') throw new Error(preview.status);
  return preview.plan;
}

const restore = (client: MapProjectsClient, id: string, token: string) =>
  restoreBackup(client, { id, token, person: PERSON, now: NOW });

describe('the restore preview (AC-7.3)', () => {
  it('names what changes back, what goes, and what stays, and writes nothing', async () => {
    const { sanity, id } = await scenario();
    const before = sanity.documents();

    const preview = await previewRestore(sanity, id);

    expect(preview).toEqual({
      status: 'ready',
      plan: {
        backup: {
          id,
          createdAt: BACKUP_AT.toISOString(),
          source: { kind: 'file', name: 'plants.xlsx' },
          person: PERSON,
          count: 4,
        },
        // Fields in the starter workbook's order. The two-way changes all count.
        updates: [
          {
            id: NEWTON._id,
            plantId: 'P-2',
            name: 'Wells Solar',
            fields: ['projectStatus', 'location', 'city', 'financing'],
          },
        ],
        creates: [{ id: GONE._id, plantId: 'P-3', name: 'Gone Storage' }],
        deletes: [{ id: ADDED._id, plantId: 'P-5', name: 'Added Wind' }],
        // By name. A case study links each, so each stays and joins the hidden list.
        keeps: [
          {
            id: HIDDEN_LINKED._id,
            plantId: 'P-9',
            name: 'Hidden Linked',
            caseStudies: [
              { id: 'story-quiet', title: 'Quiet story', published: false },
            ],
            hides: false,
          },
          {
            id: LINKED._id,
            plantId: 'P-6',
            name: 'Linked Hydro',
            caseStudies: [
              { id: 'story-hydro', title: 'Hydro story', published: true },
            ],
            hides: true,
          },
        ],
        counts: { updated: 1, created: 1, deleted: 1, kept: 2, unchanged: 2 },
        writes: true,
        starterLoad: false,
        token: expect.stringMatching(/^[0-9a-f]{64}$/),
      },
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('sorts each group by name', async () => {
    const sanity = fakeSanity([QUIET]);
    const id = await backUp(sanity);
    await sanity.mutate([
      {
        create: {
          ...ADDED,
          _id: 'plant-P-7',
          plantId: 'P-7',
          plantName: 'Zinnia Solar',
        },
      },
      {
        create: {
          ...ADDED,
          _id: 'plant-P-8',
          plantId: 'P-8',
          plantName: 'Aster Solar',
        },
      },
    ]);

    const plan = await planFor(sanity, id);

    expect(plan.deletes.map(({ name }) => name)).toEqual([
      'Aster Solar',
      'Zinnia Solar',
    ]);
  });

  it('says the backup is gone', async () => {
    expect(
      await previewRestore(fakeSanity([QUIET]), 'mapProjects.backup.x'),
    ).toEqual({ status: 'missing' });
  });
});

describe('restoring a backup (AC-7.3)', () => {
  it('puts every project back as the backup recorded it, and keeps the linked ones hidden', async () => {
    const { sanity, id, recorded } = await scenario();
    const plan = await planFor(sanity, id);

    const result = await restore(sanity, id, plan.token);

    expect(result).toEqual({
      status: 'restored',
      plan,
      backupId: expect.stringMatching(/^mapProjects\.backup\./),
      problems: [],
    });
    const after = await readProjects(sanity);
    expect(
      after.filter(({ _id }) => !KEPT.includes(_id)).map(contentOf),
    ).toEqual(recorded.map(contentOf));
    expect(stored(sanity, LINKED._id)).toEqual({
      ...LINKED,
      hiddenAt: NOW.toISOString(),
    });
    expect(stored(sanity, HIDDEN_LINKED._id)).toEqual(HIDDEN_LINKED);
    expect(sanity.get('drafts.plant-P-5')).toBeUndefined();
    expect(sanity.get('story-hydro')).toMatchObject({
      project: ref(LINKED._id),
    });
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('saves a backup of the current projects first, which names the restored backup', async () => {
    const { sanity, id } = await scenario();
    const current = await readProjects(sanity);
    const plan = await planFor(sanity, id);

    const result = await restore(sanity, id, plan.token);

    if (result.status !== 'restored' || !result.backupId) throw new Error();
    const saved = await loadBackup(sanity, result.backupId);
    expect(saved?.backup).toMatchObject({
      createdAt: NOW.toISOString(),
      source: { kind: 'restore', backupId: id },
      person: PERSON,
      count: current.length,
    });
    expect(saved?.projects).toEqual(current);
  });

  it('writes a project back without the fields that Sanity sets', async () => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);

    await restore(sanity, id, plan.token);

    const creates = sanity.transactions
      .flatMap(({ mutations }) => mutations)
      .filter(
        (mutation): mutation is Extract<Mutation, { create: unknown }> =>
          'create' in mutation && mutation.create._id === GONE._id,
      );
    expect(creates.map(({ create }) => create)).toEqual([contentOf(GONE)]);
  });

  it("undoes a link: the plant's project returns, and the website project loses the plant's fields", async () => {
    const oldMill: FakeDocument = {
      _id: '0b5e-old-mill',
      _type: 'casestudies',
      websiteId: '0b5e-old-mill',
      title: 'Old Mill',
      city: 'Lowell',
      state: 'Massachusetts',
    };
    const orchard: FakeDocument = {
      _id: 'plant-P-7',
      _type: 'casestudies',
      plantId: 'P-7',
      plantName: 'Orchard Solar',
      projectStatus: 'Operating',
      city: 'Billerica',
      state: 'Massachusetts',
    };
    const sanity = fakeSanity([oldMill, orchard, LINCOLN]);
    const before = (await readProjects(sanity)).map(contentOf);
    const linked = await linkProject(sanity, {
      project: oldMill._id,
      plant: orchard._id,
      person: PERSON,
      now: BACKUP_AT,
    });
    if (linked.status !== 'linked' || !linked.backupId) throw new Error();

    const plan = await planFor(sanity, linked.backupId);
    await restore(sanity, linked.backupId, plan.token);

    expect(plan.updates).toEqual([
      {
        id: oldMill._id,
        plantId: null,
        name: 'Old Mill',
        fields: ['plantId', 'plantName', 'projectStatus'],
      },
    ]);
    expect(plan.creates).toEqual([
      { id: orchard._id, plantId: 'P-7', name: 'Orchard Solar' },
    ]);
    // Strict, so a field left as undefined fails. Sanity would keep that field.
    expect((await readProjects(sanity)).map(contentOf)).toStrictEqual(before);
  });

  it('counts hiding a linked project as a change', async () => {
    const sanity = fakeSanity([QUIET]);
    const id = await backUp(sanity);
    await sanity.mutate([
      { create: LINKED },
      {
        create: {
          _id: 'story-hydro',
          _type: 'caseStudy',
          project: ref(LINKED._id),
        },
      },
    ]);

    const plan = await planFor(sanity, id);
    const result = await restore(sanity, id, plan.token);

    expect(plan).toMatchObject({
      writes: true,
      counts: { updated: 0, created: 0, deleted: 0, kept: 1, unchanged: 1 },
    });
    expect(result).toMatchObject({
      status: 'restored',
      backupId: expect.any(String),
    });
    expect(sanity.get(LINKED._id)).toMatchObject({
      hiddenAt: NOW.toISOString(),
    });
  });

  it('writes nothing and saves no backup when the projects already match', async () => {
    const sanity = fakeSanity([NEWTON, QUIET]);
    const id = await backUp(sanity);
    const plan = await planFor(sanity, id);

    const result = await restore(sanity, id, plan.token);

    expect(plan).toMatchObject({
      writes: false,
      counts: { updated: 0, created: 0, deleted: 0, kept: 0, unchanged: 2 },
    });
    expect(result).toEqual({
      status: 'restored',
      plan,
      backupId: null,
      problems: [],
    });
    expect(backups(sanity).map(({ _id }) => _id)).toEqual([id]);
  });

  it('writes nothing for a linked project that is already hidden', async () => {
    const sanity = fakeSanity([QUIET]);
    const id = await backUp(sanity);
    await sanity.mutate([
      { create: HIDDEN_LINKED },
      {
        create: {
          _id: 'story-quiet',
          _type: 'caseStudy',
          project: ref(HIDDEN_LINKED._id),
        },
      },
    ]);
    const before = sanity.documents();

    const plan = await planFor(sanity, id);
    const result = await restore(sanity, id, plan.token);

    expect(plan.writes).toBe(false);
    expect(result).toMatchObject({ status: 'restored', backupId: null });
    expect(sanity.documents()).toEqual(before);
  });
});

describe('a restore of a backup from before the starter load (AC-7.3, AC-4.12)', () => {
  const MILL: FakeDocument = {
    _id: '0b5e-old-mill',
    _type: 'casestudies',
    title: 'Old Mill',
  };

  /** Backs up the website's own projects, then runs a small starter load. */
  async function starterScenario() {
    const sanity = fakeSanity([MILL]);
    const id = await backUp(sanity);
    await sanity.mutate([
      {
        patch: {
          id: MILL._id,
          set: { websiteId: MILL._id, plantId: 'P-7', plantName: 'Orchard' },
        },
      },
      { create: { ...ADDED, _id: 'plant-P-1', plantId: 'P-1' } },
    ]);
    return { sanity, id };
  }

  it('says the starter load comes back, and then the pane offers it again', async () => {
    const { sanity, id } = await starterScenario();
    const plan = await planFor(sanity, id);

    await restore(sanity, id, plan.token);

    expect(plan.starterLoad).toBe(true);
    expect(starterLoadDone(await readProjects(sanity))).toBe(false);
    expect(
      await previewImport(sanity, {
        file: csv({ plantId: 'P-1', plantName: 'Added Wind' }),
        options: { hideMissing: false },
      }),
    ).toEqual({ status: 'not-ready' });
  });

  it('keeps the starter load done when a linked plant stays with its Plant ID', async () => {
    const { sanity, id } = await starterScenario();
    await sanity.mutate([
      {
        create: {
          _id: 'story-wind',
          _type: 'caseStudy',
          project: ref('plant-P-1'),
        },
      },
    ]);

    const plan = await planFor(sanity, id);

    expect(plan.keeps.map(({ id }) => id)).toEqual(['plant-P-1']);
    expect(plan.starterLoad).toBe(false);
  });

  it('says nothing about the starter load when it never ran', async () => {
    const sanity = fakeSanity([MILL]);
    const id = await backUp(sanity);
    await sanity.mutate([
      { patch: { id: MILL._id, set: { title: 'Old Mill Solar' } } },
    ]);

    const plan = await planFor(sanity, id);

    expect(plan.counts.updated).toBe(1);
    expect(plan.starterLoad).toBe(false);
  });
});

describe('a restore that stops (AC-7.3)', () => {
  it('changes nothing when a project changed after the preview, and returns the new plan', async () => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);
    await sanity.mutate([
      {
        patch: { id: LINCOLN._id, set: { plantName: 'Lincoln Solar Two' } },
      },
    ]);
    const before = sanity.documents();

    const result = await restore(sanity, id, plan.token);

    if (result.status !== 'stale') throw new Error(result.status);
    expect(result.plan.token).not.toBe(plan.token);
    // By name, which comes from the backup's copy.
    expect(result.plan.updates.map(({ id }) => id)).toEqual([
      LINCOLN._id,
      NEWTON._id,
    ]);
    expect(sanity.documents()).toEqual(before);
  });

  it('changes nothing when a case study linked an added project after the preview', async () => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);
    await sanity.mutate([
      {
        create: {
          _id: 'story-wind',
          _type: 'caseStudy',
          project: ref(ADDED._id),
        },
      },
    ]);
    const before = sanity.documents();

    const result = await restore(sanity, id, plan.token);

    if (result.status !== 'stale') throw new Error(result.status);
    expect(result.plan.deletes).toEqual([]);
    expect(result.plan.keeps.map(({ id }) => id)).toContain(ADDED._id);
    expect(sanity.documents()).toEqual(before);
  });

  it("changes nothing when the token came from another backup's preview", async () => {
    // Both backups' plans see the same projects, so only the backup tells them apart.
    const sanity = fakeSanity([NEWTON]);
    const id = await backUp(sanity);
    await sanity.mutate([
      { patch: { id: NEWTON._id, set: { projectStatus: 'Retired' } } },
    ]);
    const other = await backUp(sanity, new Date('2026-11-03T13:00:00.000Z'));
    const plan = await planFor(sanity, id);
    const before = sanity.documents();

    const result = await restore(sanity, other, plan.token);

    expect(plan.counts.updated).toBe(1);
    expect(result).toMatchObject({
      status: 'stale',
      plan: { backup: { id: other }, writes: false },
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('replies busy while another change holds the lock (AC-4.11)', async () => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);
    await takeLock(sanity, new Date(NOW.getTime() - 60_000));
    const before = sanity.documents();

    expect(await restore(sanity, id, plan.token)).toEqual({ status: 'busy' });
    expect(sanity.documents()).toEqual(before);
  });

  it('says the backup is gone', async () => {
    const { sanity } = await scenario();
    const before = sanity.documents();

    expect(await restore(sanity, 'mapProjects.backup.x', 'token')).toEqual({
      status: 'missing',
    });
    expect(sanity.documents()).toEqual(before);
  });

  it('changes nothing when the backup fails (AC-7.1)', async () => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_TYPE,
      ),
    );
    const before = sanity.documents();

    const error = await restore(sanity, id, plan.token).catch(
      (caught) => caught,
    );

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({ stage: 'backup' });
    expect(sanity.documents().filter(({ _id }) => _id !== LOCK_ID)).toEqual(
      before,
    );
  });

  it.each([
    ['changes back', NEWTON._id],
    ['the restore hides', LINKED._id],
  ])('keeps a project that %s when it changed during the restore', async (_, edit) => {
    const { sanity, id } = await scenario();
    const plan = await planFor(sanity, id);
    let edited = false;
    // Someone publishes the project while the restore checks for case studies.
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
            { patch: { id: edit, set: { plantName: 'Wells Two' } } },
          ]);
        }
        return sanity.fetch<R>(query, params, options);
      },
    };

    const error = await restore(client, id, plan.token).catch(
      (caught) => caught,
    );

    expect(error).toBeInstanceOf(ChangeFailure);
    expect(error).toMatchObject({ stage: 'write' });
    expect(sanity.get(edit)).toMatchObject({ plantName: 'Wells Two' });
    // The restore wrote none of its plan.
    expect(sanity.get(NEWTON._id)).toMatchObject({ projectStatus: 'Retired' });
    expect(sanity.get(LINKED._id)?.hiddenAt).toBeUndefined();
    expect(sanity.get(GONE._id)).toBeUndefined();
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });
});
