// @vitest-environment node
import { randomBytes } from 'node:crypto';
import { inspect } from 'node:util';

import type { Mutation } from '@sanity/client';
import type { SanityClient } from 'next-sanity';
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  type MockInstance,
  vi,
} from 'vitest';

import { BACKUP_PART_TYPE } from '@/lib/mapProjects/backups';
import { COLUMN_KEYS, COLUMNS } from '@/lib/mapProjects/columns';
import { FEED_STATUS_ID } from '@/lib/mapProjects/feedStatus';
import { LOCK_ID } from '@/lib/mapProjects/lock';
import { MAX_FILE_BYTES } from '@/lib/mapProjects/parseCsv';
import type { MapProjectsClient } from '@/lib/mapProjects/store';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from '@/lib/mapProjects/testing/fakeSanity';
import { type Cells, csv } from '@/lib/mapProjects/testing/files';
import { writeClient } from '@/sanity/lib/writeClient';
import {
  type RouteServer,
  type SendOptions,
  send,
  serveRoute,
} from '@/test/http';

import * as route from './route';

vi.mock('@/sanity/lib/writeClient', () => ({ writeClient: vi.fn() }));

const PATH = '/api/blueiq/plants/';
const NOW = new Date('2026-11-04T12:00:00.000Z');
const KEY = randomBytes(32).toString('hex');
const WRONG_KEY = randomBytes(32).toString('hex');
/** Text that only the file holds. A log line, reply, or status that holds it repeats the file. */
const FILE_TEXT = 'Zebulon Quartz Array';

const plant = (
  n: number,
  fields: Partial<FakeDocument> = {},
): FakeDocument => ({
  _id: `plant-P-${n}`,
  _type: 'casestudies',
  plantId: `P-${n}`,
  plantName: `Plant ${n}`,
  projectType: 'Solar',
  ...fields,
});

/** Three shown plants. The file below hides P-3. */
const PROJECTS = [plant(1), plant(2), plant(3)];

/** A website-only project. It has no Plant ID. */
const WEBSITE_ONLY: FakeDocument = {
  _id: '7c1d-library',
  _type: 'casestudies',
  websiteId: '7c1d-library',
  projectName: 'Old Library',
};

const ROWS: Cells[] = [
  // Row 2 renames P-1 to the file-only text.
  { plantId: 'P-1', plantName: FILE_TEXT, projectType: 'Solar' },
  { plantId: 'P-2', plantName: 'Plant 2', projectType: 'BESS' },
  { plantId: 'P-6', plantName: 'Plant 6', projectType: 'Wind' },
  { plantId: 'P-7', plantName: 'Plant 7', projectType: 'Solar', size: 'lots' },
  // Row 6's Plant ID is not valid, so the reply must not repeat it.
  { plantId: FILE_TEXT, plantName: 'Plant 8', projectType: 'Solar' },
  { plantName: 'Plant 9', projectType: 'Solar' },
];
const FILE = csv(...ROWS);

/** A file with every required column but `key`. */
function csvWithout(key: string, row: Record<string, string>) {
  const keys = COLUMN_KEYS.filter(
    (column) => COLUMNS[column].presence !== 'starter' && column !== key,
  );
  return [
    keys.map((column) => COLUMNS[column].header).join(','),
    keys.map((column) => row[column] ?? '').join(','),
  ].join('\r\n');
}

let server: RouteServer;
let sanity: FakeSanity;
let logs: unknown[][];
let spies: MockInstance[];

beforeAll(async () => {
  server = await serveRoute(route);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  vi.stubEnv('BLUEIQ_FEED_KEY', KEY);
  sanity = fakeSanity(PROJECTS);
  vi.mocked(writeClient).mockReset();
  vi.mocked(writeClient).mockImplementation(
    () => sanity as unknown as SanityClient,
  );
  logs = [];
  spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args);
    }),
  );
});

afterEach(() => {
  for (const spy of spies) spy.mockRestore();
  vi.unstubAllEnvs();
  vi.useRealTimers();

  // NFR-007: no log line or recorded status repeats the key or the file.
  const logged = logs
    .map((args) =>
      args
        .map((arg) => (typeof arg === 'string' ? arg : inspect(arg)))
        .join(' '),
    )
    .join('\n');
  const recorded = JSON.stringify(sanity.get(FEED_STATUS_ID) ?? null);
  for (const text of [logged, recorded]) {
    expect(text).not.toContain(KEY);
    expect(text).not.toContain(WRONG_KEY);
    expect(text).not.toContain(FILE_TEXT);
  }
  expect(server.errors).toEqual([]);
});

/** Sends a request and checks that the reply never repeats the key or the file. */
async function call(options: SendOptions) {
  const reply = await send(`${server.url}${PATH}`, options);
  expect(reply.text).not.toContain(KEY);
  expect(reply.text).not.toContain(WRONG_KEY);
  expect(reply.text).not.toContain(FILE_TEXT);
  return {
    status: reply.status,
    headers: reply.headers,
    body: reply.text ? JSON.parse(reply.text) : null,
  };
}

/** Posts a file with the right key, as BlueIQ does. */
function post(
  file: Uint8Array | string = FILE,
  headers: Record<string, string> = {},
) {
  return call({
    body: file,
    headers: { 'content-type': 'text/csv', 'x-api-key': KEY, ...headers },
  });
}

const projects = () =>
  sanity.documents().filter(({ _type }) => _type === 'casestudies');

const status = () => sanity.get(FEED_STATUS_ID);

/** True when a transaction since `from` wrote a map project. */
const touchesProjects = (from = 0) =>
  sanity.transactions
    .slice(from)
    .some(({ mutations, failed }) =>
      mutations.some(
        (mutation) =>
          !failed &&
          (('create' in mutation && mutation.create._type === 'casestudies') ||
            ('patch' in mutation &&
              'id' in mutation.patch &&
              !String(mutation.patch.id).startsWith('mapProjects.'))),
      ),
    );

const bytes = (size: number, fill = ' ') =>
  new Uint8Array(size).fill(fill.charCodeAt(0));

describe('POST /api/blueiq/plants/', () => {
  it('applies the file and replies 200 with the counts and each skipped row (AC-4.9, D-38)', async () => {
    const reply = await post();

    expect(reply.status).toBe(200);
    expect(reply.headers['content-type']).toMatch(/^application\/json/);
    expect(reply.body).toEqual({
      result: 'applied',
      counts: {
        created: 1,
        updated: 2,
        unchanged: 0,
        skipped: 3,
        hidden: 1,
        returned: 0,
      },
      skipped: [
        {
          row: 5,
          plantId: 'P-7',
          reasons: [{ reason: 'bad-size', message: expect.any(String) }],
        },
        {
          row: 6,
          plantId: null,
          reasons: expect.arrayContaining([
            { reason: 'bad-plant-id', message: expect.any(String) },
          ]),
        },
        {
          row: 7,
          plantId: null,
          reasons: [{ reason: 'no-plant-id', message: expect.any(String) }],
        },
      ],
    });
    expect(projects().map(({ _id }) => _id)).toEqual([
      'plant-P-1',
      'plant-P-2',
      'plant-P-3',
      'plant-P-6',
    ]);
    expect(sanity.get('plant-P-3')?.hiddenAt).toBe(NOW.toISOString());
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it("records the reply as the feed's last file, with the time it was accepted (AC-4.13)", async () => {
    const reply = await post();

    expect(status()).toMatchObject({
      last: { receivedAt: NOW.toISOString(), status: 200, reply: reply.body },
      lastAcceptedAt: NOW.toISOString(),
    });
  });

  it('replies 200 with no changes when the file matches the site', async () => {
    await post();
    vi.setSystemTime(new Date(NOW.getTime() + 60_000));
    const writes = sanity.transactions.length;

    const reply = await post();

    expect(reply.status).toBe(200);
    expect(reply.body).toMatchObject({
      result: 'no-changes',
      counts: { created: 0, updated: 0, unchanged: 3, skipped: 3, hidden: 0 },
    });
    expect(touchesProjects(writes)).toBe(false);
    expect(status()?.last).toMatchObject({ status: 200 });
  });

  it('accepts text/csv with parameters and in any case', async () => {
    expect(
      (await post(FILE, { 'content-type': 'Text/CSV; charset=utf-8' })).status,
    ).toBe(200);
  });

  it('replies 405 with Allow: POST to any other method, before any other check (AC-4.9)', async () => {
    vi.stubEnv('BLUEIQ_FEED_KEY', '');

    for (const method of ['GET', 'PUT', 'PATCH', 'DELETE']) {
      const reply = await call({ method, headers: { 'x-api-key': WRONG_KEY } });

      expect(reply.status, method).toBe(405);
      expect(reply.headers.allow).toBe('POST');
      expect(reply.body).toEqual({
        error: 'method-not-allowed',
        message: expect.any(String),
      });
    }
    expect(writeClient).not.toHaveBeenCalled();
  });

  it('replies 503 and records nothing while the feed key is unset or too short (AC-4.12)', async () => {
    for (const value of [undefined, '', KEY.slice(0, 31)]) {
      vi.stubEnv('BLUEIQ_FEED_KEY', value);

      const reply = await post(FILE, { 'x-api-key': value ?? '' });

      expect(reply.status, String(value)).toBe(503);
      expect(reply.body).toEqual({
        error: 'not-configured',
        message: expect.any(String),
      });
    }
    expect(writeClient).not.toHaveBeenCalled();
    expect(sanity.transactions).toEqual([]);
  });

  it('replies 401 to a missing or wrong key and records nothing (AC-4.9)', async () => {
    const keys = [
      undefined,
      WRONG_KEY,
      KEY.slice(1),
      KEY.slice(0, -1),
      `${KEY}0`,
      KEY.toUpperCase(),
    ];
    for (const key of keys) {
      const reply = await call({
        body: FILE,
        headers: {
          // A wrong key fails before the content type is checked.
          'content-type': 'application/json',
          ...(key !== undefined && { 'x-api-key': key }),
        },
      });

      expect(reply.status).toBe(401);
      expect(reply.body).toEqual({
        error: 'unauthorized',
        message: expect.any(String),
      });
    }
    expect(writeClient).not.toHaveBeenCalled();
    expect(sanity.transactions).toEqual([]);
  });

  it('replies 415 to a body that is not text/csv and records it (AC-4.9)', async () => {
    for (const type of [
      undefined,
      'application/json',
      'text/plain',
      'text/csvx',
    ]) {
      const reply = await call({
        body: FILE,
        headers: { 'x-api-key': KEY, ...(type && { 'content-type': type }) },
      });

      expect(reply.status, type).toBe(415);
      expect(reply.body).toEqual({
        error: 'unsupported-type',
        message: expect.any(String),
      });
    }
    expect(status()?.last).toMatchObject({ status: 415 });
    expect(touchesProjects()).toBe(false);
  });

  it('replies 413 from Content-Length alone, without waiting for the body', async () => {
    // The body never arrives in full, so a route that read it would time out.
    const reply = await post('Plant ID', {
      'content-length': String(MAX_FILE_BYTES + 1),
    });

    expect(reply.status).toBe(413);
    expect(reply.body).toEqual({
      error: 'too-big',
      message: expect.any(String),
    });
    expect(status()?.last).toMatchObject({ status: 413 });
  });

  it('replies 413 and stops reading once a body without Content-Length passes 5 MB', async () => {
    const megabyte = bytes(1024 * 1024);
    // A body that never ends gets a reply only if the route stops reading at the cap.
    function* endless() {
      for (;;) yield megabyte;
    }

    const reply = await call({
      chunks: endless(),
      headers: { 'content-type': 'text/csv', 'x-api-key': KEY },
    });

    expect(reply.status).toBe(413);
    expect(touchesProjects()).toBe(false);
  });

  it('reads a body of exactly 5 MB either way', async () => {
    const whole = await post(bytes(MAX_FILE_BYTES));
    const chunked = await call({
      chunks: [bytes(MAX_FILE_BYTES - 1), bytes(1)],
      headers: { 'content-type': 'text/csv', 'x-api-key': KEY },
    });

    // A header row of spaces names no column, so the file gets past the size check to 422.
    expect(whole.body).toMatchObject({ error: 'missing-columns' });
    expect(chunked.body).toMatchObject({ error: 'missing-columns' });
  });

  it('replies 503 and changes nothing until a map project has a Plant ID (AC-4.12)', async () => {
    sanity = fakeSanity([WEBSITE_ONLY]);

    const reply = await post();

    expect(reply.status).toBe(503);
    expect(reply.body).toEqual({
      error: 'not-ready',
      message: expect.any(String),
    });
    expect(projects()).toMatchObject([WEBSITE_ONLY]);
    expect(touchesProjects()).toBe(false);
    expect(status()?.last).toMatchObject({ status: 503 });
  });

  it('replies 422 naming a missing column, and the status shows it (AC-4.10, AC-4.13)', async () => {
    const reply = await post(
      csvWithout('state', { plantId: 'P-1', plantName: 'x' }),
    );

    expect(reply.status).toBe(422);
    expect(reply.body).toEqual({
      error: 'missing-columns',
      message: 'The file is missing these columns: State.',
    });
    expect(status()).toMatchObject({
      last: { status: 422, reply: reply.body },
    });
    expect(status()).not.toHaveProperty('lastAcceptedAt');
    expect(touchesProjects()).toBe(false);
  });

  it('replies 422 to a file that lists fewer than half the plants (AC-4.10)', async () => {
    const reply = await post(csv(ROWS[0], ROWS[3]));

    expect(reply.status).toBe(422);
    expect(reply.body).toEqual({
      error: 'half-rule',
      message: expect.any(String),
      skipped: [
        {
          row: 3,
          plantId: 'P-7',
          reasons: [{ reason: 'bad-size', message: expect.any(String) }],
        },
      ],
    });
    expect(touchesProjects()).toBe(false);
  });

  it('replies 409 with Retry-After while another change holds the lock (AC-4.11)', async () => {
    const lock = { _id: LOCK_ID, _type: LOCK_ID, takenAt: NOW.toISOString() };
    sanity = fakeSanity([...PROJECTS, lock]);

    const reply = await post();

    expect(reply.status).toBe(409);
    expect(reply.headers['retry-after']).toBe('120');
    expect(reply.body).toEqual({ error: 'busy', message: expect.any(String) });
    expect(sanity.get(LOCK_ID)).toMatchObject(lock);
    expect(touchesProjects()).toBe(false);
    expect(status()?.last).toMatchObject({ status: 409 });
  });

  it('replies 500 when the backup fails, and the retry applies the file (AC-4.9)', async () => {
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_PART_TYPE,
      ),
    );

    const failed = await post();

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({
      error: 'backup-failed',
      message: 'The backup failed, so nothing changed.',
    });
    expect(touchesProjects()).toBe(false);
    expect(status()?.last).toMatchObject({ status: 500 });

    vi.setSystemTime(new Date(NOW.getTime() + 60_000));
    expect((await post()).status).toBe(200);
  });

  it('replies 500 when a write fails partway, and the retry finishes the job (AC-4.11)', async () => {
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'patch' in mutation &&
          'id' in mutation.patch &&
          mutation.patch.id === 'plant-P-2',
      ),
    );

    const failed = await post();

    expect(failed.status).toBe(500);
    expect(failed.body).toEqual({
      error: 'write-failed',
      message: expect.any(String),
    });

    vi.setSystemTime(new Date(NOW.getTime() + 60_000));
    const retry = await post();

    expect(retry.status).toBe(200);
    expect(sanity.get('plant-P-6')).toBeDefined();
    expect(sanity.get('plant-P-3')?.hiddenAt).toBeDefined();
  });

  it('replies 500 and records nothing when the website cannot write to Sanity', async () => {
    vi.mocked(writeClient).mockImplementation(() => {
      throw new Error('Missing SANITY_API_WRITE_TOKEN');
    });

    const reply = await post();

    expect(reply.status).toBe(500);
    expect(reply.body).toEqual({
      error: 'server-error',
      message: expect.any(String),
    });
    expect(sanity.transactions).toEqual([]);
  });

  it("never logs Sanity's error text, which can quote the file or the key (NFR-007)", async () => {
    const leaky: MapProjectsClient = {
      fetch: sanity.fetch,
      async mutate(mutations: Mutation[], options) {
        if (mutations.some((mutation) => 'create' in mutation)) {
          throw Object.assign(
            new Error(`Mutation failed: "${FILE_TEXT}" ${KEY}`),
            { statusCode: 400, details: { value: FILE_TEXT } },
          );
        }
        return sanity.mutate(mutations, options);
      },
    };
    vi.mocked(writeClient).mockImplementation(
      () => leaky as unknown as SanityClient,
    );

    const reply = await post();

    expect(reply.status).toBe(500);
    // The checks after each test read these lines for the key and the file.
    expect(logs.length).toBeGreaterThan(0);
  });

  it("still replies when the feed's status can't be saved", async () => {
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'createIfNotExists' in mutation &&
          mutation.createIfNotExists._id === FEED_STATUS_ID,
      ),
    );

    const reply = await post();

    expect(reply.status).toBe(200);
    expect(status()).toBeUndefined();
    expect(
      logs.some((args) => args.some((arg) => /status/i.test(String(arg)))),
    ).toBe(true);
  });
});
