import type { Mutation } from '@sanity/client';
import { getPublishedId } from '@sanity/client/csm';

import type { Casestudies } from '@/sanity.types';

import { type ChangeContext, type ChangeProblem, runChange } from './apply';
import { displayName } from './display';
import { type ProjectRef, refOf } from './plan';
import type { MapProjectsClient } from './store';

/**
 * Lists the map projects that left BlueIQ's file, and deletes the ones an editor picks (FR-013,
 * AC-4.14). A delete never touches a project that any document links to, drafts included.
 */

/** A document that links to a hidden project, usually a case study. */
export interface LinkedDocument {
  /** The published ID, even when only a draft links. */
  id: string;
  /** The title, else the slug. */
  title: string | null;
  /** False when only a draft or a release version links. */
  published: boolean;
}

export interface HiddenProject extends ProjectRef {
  /** When the project left BlueIQ's file, as an ISO time. */
  hiddenAt: string;
  caseStudies: LinkedDocument[];
}

export type RemoveRefusal =
  | { id: string; reason: 'not-found' }
  /** The project is on the map, so an editor can't delete it. */
  | { id: string; reason: 'shown'; name: string }
  | {
      id: string;
      reason: 'linked';
      name: string;
      caseStudies: LinkedDocument[];
    };

export interface RemovedProject {
  id: string;
  name: string;
}

export type RemoveResult =
  | { status: 'busy' }
  /** Some projects can't go, so nothing changed. */
  | { status: 'refused'; refused: RemoveRefusal[] }
  | {
      status: 'deleted';
      deleted: RemovedProject[];
      backupId: string | null;
      problems: ChangeProblem[];
    };

type HiddenRow = Pick<
  Casestudies,
  '_id' | 'plantId' | 'plantName' | 'projectName' | 'title'
> & { hiddenAt: string };

/**
 * The documents that link to each project, drafts and release versions included. The client
 * reads published documents by default, so this read asks for every variant.
 */
export async function readLinks(
  client: MapProjectsClient,
  ids: readonly string[],
) {
  const links = new Map<string, LinkedDocument[]>();
  if (ids.length === 0) return links;
  const rows = await client.fetch<
    { _id: string; links: { _id: string; title: string | null }[] }[]
  >(
    '*[_id in $ids]{ _id, "links": *[references(^._id)]{ _id, "title": coalesce(title, slug.current) } }',
    { ids },
    { perspective: 'raw' },
  );
  for (const row of rows) {
    const byId = new Map<string, LinkedDocument>();
    for (const link of row.links) {
      const id = getPublishedId(link._id);
      const published = id === link._id;
      const seen = byId.get(id);
      // The published copy's title wins over a draft's.
      if (!seen || (published && !seen.published)) {
        byId.set(id, { id, title: link.title, published });
      }
    }
    links.set(
      row._id,
      [...byId.values()].sort((a, b) => (a.id < b.id ? -1 : 1)),
    );
  }
  return links;
}

/** Every hidden map project with the documents that link to it, newest first. */
export async function listHidden(
  client: MapProjectsClient,
): Promise<HiddenProject[]> {
  const rows = await client.fetch<HiddenRow[]>(
    '*[_type == "casestudies" && defined(hiddenAt)] | order(hiddenAt desc, _id) { _id, plantId, plantName, projectName, title, hiddenAt }',
  );
  const links = await readLinks(
    client,
    rows.map(({ _id }) => _id),
  );
  return rows.map((row) => ({
    ...refOf(row),
    hiddenAt: row.hiddenAt,
    caseStudies: links.get(row._id) ?? [],
  }));
}

/** The drafts and release versions of these projects. */
export async function readVariants(
  client: MapProjectsClient,
  ids: readonly string[],
) {
  const wanted = new Set(ids);
  const variants = await client.fetch<string[]>(
    '*[_type == "casestudies" && (_id in path("drafts.*") || _id in path("versions.*.*"))]._id',
    {},
    { perspective: 'raw' },
  );
  return variants.filter((id) => wanted.has(getPublishedId(id)));
}

export interface RemoveRequest extends Omit<ChangeContext, 'source'> {
  ids: readonly string[];
}

/**
 * Deletes the chosen hidden projects under the change lock, after a backup of every project. If
 * any chosen project is missing, on the map, or linked, it deletes nothing. The pane then shows a
 * fresh list. Each project's drafts and release versions go before it, so a failed write leaves
 * the project to delete again.
 * @throws ChangeFailure when the backup or a delete fails.
 */
export async function removeHidden(
  client: MapProjectsClient,
  { ids, ...context }: RemoveRequest,
): Promise<RemoveResult> {
  const chosen = [...new Set(ids)];
  const change = await runChange(
    client,
    { ...context, source: { kind: 'delete' } },
    async (projects) => {
      const byId = new Map(projects.map((project) => [project._id, project]));
      const links = await readLinks(
        client,
        chosen.filter((id) => byId.has(id)),
      );
      const refused: RemoveRefusal[] = [];
      const deleted: RemovedProject[] = [];
      for (const id of chosen) {
        const project = byId.get(id);
        if (!project) {
          refused.push({ id, reason: 'not-found' });
          continue;
        }
        const name = displayName(project);
        const caseStudies = links.get(id) ?? [];
        if (!project.hiddenAt) refused.push({ id, reason: 'shown', name });
        else if (caseStudies.length > 0) {
          refused.push({ id, reason: 'linked', name, caseStudies });
        } else deleted.push({ id, name });
      }
      if (refused.length > 0 || deleted.length === 0) {
        return { mutations: [], value: { refused, deleted: [] } };
      }

      const variants = await readVariants(
        client,
        deleted.map(({ id }) => id),
      );
      const mutations: Mutation[] = deleted.flatMap(({ id }) => [
        ...variants
          .filter((variant) => getPublishedId(variant) === id)
          .map((variant) => ({ delete: { id: variant } })),
        { delete: { id } },
      ]);
      return { mutations, value: { refused, deleted } };
    },
  );
  if (change.status === 'busy') return change;
  const { value, backupId, problems } = change;
  if (value.refused.length > 0) {
    return { status: 'refused', refused: value.refused };
  }
  return { status: 'deleted', deleted: value.deleted, backupId, problems };
}
