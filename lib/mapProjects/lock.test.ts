// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { LOCK_ID, releaseLock, takeLock } from './lock';
import type { MapProjectsClient } from './store';
import { fakeSanity } from './testing/fakeSanity';

const START = new Date('2026-11-04T12:00:00.000Z');
const later = (ms: number) => new Date(START.getTime() + ms);
const TWO_MINUTES = 2 * 60 * 1000;

describe('takeLock', () => {
  it('takes a free lock and refuses a second change while it is held (AC-4.11)', async () => {
    const sanity = fakeSanity();

    const first = await takeLock(sanity, START);
    const second = await takeLock(sanity, later(1000));

    expect(first).toEqual(expect.any(String));
    expect(second).toBeNull();
    expect(sanity.get(LOCK_ID)).toMatchObject({
      _rev: first,
      takenAt: START.toISOString(),
    });
  });

  it('takes over a lock older than two minutes, and only then (AC-4.11)', async () => {
    const sanity = fakeSanity();
    const crashed = await takeLock(sanity, START);

    expect(await takeLock(sanity, later(TWO_MINUTES))).toBeNull();
    const next = await takeLock(sanity, later(TWO_MINUTES + 1));

    expect(next).toEqual(expect.any(String));
    expect(next).not.toBe(crashed);
    expect(sanity.get(LOCK_ID)).toMatchObject({
      _rev: next,
      takenAt: later(TWO_MINUTES + 1).toISOString(),
    });
  });

  it('lets only one of two takeovers win', async () => {
    const sanity = fakeSanity();
    await takeLock(sanity, START);

    const handles = await Promise.all([
      takeLock(sanity, later(3 * 60 * 1000)),
      takeLock(sanity, later(3 * 60 * 1000)),
    ]);

    expect(handles.filter(Boolean)).toHaveLength(1);
    expect(sanity.get(LOCK_ID)?._rev).toBe(handles.find(Boolean));
  });

  it('takes over a lock that has no time', async () => {
    const sanity = fakeSanity([{ _id: LOCK_ID, _type: 'mapProjects.lock' }]);

    expect(await takeLock(sanity, START)).toEqual(expect.any(String));
  });

  it('fails on an error other than a held lock', async () => {
    const sanity = fakeSanity();
    sanity.failWhen(() => true);

    await expect(takeLock(sanity, START)).rejects.toMatchObject({
      statusCode: 500,
    });
  });

  it('counts a lock released just after its create failed as busy', async () => {
    const sanity = fakeSanity();
    const holder = await takeLock(sanity, START);
    if (!holder) throw new Error('No lock.');
    // The holder releases the lock between this change's failed create and its read.
    const racing: MapProjectsClient = {
      fetch: async <R>(query: string, params?: Record<string, unknown>) => {
        await releaseLock(sanity, holder);
        return sanity.fetch<R>(query, params);
      },
      mutate: (mutations, options) => sanity.mutate(mutations, options),
    };

    expect(await takeLock(racing, later(1000))).toBeNull();
  });

  it('fails when a takeover hits an error other than a lost race', async () => {
    const sanity = fakeSanity();
    await takeLock(sanity, START);
    sanity.failWhen((mutations) =>
      mutations.some((mutation) => 'patch' in mutation),
    );

    await expect(takeLock(sanity, later(3 * 60 * 1000))).rejects.toMatchObject({
      statusCode: 500,
    });
  });
});

describe('releaseLock', () => {
  it('frees the lock for the next change', async () => {
    const sanity = fakeSanity();
    const handle = await takeLock(sanity, START);
    if (!handle) throw new Error('No lock.');

    expect(await releaseLock(sanity, handle)).toBe(true);
    expect(sanity.get(LOCK_ID)).toBeUndefined();
    expect(await takeLock(sanity, later(1000))).toEqual(expect.any(String));
  });

  it("keeps a lock that another change took over after this one's expired", async () => {
    const sanity = fakeSanity();
    const slow = await takeLock(sanity, START);
    const next = await takeLock(sanity, later(3 * 60 * 1000));
    if (!slow || !next) throw new Error('No lock.');

    expect(await releaseLock(sanity, slow)).toBe(false);
    expect(sanity.get(LOCK_ID)?._rev).toBe(next);
  });

  it('reports a lock that is already gone', async () => {
    const sanity = fakeSanity();
    const handle = await takeLock(sanity, START);
    if (!handle) throw new Error('No lock.');
    await releaseLock(sanity, handle);

    expect(await releaseLock(sanity, handle)).toBe(false);
  });

  it('fails on an error other than a lost or missing lock', async () => {
    const sanity = fakeSanity();
    const handle = await takeLock(sanity, START);
    if (!handle) throw new Error('No lock.');
    sanity.failWhen(() => true);

    await expect(releaseLock(sanity, handle)).rejects.toMatchObject({
      statusCode: 500,
    });
    expect(sanity.get(LOCK_ID)?._rev).toBe(handle);
  });
});
