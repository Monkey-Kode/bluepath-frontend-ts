import type { Mutation } from '@sanity/client';
import { evaluate, parse } from 'groq-js';

import type { MapProjectsClient } from '../store';

export interface FakeDocument {
  _id: string;
  _type: string;
  _rev?: string;
  [field: string]: unknown;
}

export interface FakeTransaction {
  mutations: Mutation[];
  transactionId?: string;
  failed: boolean;
}

export interface FakeSanity extends MapProjectsClient {
  /** Every stored document, in `_id` order. */
  documents(): FakeDocument[];
  get(id: string): FakeDocument | undefined;
  /** Each `mutate` call in order, including the ones that failed. */
  readonly transactions: FakeTransaction[];
  /** The next `mutate` call that matches fails with a 500 and changes nothing. */
  failWhen(matches: (mutations: Mutation[]) => boolean): void;
}

/** An error shaped like the Sanity client's `ClientError`. */
function apiError(statusCode: number, description: string) {
  return Object.assign(new Error(`Mutation failed: ${description}`), {
    statusCode,
  });
}

function onlyId(selection: { id: string | string[] } | { query: string }) {
  if (!('id' in selection) || typeof selection.id !== 'string') {
    throw new Error('fakeSanity supports one document ID per mutation.');
  }
  return selection.id;
}

function checkTopLevel(keys: string[]) {
  const nested = keys.find((key) => /[.[\]]/.test(key));
  if (nested) {
    throw new Error(`fakeSanity supports top-level fields only: ${nested}`);
  }
}

/**
 * An in-memory Sanity dataset for tests. Queries run through `groq-js`. Mutations follow the
 * real API, as a probe of the `development` dataset showed on Nov 4:
 * - A transaction applies whole or not at all.
 * - `create` on an existing ID and a `patch` whose `ifRevisionID` doesn't match fail with 409.
 * - A `patch` on a missing document fails with 404.
 * - Each document a transaction touches gets the transaction ID as its `_rev`.
 */
export function fakeSanity(initial: readonly FakeDocument[] = []): FakeSanity {
  let store = new Map(
    initial.map((doc) => [doc._id, structuredClone({ _rev: 'rev-0', ...doc })]),
  );
  const transactions: FakeTransaction[] = [];
  const failures: ((mutations: Mutation[]) => boolean)[] = [];
  let counter = 0;

  function applyOne(
    next: Map<string, FakeDocument>,
    mutation: Mutation,
    rev: string,
  ) {
    if ('create' in mutation) {
      const { _id } = mutation.create;
      if (!_id) throw new Error('fakeSanity needs an _id on create.');
      if (next.has(_id)) {
        throw apiError(409, `Document by ID "${_id}" already exists`);
      }
      next.set(_id, { ...structuredClone(mutation.create), _id, _rev: rev });
    } else if ('createOrReplace' in mutation) {
      const doc = structuredClone(mutation.createOrReplace);
      next.set(doc._id, { ...doc, _rev: rev });
    } else if ('createIfNotExists' in mutation) {
      const doc = structuredClone(mutation.createIfNotExists);
      if (!next.has(doc._id)) next.set(doc._id, { ...doc, _rev: rev });
    } else if ('delete' in mutation) {
      next.delete(onlyId(mutation.delete));
    } else if ('patch' in mutation) {
      const { set = {}, unset = [], ifRevisionID, ...rest } = mutation.patch;
      const id = onlyId(rest as { id: string });
      const extra = Object.keys(rest).filter((key) => key !== 'id');
      if (extra.length > 0) {
        throw new Error(`fakeSanity doesn't support patch ${extra.join(', ')}`);
      }
      checkTopLevel([...Object.keys(set), ...unset]);
      const doc = next.get(id);
      if (!doc) {
        throw apiError(404, `The document with the ID "${id}" was not found`);
      }
      if (ifRevisionID !== undefined && ifRevisionID !== doc._rev) {
        throw apiError(
          409,
          `Document "${id}" has unexpected revision ID ("${doc._rev}"), expected "${ifRevisionID}"`,
        );
      }
      const patched: FakeDocument = { ...doc, ...structuredClone(set) };
      for (const key of unset) delete patched[key];
      next.set(id, { ...patched, _rev: rev });
    }
  }

  return {
    async fetch<R = unknown>(
      query: string,
      params: Record<string, unknown> = {},
    ) {
      const dataset = [...store.values()];
      const value = await evaluate(parse(query, { params }), {
        dataset,
        params,
      });
      return structuredClone(await value.get()) as R;
    },

    async mutate(mutations, options) {
      const transactionId = options?.transactionId;
      const failure = failures.findIndex((matches) => matches(mutations));
      if (failure !== -1) {
        failures.splice(failure, 1);
        transactions.push({ mutations, transactionId, failed: true });
        throw apiError(500, 'An injected failure');
      }
      counter += 1;
      const rev = transactionId ?? `rev-${counter}`;
      const next = new Map(store);
      try {
        for (const mutation of mutations) applyOne(next, mutation, rev);
      } catch (error) {
        transactions.push({ mutations, transactionId, failed: true });
        throw error;
      }
      store = next;
      transactions.push({ mutations, transactionId, failed: false });
      return { transactionId: rev };
    },

    documents() {
      return [...store.values()]
        .map((doc) => structuredClone(doc))
        .sort((a, b) => (a._id < b._id ? -1 : a._id > b._id ? 1 : 0));
    },

    get(id) {
      const doc = store.get(id);
      return doc && structuredClone(doc);
    },

    transactions,

    failWhen(matches) {
      failures.push(matches);
    },
  };
}
