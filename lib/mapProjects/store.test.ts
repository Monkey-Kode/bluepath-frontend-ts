// @vitest-environment node
import type { Mutation, SanityClient } from '@sanity/client';
import { describe, expect, expectTypeOf, it } from 'vitest';

import { commit, type MapProjectsClient, readProjects } from './store';
import { fakeSanity } from './testing/fakeSanity';

const create = (id: string, text = ''): Mutation => ({
  create: { _id: id, _type: 'casestudies', text },
});

describe('MapProjectsClient', () => {
  it('fits the Sanity client', () => {
    expectTypeOf<SanityClient>().toExtend<MapProjectsClient>();
  });
});

describe('readProjects', () => {
  it('reads every map project in ID order, and no private document', async () => {
    const sanity = fakeSanity([
      { _id: 'plant-P-2', _type: 'casestudies', plantId: 'P-2' },
      { _id: 'mapProjects.lock', _type: 'mapProjects.lock' },
      {
        _id: 'plant-P-1',
        _type: 'casestudies',
        plantId: 'P-1',
        hiddenAt: '2026-11-01T00:00:00.000Z',
      },
      { _id: '7c1d-library', _type: 'casestudies', projectName: 'Library' },
      { _id: 'case-1', _type: 'caseStudy', title: 'A case study' },
    ]);

    const projects = await readProjects(sanity);

    expect(projects.map(({ _id }) => _id)).toEqual([
      '7c1d-library',
      'plant-P-1',
      'plant-P-2',
    ]);
    expect(projects[1]).toMatchObject({
      _rev: 'rev-0',
      hiddenAt: '2026-11-01T00:00:00.000Z',
    });
  });
});

describe('commit', () => {
  it('writes nothing for no mutations', async () => {
    const sanity = fakeSanity();

    expect(await commit(sanity, [])).toBe(0);
    expect(sanity.transactions).toEqual([]);
  });

  it('writes 500 rows in two transactions (NFR-005)', async () => {
    const sanity = fakeSanity();
    const mutations = Array.from({ length: 500 }, (_, n) => create(`p-${n}`));

    expect(await commit(sanity, mutations)).toBe(2);
    expect(sanity.documents()).toHaveLength(500);
  });

  it('splits transactions by count and size, in order', async () => {
    const sanity = fakeSanity();
    const big = 'x'.repeat(400);
    const mutations = [
      create('a'),
      create('b'),
      create('c'),
      create('d', big),
      create('e', big),
      create('f'),
    ];

    const count = await commit(sanity, mutations, {
      maxMutations: 3,
      maxBytes: 600,
    });

    const ids = sanity.transactions.map(({ mutations: group }) =>
      group.map((mutation) =>
        'create' in mutation ? mutation.create._id : '',
      ),
    );
    expect(ids).toEqual([['a', 'b', 'c'], ['d'], ['e', 'f']]);
    expect(count).toBe(3);
  });

  it('stops at the first failed transaction', async () => {
    const sanity = fakeSanity();
    sanity.failWhen((group) =>
      group.some(
        (mutation) => 'create' in mutation && mutation.create._id === 'c',
      ),
    );

    await expect(
      commit(sanity, [create('a'), create('b'), create('c'), create('d')], {
        maxMutations: 1,
        maxBytes: 1_000_000,
      }),
    ).rejects.toMatchObject({ statusCode: 500 });
    expect(sanity.documents().map(({ _id }) => _id)).toEqual(['a', 'b']);
  });
});
