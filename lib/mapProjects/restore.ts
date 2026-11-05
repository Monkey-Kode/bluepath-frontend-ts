import { createHash } from 'node:crypto';

import type { Mutation } from '@sanity/client';

import type { Casestudies } from '@/sanity.types';

import {
  type ChangeContext,
  type ChangeProblem,
  runChange,
  starterLoadDone,
} from './apply';
import { type ListedBackup, listedBackup, loadBackup } from './backups';
import { COLUMN_KEYS } from './columns';
import { displayName } from './display';
import { type LinkedDocument, readLinks, readVariants } from './remove';
import { type MapProjectsClient, readProjects } from './store';

/**
 * Puts the map projects back as a backup recorded them (FR-008, AC-7.3). A preview names every
 * change first, and its token lets the restore write exactly that plan. Projects added since the
 * backup go, except the ones that a case study links to. Those stay hidden instead.
 */

export interface RestoreProject {
  id: string;
  plantId: string | null;
  name: string;
}

export interface RestoreUpdate extends RestoreProject {
  /** The fields that change back, in the starter workbook's order. */
  fields: string[];
}

/** A project added since the backup that a case study links to. */
export interface RestoreKeep extends RestoreProject {
  caseStudies: LinkedDocument[];
  /** False when the project is already hidden, so the restore leaves it alone. */
  hides: boolean;
}

export interface RestorePlan {
  backup: ListedBackup;
  /** Each group sorts by name. Names come from the copy that stays. */
  updates: RestoreUpdate[];
  /** Projects that went after the backup, which come back. */
  creates: RestoreProject[];
  /** Projects added since the backup, which go with their drafts. */
  deletes: RestoreProject[];
  keeps: RestoreKeep[];
  counts: {
    updated: number;
    created: number;
    deleted: number;
    kept: number;
    unchanged: number;
  };
  /** True when the restore would write anything. */
  writes: boolean;
  /** True when the restore removes every Plant ID, so the starter load runs again (AC-4.12). */
  starterLoad: boolean;
  /** Covers the backup, each project's `_rev`, and the projects that stay. */
  token: string;
}

export type RestorePreview =
  | { status: 'missing' }
  | { status: 'ready'; plan: RestorePlan };

export interface RestoreRequest extends Omit<ChangeContext, 'source'> {
  /** The backup's ID. */
  id: string;
  /** The token of the preview that an editor confirmed. */
  token: string;
}

export type RestoreResult =
  | { status: 'missing' }
  | { status: 'busy' }
  /** The projects changed after the preview, so nothing changed. */
  | { status: 'stale'; plan: RestorePlan }
  | {
      status: 'restored';
      plan: RestorePlan;
      /** The backup of the projects from before the restore, or null when nothing changed. */
      backupId: string | null;
      problems: ChangeProblem[];
    };

/** Sanity sets these on each write, so a restore neither compares nor writes them. */
const SYSTEM_FIELDS = new Set([
  '_id',
  '_type',
  '_rev',
  '_createdAt',
  '_updatedAt',
]);

/** The starter workbook's order, with one location for both coordinates, then the website's own. */
const FIELD_ORDER = [
  ...new Set<string>(
    COLUMN_KEYS.map((key) =>
      key === 'latitude' || key === 'longitude' ? 'location' : key,
    ),
  ),
  'title',
  'hiddenAt',
  'content',
  'image',
];

const rank = (field: string) => {
  const index = FIELD_ORDER.indexOf(field);
  return index === -1 ? FIELD_ORDER.length : index;
};

/** Known fields in order, then any others alphabetically. */
const byFieldOrder = (a: string, b: string) =>
  rank(a) - rank(b) || (a < b ? -1 : a > b ? 1 : 0);

type Fields = Record<string, unknown>;

const fieldsOf = (project: Casestudies): Fields =>
  Object.fromEntries(
    Object.entries(project).filter(([field]) => !SYSTEM_FIELDS.has(field)),
  );

/** JSON with sorted keys, so the same value with its keys in another order compares equal. */
function canonical(value: unknown): string | undefined {
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value).sort(([a], [b]) =>
      a < b ? -1 : a > b ? 1 : 0,
    );
    return `{${entries.map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

/** The fields whose values differ, including fields that only one copy has. */
function changedFields(recorded: Fields, current: Fields) {
  const fields = new Set([...Object.keys(recorded), ...Object.keys(current)]);
  return [...fields]
    .filter((field) => canonical(recorded[field]) !== canonical(current[field]))
    .sort(byFieldOrder);
}

const summaryOf = (project: Casestudies): RestoreProject => ({
  id: project._id,
  plantId: project.plantId ?? null,
  name: displayName(project),
});

const byName = (a: RestoreProject, b: RestoreProject) =>
  a.name.localeCompare(b.name);

function restoreToken(
  backup: ListedBackup,
  current: readonly Casestudies[],
  keeps: readonly RestoreKeep[],
) {
  const revisions = current
    .map(({ _id, _rev }) => [_id, _rev])
    .sort(([a = ''], [b = '']) => (a < b ? -1 : a > b ? 1 : 0));
  const kept = keeps.map(({ id }) => id).sort();
  return createHash('sha256')
    .update(JSON.stringify({ backup: backup.id, revisions, kept }))
    .digest('hex');
}

/** Compares the backup's projects with the current ones. It reads which added projects are linked. */
async function planRestore(
  client: MapProjectsClient,
  backup: ListedBackup,
  recorded: readonly Casestudies[],
  current: readonly Casestudies[],
): Promise<RestorePlan> {
  const currentById = new Map(current.map((project) => [project._id, project]));
  const recordedIds = new Set(recorded.map(({ _id }) => _id));
  const added = current.filter(({ _id }) => !recordedIds.has(_id));
  const links = await readLinks(
    client,
    added.map(({ _id }) => _id),
  );

  const updates: RestoreUpdate[] = [];
  const creates: RestoreProject[] = [];
  let unchanged = 0;
  for (const project of recorded) {
    const now = currentById.get(project._id);
    if (!now) {
      creates.push(summaryOf(project));
      continue;
    }
    const fields = changedFields(fieldsOf(project), fieldsOf(now));
    if (fields.length === 0) unchanged += 1;
    else updates.push({ ...summaryOf(project), fields });
  }

  const deletes: RestoreProject[] = [];
  const keeps: RestoreKeep[] = [];
  const kept: Casestudies[] = [];
  for (const project of added) {
    const caseStudies = links.get(project._id) ?? [];
    if (caseStudies.length === 0) {
      deletes.push(summaryOf(project));
      continue;
    }
    keeps.push({
      ...summaryOf(project),
      caseStudies,
      hides: !project.hiddenAt,
    });
    kept.push(project);
  }

  const hides = keeps.filter((keep) => keep.hides).length;
  return {
    backup,
    updates: updates.sort(byName),
    creates: creates.sort(byName),
    deletes: deletes.sort(byName),
    keeps: keeps.sort(byName),
    counts: {
      updated: updates.length,
      created: creates.length,
      deleted: deletes.length,
      kept: keeps.length,
      unchanged,
    },
    writes: updates.length + creates.length + deletes.length + hides > 0,
    starterLoad:
      starterLoadDone(current) && !starterLoadDone([...recorded, ...kept]),
    token: restoreToken(backup, current, keeps),
  };
}

/**
 * The writes for a plan: updates, creates, hides, then deletes, with each delete's drafts first.
 * Each patch carries the project's `_rev` as `ifRevisionID`, so a project that changed after the
 * read fails the write instead of losing that change.
 */
async function restoreMutations(
  client: MapProjectsClient,
  plan: RestorePlan,
  recorded: readonly Casestudies[],
  current: readonly Casestudies[],
  now: Date,
): Promise<Mutation[]> {
  const recordedById = new Map(
    recorded.map((project) => [project._id, project]),
  );
  const revisions = new Map(current.map(({ _id, _rev }) => [_id, _rev]));
  const savedFields = (id: string) => {
    const project = recordedById.get(id);
    if (!project) throw new Error(`The backup has no project ${id}.`);
    return { type: project._type, fields: fieldsOf(project) };
  };

  const mutations: Mutation[] = [];
  for (const { id, fields } of plan.updates) {
    const saved = savedFields(id).fields;
    const set: Fields = {};
    const unset: string[] = [];
    for (const field of fields) {
      if (field in saved) set[field] = saved[field];
      else unset.push(field);
    }
    mutations.push({
      patch: {
        id,
        ifRevisionID: revisions.get(id),
        ...(Object.keys(set).length > 0 && { set }),
        ...(unset.length > 0 && { unset }),
      },
    });
  }
  for (const { id } of plan.creates) {
    const { type, fields } = savedFields(id);
    mutations.push({ create: { _id: id, _type: type, ...fields } });
  }
  for (const { id, hides } of plan.keeps) {
    if (!hides) continue;
    mutations.push({
      patch: {
        id,
        ifRevisionID: revisions.get(id),
        set: { hiddenAt: now.toISOString() },
      },
    });
  }
  const ids = plan.deletes.map(({ id }) => id);
  for (const variant of await readVariants(client, ids)) {
    mutations.push({ delete: { id: variant } });
  }
  for (const id of ids) mutations.push({ delete: { id } });
  return mutations;
}

/** Plans a restore without writing. Its token lets `restoreBackup` write exactly this plan. */
export async function previewRestore(
  client: MapProjectsClient,
  id: string,
): Promise<RestorePreview> {
  const loaded = await loadBackup(client, id);
  if (!loaded) return { status: 'missing' };
  const plan = await planRestore(
    client,
    listedBackup(loaded.backup),
    loaded.projects,
    await readProjects(client),
  );
  return { status: 'ready', plan };
}

/**
 * Restores a backup under the change lock, after a backup of every current project (AC-7.3). It
 * plans again from a fresh read and writes only when the plan's token matches the preview's.
 * @throws ChangeFailure when the backup or a write fails.
 */
export async function restoreBackup(
  client: MapProjectsClient,
  { id, token, now = new Date(), ...context }: RestoreRequest,
): Promise<RestoreResult> {
  const loaded = await loadBackup(client, id);
  if (!loaded) return { status: 'missing' };
  const backup = listedBackup(loaded.backup);

  const change = await runChange(
    client,
    { ...context, now, source: { kind: 'restore', backupId: id } },
    async (current) => {
      const plan = await planRestore(client, backup, loaded.projects, current);
      if (plan.token !== token) {
        return { mutations: [], value: { stale: true, plan } };
      }
      const mutations = await restoreMutations(
        client,
        plan,
        loaded.projects,
        current,
        now,
      );
      return { mutations, value: { stale: false, plan } };
    },
  );
  if (change.status === 'busy') return change;
  const { value, backupId, problems } = change;
  if (value.stale) return { status: 'stale', plan: value.plan };
  return { status: 'restored', plan: value.plan, backupId, problems };
}
