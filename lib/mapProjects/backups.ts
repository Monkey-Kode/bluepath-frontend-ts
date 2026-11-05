import { gunzipSync, gzipSync } from 'node:zlib';

import type { Casestudies } from '@/sanity.types';

import { commit, type MapProjectsClient } from './store';

export const BACKUP_TYPE = 'mapProjects.backup';
export const BACKUP_PART_TYPE = 'mapProjects.backupPart';

/** The person a feed backup records (AC-7.1). */
export const FEED_PERSON = 'BlueIQ feed';

/** The feed deletes its own backups once they are older than this (AC-7.4). */
export const FEED_BACKUP_DAYS = 90;

/**
 * Each part's share of the gzip+base64 data. One part plus its header stays well under Sanity's
 * 4 MB limit on a mutation body.
 */
const PART_CHARS = 3_000_000;

/** The change that saved the backup (AC-7.1). */
export type BackupSource =
  | { kind: 'feed' }
  | { kind: 'sheet'; url: string }
  | { kind: 'file'; name: string }
  | { kind: 'restore'; backupId: string }
  | { kind: 'link' }
  | { kind: 'delete' };

export interface BackupHeader {
  _id: string;
  createdAt: string;
  source: BackupSource;
  person: string;
  /** The number of map projects in the backup. */
  count: number;
  parts: number;
}

export interface SaveBackupInput {
  projects: readonly Casestudies[];
  source: BackupSource;
  person: string;
  now: Date;
}

/**
 * Saves every map project, whole, as gzip+base64 text split across part documents. Each part
 * writes in its own transaction, and the header writes with the last part. So a backup that fails
 * partway has no header and never lists. Its parts go at the feed's next prune.
 * @returns The backup's ID, `mapProjects.backup.<time>`. The dot keeps it out of public reads.
 */
export async function saveBackup(
  client: MapProjectsClient,
  { projects, source, person, now }: SaveBackupInput,
  { partChars = PART_CHARS }: { partChars?: number } = {},
) {
  const id = `mapProjects.backup.${now.toISOString().replace(/[-:.]/g, '')}`;
  const data = gzipSync(JSON.stringify(projects)).toString('base64');
  const parts = Math.ceil(data.length / partChars);
  const header: BackupHeader = {
    _id: id,
    createdAt: now.toISOString(),
    source,
    person,
    count: projects.length,
    parts,
  };

  for (let index = 0; index < parts; index += 1) {
    const part = {
      _id: `${id}.${index}`,
      _type: BACKUP_PART_TYPE,
      backup: id,
      index,
      data: data.slice(index * partChars, (index + 1) * partChars),
    };
    const last = index === parts - 1;
    await client.mutate([
      { create: part },
      ...(last ? [{ create: { ...header, _type: BACKUP_TYPE } }] : []),
    ]);
  }
  return id;
}

/**
 * Reads a backup's header and its projects.
 * @returns Null when no such backup exists. Throws when a part is missing.
 */
export async function loadBackup(client: MapProjectsClient, id: string) {
  const found = await client.fetch<{
    backup: BackupHeader | null;
    parts: { index: number; data: string }[];
  }>(
    `{
      "backup": *[_id == $id && _type == $type][0]{
        _id, createdAt, source, person, count, parts
      },
      "parts": *[_type == $partType && backup == $id] | order(index) { index, data }
    }`,
    { id, type: BACKUP_TYPE, partType: BACKUP_PART_TYPE },
  );
  const { backup, parts } = found;
  if (!backup) return null;
  if (
    parts.length !== backup.parts ||
    parts.some((part, index) => part.index !== index)
  ) {
    throw new Error(`The backup ${id} is incomplete.`);
  }
  const data = Buffer.from(parts.map((part) => part.data).join(''), 'base64');
  const projects = JSON.parse(gunzipSync(data).toString('utf8'));
  return { backup, projects: projects as Casestudies[] };
}

/**
 * Deletes the feed's backups older than 90 days, and parts that no backup lists (AC-7.4).
 * Editors' backups stay. Call it under the lock, so no backup is still saving its parts.
 * @returns The number of backups deleted.
 */
export async function pruneBackups(client: MapProjectsClient, now: Date) {
  const cutoff = new Date(
    now.getTime() - FEED_BACKUP_DAYS * 24 * 60 * 60 * 1000,
  ).toISOString();
  const { expired, headers, parts } = await client.fetch<{
    expired: string[];
    headers: string[];
    parts: { _id: string; backup: string | null }[];
  }>(
    `{
      "expired": *[_type == $type && source.kind == "feed" && createdAt < $cutoff]._id,
      "headers": *[_type == $type]._id,
      "parts": *[_type == $partType]{ _id, backup }
    }`,
    { type: BACKUP_TYPE, partType: BACKUP_PART_TYPE, cutoff },
  );
  const gone = new Set(expired);
  const kept = new Set(headers.filter((id) => !gone.has(id)));
  const loose = parts.filter(({ backup }) => !backup || !kept.has(backup));
  // Headers go first. If a later delete fails, the parts it leaves behind go at the next prune.
  await commit(
    client,
    [...expired, ...loose.map(({ _id }) => _id)].map((id) => ({
      delete: { id },
    })),
  );
  return expired.length;
}
