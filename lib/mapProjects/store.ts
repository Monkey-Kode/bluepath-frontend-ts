import type { Mutation } from '@sanity/client';

import type { Casestudies } from '@/sanity.types';

/**
 * The part of the Sanity client that map project changes use. `writeClient()` fits it, and tests
 * pass `fakeSanity()` instead.
 */
export interface MapProjectsClient {
  fetch<R = unknown>(
    query: string,
    params?: Record<string, unknown>,
  ): Promise<R>;
  mutate(
    mutations: Mutation[],
    options?: { transactionId?: string },
  ): Promise<unknown>;
}

/** The most mutations, and JSON bytes, that one transaction carries. */
export interface CommitLimits {
  maxMutations: number;
  maxBytes: number;
}

/** Sanity refuses a mutation body over 4 MB, so each transaction stays under 3 MB. */
export const COMMIT_LIMITS: CommitLimits = {
  maxMutations: 250,
  maxBytes: 3_000_000,
};

const statusOf = (error: unknown) =>
  typeof error === 'object' && error !== null && 'statusCode' in error
    ? error.statusCode
    : undefined;

/** Sanity replies 409 to a create on a taken ID and to a stale `ifRevisionID`. */
export const isConflict = (error: unknown) => statusOf(error) === 409;

/** Sanity replies 404 to a patch on a missing document. */
export const isNotFound = (error: unknown) => statusOf(error) === 404;

/** Every published map project, hidden and website-only ones too, in `_id` order. */
export function readProjects(client: MapProjectsClient) {
  return client.fetch<Casestudies[]>('*[_type == "casestudies"] | order(_id)');
}

function batches(mutations: readonly Mutation[], limits: CommitLimits) {
  const groups: Mutation[][] = [];
  let group: Mutation[] = [];
  let bytes = 0;
  for (const mutation of mutations) {
    const size = Buffer.byteLength(JSON.stringify(mutation));
    if (
      group.length > 0 &&
      (group.length >= limits.maxMutations || bytes + size > limits.maxBytes)
    ) {
      groups.push(group);
      group = [];
      bytes = 0;
    }
    group.push(mutation);
    bytes += size;
  }
  if (group.length > 0) groups.push(group);
  return groups;
}

/**
 * Writes the mutations in order, in as few transactions as the limits allow (NFR-005). It stops
 * at the first failed transaction. The transactions before it stay written, so a rerun that plans
 * from a fresh read writes only the rest.
 * @returns The number of transactions.
 */
export async function commit(
  client: MapProjectsClient,
  mutations: readonly Mutation[],
  limits: CommitLimits = COMMIT_LIMITS,
) {
  const groups = batches(mutations, limits);
  for (const group of groups) await client.mutate(group);
  return groups.length;
}

/**
 * Deletes a document only while its `_rev` matches, in one transaction. The guarded patch fails
 * on a changed or missing document, so two callers can't both delete it.
 * @returns False when the document changed or is already gone.
 */
export async function deleteAtRevision(
  client: MapProjectsClient,
  id: string,
  rev: string,
) {
  try {
    await client.mutate([
      { patch: { id, ifRevisionID: rev, set: { deleted: true } } },
      { delete: { id } },
    ]);
    return true;
  } catch (error) {
    if (isConflict(error) || isNotFound(error)) return false;
    throw error;
  }
}
