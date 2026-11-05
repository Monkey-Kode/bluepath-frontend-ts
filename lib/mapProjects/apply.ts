import type { Mutation } from '@sanity/client';

import type { Casestudies } from '@/sanity.types';

import { type BackupSource, pruneBackups, saveBackup } from './backups';
import { releaseLock, takeLock } from './lock';
import { type ParseCsvError, parseCsv } from './parseCsv';
import {
  type CurrentProject,
  type FieldValues,
  type ImportPlan,
  type PlanOptions,
  planImport,
} from './plan';
import {
  COMMIT_LIMITS,
  type CommitLimits,
  commit,
  type MapProjectsClient,
  readProjects,
} from './store';
import { validateRows } from './validate';

export interface ChangeContext {
  /** What the backup names as the change (AC-7.1). */
  source: BackupSource;
  /** The editor's name, or `FEED_PERSON`. */
  person: string;
  now?: Date;
  /** Tests pass small limits to split the writes into more transactions. */
  limits?: CommitLimits;
}

export interface ChangeDecision<T> {
  /** The writes to make. None means no backup and no write. */
  mutations: Mutation[];
  value: T;
}

/** A step after the writes that failed. The change itself still stands. */
export interface ChangeProblem {
  stage: 'prune' | 'unlock';
  message: string;
}

export type ChangeResult<T> =
  | { status: 'busy' }
  | {
      status: 'done';
      value: T;
      /** The backup saved before the writes, or null when nothing was written. */
      backupId: string | null;
      problems: ChangeProblem[];
    };

/**
 * A change failed after it took the lock. A failed backup wrote nothing. A failed write may have
 * written some transactions, and the next run of the same change writes the rest.
 */
export class ChangeFailure extends Error {
  readonly stage: 'backup' | 'write';

  constructor(stage: 'backup' | 'write', cause: unknown) {
    super(
      stage === 'backup'
        ? 'The backup failed, so nothing changed.'
        : 'A write failed partway. Running the same change again finishes it.',
      { cause },
    );
    this.name = 'ChangeFailure';
    this.stage = stage;
  }
}

const messageOf = (error: unknown) =>
  error instanceof Error ? error.message : String(error);

async function unlock(
  client: MapProjectsClient,
  handle: string,
): Promise<ChangeProblem | null> {
  try {
    if (await releaseLock(client, handle)) return null;
    return {
      stage: 'unlock',
      message: 'The lock expired before the change finished.',
    };
  } catch (error) {
    return { stage: 'unlock', message: messageOf(error) };
  }
}

/**
 * Runs one change to map projects under the lock that every change shares (AC-4.11). It reads
 * every project, and `decide` returns the writes. When there are writes, it saves a backup of
 * every project first and writes nothing if the backup fails (AC-7.1). A feed change then deletes
 * the feed's expired backups (AC-7.4).
 * @throws ChangeFailure when the backup or a write fails. The lock is released either way.
 */
export async function runChange<T>(
  client: MapProjectsClient,
  { source, person, now = new Date(), limits = COMMIT_LIMITS }: ChangeContext,
  decide: (
    projects: Casestudies[],
  ) => ChangeDecision<T> | Promise<ChangeDecision<T>>,
): Promise<ChangeResult<T>> {
  const handle = await takeLock(client, now);
  if (!handle) return { status: 'busy' };

  const problems: ChangeProblem[] = [];
  let value: T;
  let backupId: string | null = null;
  try {
    const projects = await readProjects(client);
    const decision = await decide(projects);
    value = decision.value;
    if (decision.mutations.length > 0) {
      try {
        backupId = await saveBackup(client, { projects, source, person, now });
      } catch (cause) {
        throw new ChangeFailure('backup', cause);
      }
      try {
        await commit(client, decision.mutations, limits);
      } catch (cause) {
        throw new ChangeFailure('write', cause);
      }
    }
    if (source.kind === 'feed') {
      try {
        await pruneBackups(client, now);
      } catch (error) {
        problems.push({ stage: 'prune', message: messageOf(error) });
      }
    }
  } catch (error) {
    // A lock that this release leaves behind expires in two minutes.
    await unlock(client, handle);
    throw error;
  }

  const problem = await unlock(client, handle);
  if (problem) problems.push(problem);
  return { status: 'done', value, backupId, problems };
}

/** Splits a row's fields into Sanity's set and unset. Null clears a field. */
function writable(fields: Partial<FieldValues>) {
  const set: Record<string, unknown> = {};
  const unset: string[] = [];
  for (const [field, value] of Object.entries(fields)) {
    if (value === null) unset.push(field);
    else set[field] = value;
  }
  if (fields.location) set.location = { _type: 'geopoint', ...fields.location };
  return { set, unset };
}

/**
 * The writes for a plan, rows in file order and then hides. Each patch carries the project's
 * `_rev` as `ifRevisionID`, so a project that changed after the read fails the write instead of
 * losing that change.
 */
function importMutations(
  plan: ImportPlan,
  projects: readonly CurrentProject[],
  now: Date,
): Mutation[] {
  const revisions = new Map(projects.map(({ _id, _rev }) => [_id, _rev]));
  const patch = (id: string, set: Record<string, unknown>, unset: string[]) => {
    const ifRevisionID = revisions.get(id);
    if (!ifRevisionID) throw new Error(`The plan names no project ${id}.`);
    return {
      patch: {
        id,
        ifRevisionID,
        ...(Object.keys(set).length > 0 && { set }),
        ...(unset.length > 0 && { unset }),
      },
    };
  };

  const mutations: Mutation[] = [];
  for (const row of plan.rows) {
    if (row.action === 'create') {
      const { set } = writable(row.fields);
      mutations.push({ create: { _id: row.id, _type: 'casestudies', ...set } });
    } else if (row.action === 'update') {
      const { set, unset } = writable(row.changes);
      mutations.push(
        patch(row.id, set, row.returns ? [...unset, 'hiddenAt'] : unset),
      );
    }
  }
  for (const { id } of plan.hides) {
    mutations.push(patch(id, { hiddenAt: now.toISOString() }, []));
  }
  return mutations;
}

export interface PreviewRequest {
  file: Uint8Array;
  options: PlanOptions;
}

export type PreviewResult =
  | { status: 'not-ready' }
  | { status: 'unreadable'; error: ParseCsvError; message: string }
  | { status: 'rejected'; plan: ImportPlan }
  | { status: 'ready'; plan: ImportPlan };

export interface ImportRequest extends PreviewRequest, ChangeContext {
  /** The token of the preview that an editor confirmed. The feed sends none. */
  token?: string;
}

export type ImportResult =
  | Exclude<PreviewResult, { status: 'ready' }>
  | { status: 'stale'; plan: ImportPlan }
  | { status: 'busy' }
  | {
      status: 'applied';
      plan: ImportPlan;
      backupId: string | null;
      problems: ChangeProblem[];
    };

function readFile(file: Uint8Array) {
  const parsed = parseCsv(file);
  return parsed.ok
    ? { ok: true as const, rows: validateRows(parsed.rows) }
    : parsed;
}

/** The starter load counts as done once any map project has a Plant ID (AC-4.12). */
export const starterLoadDone = (
  projects: readonly Pick<CurrentProject, 'plantId'>[],
) => projects.some(({ plantId }) => Boolean(plantId));

/**
 * Checks a file against the current projects in the routes' reply order: not ready (503), then
 * unreadable or rejected (422), then stale when a preview token no longer matches.
 */
function check(
  projects: readonly CurrentProject[],
  { file, options, token }: PreviewRequest & { token?: string },
  read: ReturnType<typeof readFile>,
): PreviewResult | { status: 'stale'; plan: ImportPlan } {
  if (!starterLoadDone(projects)) return { status: 'not-ready' };
  if (!read.ok) {
    return { status: 'unreadable', error: read.error, message: read.message };
  }
  const plan = planImport({ projects, file, rows: read.rows, options });
  if (plan.rejection) return { status: 'rejected', plan };
  if (token !== undefined && token !== plan.token) {
    return { status: 'stale', plan };
  }
  return { status: 'ready', plan };
}

/** Plans a manual import without writing. Its token lets `applyImport` apply exactly this plan. */
export async function previewImport(
  client: MapProjectsClient,
  request: PreviewRequest,
): Promise<PreviewResult> {
  const result = check(
    await readProjects(client),
    { file: request.file, options: request.options },
    readFile(request.file),
  );
  if (result.status === 'stale') throw new Error('A preview has no token.');
  return result;
}

/**
 * Applies a feed file or a confirmed manual import (FR-007, AC-4.4). The checks run once before
 * the lock, so a file that isn't ready or is rejected gets that reply even while another change
 * runs. They run again under the lock on a fresh read, which the writes then follow.
 */
export async function applyImport(
  client: MapProjectsClient,
  request: ImportRequest,
): Promise<ImportResult> {
  const now = request.now ?? new Date();
  const read = readFile(request.file);

  const first = check(await readProjects(client), request, read);
  if (first.status !== 'ready') return first;

  const change = await runChange(client, { ...request, now }, (projects) => {
    const result = check(projects, request, read);
    return {
      mutations:
        result.status === 'ready'
          ? importMutations(result.plan, projects, now)
          : [],
      value: result,
    };
  });
  if (change.status === 'busy') return change;
  const { value, backupId, problems } = change;
  if (value.status !== 'ready') return value;
  return { status: 'applied', plan: value.plan, backupId, problems };
}
