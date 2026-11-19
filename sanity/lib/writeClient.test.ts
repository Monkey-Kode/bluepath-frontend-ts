import { afterEach, describe, expect, it, vi } from 'vitest';

const TOKEN = 'test-write-token';

/** Loads a fresh copy of the module, because `api.ts` reads the dataset on import. */
async function load(env: Record<string, string | undefined>) {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_SANITY_PROJECT_ID', 'test-project');
  vi.stubEnv('SANITY_API_WRITE_TOKEN', TOKEN);
  for (const [name, value] of Object.entries(env)) vi.stubEnv(name, value);
  const { writeClient } = await import('./writeClient');
  return writeClient;
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe('writeClient (NFR-007)', () => {
  it.each([
    undefined,
    '',
    'dev',
    'deploy-preview',
    'branch-deploy',
  ])('refuses the production dataset when CONTEXT is %j', async (context) => {
    const writeClient = await load({
      NEXT_PUBLIC_SANITY_DATASET: 'production',
      CONTEXT: context,
    });
    expect(() => writeClient()).toThrow(/production dataset/);
  });

  it("writes to production in Netlify's production context", async () => {
    const writeClient = await load({
      NEXT_PUBLIC_SANITY_DATASET: 'production',
      CONTEXT: 'production',
    });
    expect(writeClient().config()).toMatchObject({
      projectId: 'test-project',
      dataset: 'production',
      token: TOKEN,
      useCdn: false,
    });
  });

  it.each([
    undefined,
    'branch-deploy',
  ])('writes to development when CONTEXT is %j', async (context) => {
    const writeClient = await load({
      NEXT_PUBLIC_SANITY_DATASET: 'development',
      CONTEXT: context,
    });
    expect(writeClient().config()).toMatchObject({
      dataset: 'development',
      token: TOKEN,
    });
  });

  it('loads without the token and refuses to write until it is set', async () => {
    const writeClient = await load({
      NEXT_PUBLIC_SANITY_DATASET: 'development',
      SANITY_API_WRITE_TOKEN: undefined,
    });
    expect(() => writeClient()).toThrow('Missing SANITY_API_WRITE_TOKEN');
  });
});
