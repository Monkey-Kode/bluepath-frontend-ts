import type { Mutation } from '@sanity/client';

import type { Casestudies } from '@/sanity.types';

import {
  type ChangeContext,
  type ChangeProblem,
  runChange,
  writable,
} from './apply';
import { displayName, locationOf } from './display';
import { linkChanges } from './plan';
import { type LinkedDocument, readLinks, readVariants } from './remove';
import { type MapProjectsClient, readProjects } from './store';

/**
 * Links a website-only project to the plant that BlueIQ added for it (AC-4.15, D-37). The project
 * keeps its record and gains the plant's Plant ID. The plant's separate project goes. Later files
 * then update the project like any merged project.
 */

export interface LinkableProject {
  id: string;
  name: string;
  /** The city and state, so an editor can tell two projects with one name apart. */
  location: string | null;
}

export interface LinkablePlant {
  id: string;
  plantId: string;
  name: string;
  /** When the plant left BlueIQ's file, or null when it is on the map. */
  hiddenAt: string | null;
}

export interface LinkOptions {
  projects: LinkableProject[];
  plants: LinkablePlant[];
}

export interface LinkedPlant {
  id: string;
  plantId: string;
  name: string;
}

type Refusal =
  /** The project or the plant is missing or no longer fits, so nothing changed. */
  | { status: 'refused'; reason: 'project' | 'plant' }
  /** Documents link to the plant's separate project, so nothing changed. */
  | {
      status: 'refused';
      reason: 'case-studies';
      plant: LinkedPlant;
      caseStudies: LinkedDocument[];
    };

interface Linked {
  status: 'linked';
  /** The project's name from before the link. */
  project: { id: string; name: string };
  plant: LinkedPlant;
}

export type LinkResult =
  | { status: 'busy' }
  | Refusal
  | (Linked & { backupId: string | null; problems: ChangeProblem[] });

/** A website-only project has a Website ID and no Plant ID. */
const isWebsiteOnly = (project: Casestudies) =>
  Boolean(project.websiteId) && !project.plantId;

/** A plant without a website project has a Plant ID and no Website ID. */
const isPlant = (
  project: Casestudies,
): project is Casestudies & { plantId: string } =>
  Boolean(project.plantId) && !project.websiteId;

const byName = (
  a: { id: string; name: string },
  b: { id: string; name: string },
) => a.name.localeCompare(b.name);

const plantOf = (plant: Casestudies & { plantId: string }): LinkedPlant => ({
  id: plant._id,
  plantId: plant.plantId,
  name: displayName(plant),
});

/** The projects and plants that an editor can link, each by name. Ties keep the read's ID order. */
export async function listLinkOptions(
  client: MapProjectsClient,
): Promise<LinkOptions> {
  const projects = await readProjects(client);
  return {
    projects: projects
      .filter(isWebsiteOnly)
      .map((project) => ({
        id: project._id,
        name: displayName(project),
        location: locationOf(project),
      }))
      .sort(byName),
    plants: projects
      .filter(isPlant)
      .map((plant) => ({ ...plantOf(plant), hiddenAt: plant.hiddenAt ?? null }))
      .sort(byName),
  };
}

export interface LinkRequest extends Omit<ChangeContext, 'source'> {
  /** The website-only project's ID. */
  project: string;
  /** The plant's project ID, such as `plant-P-7`. */
  plant: string;
}

/**
 * Links the project to the plant under the change lock, after a backup of every project. One
 * transaction patches the project and deletes the plant's separate project with its drafts, so a
 * failed write leaves both as they were. A hidden plant hides the project from the same date.
 * @throws ChangeFailure when the backup or the write fails.
 */
export async function linkProject(
  client: MapProjectsClient,
  { project: projectId, plant: plantId, ...context }: LinkRequest,
): Promise<LinkResult> {
  const change = await runChange<Refusal | Linked>(
    client,
    { ...context, source: { kind: 'link' } },
    async (projects) => {
      const refuse = (value: Refusal) => ({ mutations: [], value });
      const project = projects.find(({ _id }) => _id === projectId);
      const plant = projects.find(({ _id }) => _id === plantId);
      if (!project || !isWebsiteOnly(project)) {
        return refuse({ status: 'refused', reason: 'project' });
      }
      if (!plant || !isPlant(plant)) {
        return refuse({ status: 'refused', reason: 'plant' });
      }
      const caseStudies =
        (await readLinks(client, [plant._id])).get(plant._id) ?? [];
      if (caseStudies.length > 0) {
        return refuse({
          status: 'refused',
          reason: 'case-studies',
          plant: plantOf(plant),
          caseStudies,
        });
      }

      const { set, unset } = writable(linkChanges(project, plant));
      set.plantId = plant.plantId;
      if (plant.hiddenAt) set.hiddenAt = plant.hiddenAt;
      else if (project.hiddenAt) unset.push('hiddenAt');
      const variants = await readVariants(client, [plant._id]);
      const mutations: Mutation[] = [
        {
          patch: {
            id: project._id,
            ifRevisionID: project._rev,
            set,
            ...(unset.length > 0 && { unset }),
          },
        },
        ...variants.map((id) => ({ delete: { id } })),
        { delete: { id: plant._id } },
      ];
      const value: Linked = {
        status: 'linked',
        project: { id: project._id, name: displayName(project) },
        plant: plantOf(plant),
      };
      return { mutations, value };
    },
  );
  if (change.status === 'busy') return change;
  const { value, backupId, problems } = change;
  return value.status === 'linked' ? { ...value, backupId, problems } : value;
}
