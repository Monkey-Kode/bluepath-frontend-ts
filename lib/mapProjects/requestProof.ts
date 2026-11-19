import { createHash } from 'node:crypto';

import { deleteAtRevision, type MapProjectsClient } from './store';

/**
 * The Studio's request proof. Before each request, the Studio saves a document with a sha256 of
 * the request body and the editor's name, then sends its UUID in a header. Only a Studio user can
 * save that document, so the website takes a request only when its proof is in Sanity. Each proof
 * serves one request, within two minutes, for that exact body.
 */

export const REQUEST_PROOF_TYPE = 'mapProjects.request';
export const REQUEST_PROOF_HEADER = 'X-Map-Projects-Request';

/** A proof older than this no longer serves a request. */
export const PROOF_EXPIRY_MS = 2 * 60 * 1000;

/** The most expired proofs that one request deletes. */
const PRUNE_LIMIT = 50;

/** `crypto.randomUUID()` gives lower-case UUIDs, and document IDs are case-sensitive. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** The proof's document ID. The dot keeps it out of public reads. */
export const proofId = (uuid: string) => `${REQUEST_PROOF_TYPE}.${uuid}`;

export const isProofHeader = (value: string | null): value is string =>
  value !== null && UUID.test(value);

export const bodyHash = (body: Uint8Array) =>
  createHash('sha256').update(body).digest('hex');

export type TakenProof =
  | { ok: true; bodyHash: string; person: string }
  | { ok: false; reason: 'unknown' | 'used' | 'expired' | 'incomplete' };

interface StoredProof {
  _rev: string;
  _createdAt?: string;
  bodyHash?: unknown;
  person?: unknown;
}

function expired(createdAt: string | undefined, now: Date) {
  const time = createdAt ? Date.parse(createdAt) : Number.NaN;
  return Number.isNaN(time) || now.getTime() - time > PROOF_EXPIRY_MS;
}

/**
 * Deletes the proof before any other check, so a proof serves at most one request, even a refused
 * one. The caller then compares `bodyHash` with the body it reads.
 */
export async function takeProof(
  client: MapProjectsClient,
  uuid: string,
  now: Date,
): Promise<TakenProof> {
  const id = proofId(uuid);
  const proof = await client.fetch<StoredProof | null>(
    '*[_id == $id][0]{ _rev, _createdAt, bodyHash, person }',
    { id },
  );
  if (!proof) return { ok: false, reason: 'unknown' };
  if (!(await deleteAtRevision(client, id, proof._rev))) {
    return { ok: false, reason: 'used' };
  }
  if (expired(proof._createdAt, now)) return { ok: false, reason: 'expired' };

  const person = typeof proof.person === 'string' ? proof.person.trim() : '';
  if (!person || typeof proof.bodyHash !== 'string') {
    return { ok: false, reason: 'incomplete' };
  }
  return { ok: true, bodyHash: proof.bodyHash, person };
}

/**
 * Deletes proofs that expired without reaching the website, such as one whose request failed in
 * the browser. A few go at each request.
 */
export async function pruneProofs(client: MapProjectsClient, now: Date) {
  const cutoff = new Date(now.getTime() - PROOF_EXPIRY_MS).toISOString();
  const ids = await client.fetch<string[]>(
    `*[_type == $type && dateTime(_createdAt) < dateTime($cutoff)][0...${PRUNE_LIMIT}]._id`,
    { type: REQUEST_PROOF_TYPE, cutoff },
  );
  if (ids.length === 0) return;
  await client.mutate(ids.map((id) => ({ delete: { id } })));
}
