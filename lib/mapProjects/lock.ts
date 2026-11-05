import { randomUUID } from 'node:crypto';

import { isConflict, isNotFound, type MapProjectsClient } from './store';

/** One lock serves every change: a feed file, an import, a restore, a link, or a delete. */
export const LOCK_ID = 'mapProjects.lock';

/** A lock older than this was left by a crashed run, so the next change takes it over (D-36). */
export const LOCK_EXPIRY_MS = 2 * 60 * 1000;

/** A transaction ID of letters and digits only, the form the probe of `development` used. */
const newTransactionId = () => randomUUID().replaceAll('-', '');

function expired(takenAt: unknown, now: Date) {
  const time = typeof takenAt === 'string' ? Date.parse(takenAt) : Number.NaN;
  return Number.isNaN(time) || now.getTime() - time > LOCK_EXPIRY_MS;
}

/**
 * Takes the lock for one change (AC-4.11). The lock document's `_rev` becomes this change's
 * transaction ID, so only its holder can release it. A takeover patches with the old `_rev` as
 * `ifRevisionID`, so two takeovers can't both win.
 * @returns The handle for `releaseLock`, or null while another change holds the lock.
 */
export async function takeLock(
  client: MapProjectsClient,
  now: Date,
): Promise<string | null> {
  const takenAt = now.toISOString();
  const created = newTransactionId();
  try {
    await client.mutate(
      [{ create: { _id: LOCK_ID, _type: LOCK_ID, takenAt } }],
      { transactionId: created },
    );
    return created;
  } catch (error) {
    if (!isConflict(error)) throw error;
  }

  const held = await client.fetch<{ _rev: string; takenAt?: string } | null>(
    '*[_id == $id][0]{ _rev, takenAt }',
    { id: LOCK_ID },
  );
  // A lock released since the create failed counts as busy for this attempt. The caller retries.
  if (!held || !expired(held.takenAt, now)) return null;

  const takeover = newTransactionId();
  try {
    await client.mutate(
      [{ patch: { id: LOCK_ID, ifRevisionID: held._rev, set: { takenAt } } }],
      { transactionId: takeover },
    );
    return takeover;
  } catch (error) {
    if (isConflict(error) || isNotFound(error)) return null;
    throw error;
  }
}

/**
 * Releases the lock if this change still holds it. The patch fails on another holder's `_rev`, and
 * the transaction then keeps the lock.
 * @returns False when another change took the lock over, or when it is already gone.
 */
export async function releaseLock(client: MapProjectsClient, handle: string) {
  try {
    await client.mutate([
      { patch: { id: LOCK_ID, ifRevisionID: handle, set: { released: true } } },
      { delete: { id: LOCK_ID } },
    ]);
    return true;
  } catch (error) {
    if (isConflict(error) || isNotFound(error)) return false;
    throw error;
  }
}
