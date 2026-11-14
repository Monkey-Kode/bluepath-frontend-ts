import type { Mutation } from '@sanity/client';

import type { Casestudies } from '@/sanity.types';

import { type BackupSource, pruneBackups, saveBackup } from './backups';
import { releaseLock, takeLock } from './lock';
import { type ParseCsvError, parseCsv } from './parseCsv';
import {
  type CurrentProject,
  type ImportPlan,
  type PlanOptions,
  planImport,
  planStarterLoad,
  type StarterValues,
} from './plan';
import {
  COMMIT_LIMITS,
  type CommitLimits,
  commit,
  type MapProjectsClient,
  readProjects,
} from './store';
import { validateRows, validateStarterRows } from './validate';

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

  /** A change that a rerun can't finish passes its own message for a failed write. */
  constructor(stage: 'backup' | 'write', cause: unknown, message?: string) {
    super(
      message ??
        (stage === 'backup'
          ? 'The backup failed, so nothing changed.'
          : 'A write failed partway. Running the same change again finishes it.'),
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
export function writable(fields: Partial<StarterValues>) {
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

/** A file's checks after the mode's own first check. */
type FileCheck =
  | { status: 'unreadable'; error: ParseCsvError; message: string }
  | { status: 'rejected'; plan: ImportPlan }
  | { status: 'stale'; plan: ImportPlan }
  | { status: 'ready'; plan: ImportPlan };

type PreviewCheck = Exclude<FileCheck, { status: 'stale' }>;

export type PreviewResult = { status: 'not-ready' } | PreviewCheck;

export interface ImportRequest extends PreviewRequest, ChangeContext {
  /** The token of the preview that an editor confirmed. The feed sends none. */
  token?: string;
}

interface Applied {
  status: 'applied';
  plan: ImportPlan;
  backupId: string | null;
  problems: ChangeProblem[];
}

type ApplyCheck = Exclude<FileCheck, { status: 'ready' }> | { status: 'busy' };

export type ImportResult = { status: 'not-ready' } | ApplyCheck | Applied;

export interface StarterPreviewRequest {
  file: Uint8Array;
}

/** The load replies `loaded` once it has run, and never `not-ready`. */
export type StarterPreviewResult = { status: 'loaded' } | PreviewCheck;

export interface StarterLoadRequest
  extends StarterPreviewRequest,
    ChangeContext {
  /** The token of the preview that an editor confirmed. */
  token: string;
}

export type StarterLoadResult = { status: 'loaded' } | ApplyCheck | Applied;

/** The starter load counts as done once any map project has a Plant ID (AC-4.12). */
export const starterLoadDone = (
  projects: readonly Pick<CurrentProject, 'plantId'>[],
) => projects.some(({ plantId }) => Boolean(plantId));

type Gate = { status: 'not-ready' } | { status: 'loaded' };

interface Mode<G extends Gate> {
  /** The mode's reply before any file check, or null when the mode is open. */
  gate: (projects: readonly CurrentProject[]) => G | null;
  /** The file's parse error, or a plan for the projects of the moment. */
  read:
    | { ok: true; plan: (projects: readonly CurrentProject[]) => ImportPlan }
    | { ok: false; error: ParseCsvError; message: string };
}

const NOT_READY = { status: 'not-ready' } as const;
const LOADED = { status: 'loaded' } as const;

/** Imports open once the starter load has run (AC-4.12). */
function importMode(
  file: Uint8Array,
  options: PlanOptions,
): Mode<typeof NOT_READY> {
  const parsed = parseCsv(file);
  const rows = parsed.ok ? validateRows(parsed.rows) : [];
  return {
    gate: (projects) => (starterLoadDone(projects) ? null : NOT_READY),
    read: parsed.ok
      ? {
          ok: true,
          plan: (projects) => planImport({ projects, file, rows, options }),
        }
      : parsed,
  };
}

/** The starter load runs only while no map project has a Plant ID (AC-8.7). */
function starterMode(file: Uint8Array): Mode<typeof LOADED> {
  const parsed = parseCsv(file, { starter: true });
  const rows = parsed.ok ? validateStarterRows(parsed.rows) : [];
  return {
    gate: (projects) => (starterLoadDone(projects) ? LOADED : null),
    read: parsed.ok
      ? {
          ok: true,
          plan: (projects) => planStarterLoad({ projects, file, rows }),
        }
      : parsed,
  };
}

/**
 * Checks a file against the current projects in the routes' reply order: the mode's gate (503 or
 * 409), then unreadable or rejected (422), then stale when a preview token no longer matches.
 */
function check<G extends Gate>(
  projects: readonly CurrentProject[],
  { gate, read }: Mode<G>,
  token?: string,
): G | FileCheck {
  const closed = gate(projects);
  if (closed) return closed;
  if (!read.ok) {
    return { status: 'unreadable', error: read.error, message: read.message };
  }
  const plan = read.plan(projects);
  if (plan.rejection) return { status: 'rejected', plan };
  if (token !== undefined && token !== plan.token) {
    return { status: 'stale', plan };
  }
  return { status: 'ready', plan };
}

async function preview<G extends Gate>(
  client: MapProjectsClient,
  mode: Mode<G>,
): Promise<G | PreviewCheck> {
  const result = check(await readProjects(client), mode);
  if (result.status === 'stale') throw new Error('A preview has no token.');
  return result;
}

/**
 * The checks run once before the lock, so a file that the mode refuses or that is rejected gets
 * that reply even while another change runs. They run again under the lock on a fresh read, which
 * the writes then follow.
 */
async function apply<G extends Gate>(
  client: MapProjectsClient,
  mode: Mode<G>,
  request: ChangeContext & { token?: string },
): Promise<G | ApplyCheck | Applied> {
  const now = request.now ?? new Date();

  const first = check(await readProjects(client), mode, request.token);
  if (first.status !== 'ready') return first;

  const change = await runChange(client, { ...request, now }, (projects) => {
    const result = check(projects, mode, request.token);
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

/** Plans a manual import without writing. Its token lets `applyImport` apply exactly this plan. */
export function previewImport(
  client: MapProjectsClient,
  { file, options }: PreviewRequest,
): Promise<PreviewResult> {
  return preview(client, importMode(file, options));
}

/** Applies a feed file or a confirmed manual import (FR-007, AC-4.4). */
export function applyImport(
  client: MapProjectsClient,
  request: ImportRequest,
): Promise<ImportResult> {
  return apply(client, importMode(request.file, request.options), request);
}

/** Plans the starter load without writing (AC-8.7). */
export function previewStarterLoad(
  client: MapProjectsClient,
  { file }: StarterPreviewRequest,
): Promise<StarterPreviewResult> {
  return preview(client, starterMode(file));
}

/**
 * Applies the confirmed starter load (AC-8.7). Its first written Plant ID ends the load, so a
 * rerun can't finish a partial write. Restoring the load's backup removes every Plant ID again.
 */
export async function applyStarterLoad(
  client: MapProjectsClient,
  request: StarterLoadRequest,
): Promise<StarterLoadResult> {
  try {
    return await apply(client, starterMode(request.file), request);
  } catch (error) {
    if (!(error instanceof ChangeFailure) || error.stage !== 'write') {
      throw error;
    }
    throw new ChangeFailure(
      'write',
      error.cause,
      'A write failed partway, so the load is incomplete. Restore the backup that the load saved, then run the load again.',
    );
  }
}
