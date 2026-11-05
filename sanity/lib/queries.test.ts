import { evaluate, parse } from 'groq-js';
import { describe, expect, it } from 'vitest';
import type {
  AllCaseStudiesQueryResult,
  CaseStudy,
  CaseStudyBySlugQueryResult,
  Casestudies,
} from '@/sanity.types';
import { allCaseStudiesQuery, caseStudyBySlugQuery } from './queries';

const system = {
  _createdAt: '2026-01-01T00:00:00Z',
  _updatedAt: '2026-01-01T00:00:00Z',
  _rev: 'rev-1',
};

// Another project sits first, so a query that reads any project instead of the referenced one fails.
const otherProject: Casestudies = {
  _id: 'project-other',
  _type: 'casestudies',
  ...system,
  plantName: 'Fresno Retrofit',
  projectType: 'Energy Efficiency',
  technologies: ['LED lighting'],
  city: 'Fresno',
  state: 'California',
};

const project: Casestudies = {
  _id: 'project-lincoln',
  _type: 'casestudies',
  ...system,
  plantName: 'Lincoln Solar',
  projectType: 'Solar',
  technologies: ['Solar PV'],
  city: 'Lincoln',
  state: 'Nebraska',
};

const caseStudy: CaseStudy = {
  _id: 'case-study-lincoln',
  _type: 'caseStudy',
  ...system,
  project: { _type: 'reference', _ref: project._id },
  title: 'Lincoln goes solar',
  slug: { _type: 'slug', current: 'lincoln-solar' },
  publishedAt: '2026-10-01T00:00:00Z',
};

async function run<Result>(
  query: string,
  dataset: unknown[],
  params: Record<string, unknown> = {},
): Promise<Result> {
  const value = await evaluate(parse(query, { params }), { dataset, params });
  return (await value.get()) as Result;
}

/** The project fields that the archive card and the case study page show. */
async function projectsShown(projectNow: Casestudies) {
  const dataset = [otherProject, projectNow, caseStudy];
  const archive = await run<AllCaseStudiesQueryResult>(
    allCaseStudiesQuery,
    dataset,
  );
  const page = await run<CaseStudyBySlugQueryResult>(
    caseStudyBySlugQuery,
    dataset,
    { slug: 'lincoln-solar' },
  );
  return { card: archive[0]?.project, page: page?.project };
}

describe('case study queries (AC-6.4)', () => {
  it("show the project's current name, category, and location", async () => {
    expect(await projectsShown(project)).toEqual({
      card: {
        plantName: 'Lincoln Solar',
        projectName: null,
        title: null,
        projectType: 'Solar',
        technologies: ['Solar PV'],
        city: 'Lincoln',
        state: 'Nebraska',
      },
      page: {
        plantName: 'Lincoln Solar',
        projectName: null,
        title: null,
        projectType: 'Solar',
        technologies: ['Solar PV'],
        city: 'Lincoln',
        state: 'Nebraska',
      },
    });
  });

  it('follow a change to the project with no edit to the case study', async () => {
    const changed: Casestudies = {
      ...project,
      plantName: 'Lincoln Solar Farm',
      projectName: 'Lincoln Community Energy',
      projectType: 'Solar + BESS',
      technologies: ['Solar PV', 'Battery storage'],
      city: 'Council Bluffs',
      state: 'Iowa',
    };
    const expected = {
      plantName: 'Lincoln Solar Farm',
      projectName: 'Lincoln Community Energy',
      title: null,
      projectType: 'Solar + BESS',
      technologies: ['Solar PV', 'Battery storage'],
      city: 'Council Bluffs',
      state: 'Iowa',
    };
    expect(await projectsShown(changed)).toEqual({
      card: expected,
      page: expected,
    });
  });
});
