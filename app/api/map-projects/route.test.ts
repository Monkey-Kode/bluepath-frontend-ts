// @vitest-environment node
import { createHash, randomUUID } from 'node:crypto';
import { inspect } from 'node:util';

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

import { BACKUP_PART_TYPE, BACKUP_TYPE } from '@/lib/mapProjects/backups';
import { COLUMN_KEYS, COLUMNS } from '@/lib/mapProjects/columns';
import { FEED_STATUS_ID } from '@/lib/mapProjects/feedStatus';
import { LOCK_ID } from '@/lib/mapProjects/lock';
import { MAX_FILE_BYTES } from '@/lib/mapProjects/parseCsv';
import {
  type FakeDocument,
  type FakeSanity,
  fakeSanity,
} from '@/lib/mapProjects/testing/fakeSanity';
import { type Cells, csv } from '@/lib/mapProjects/testing/files';
import { writeClient } from '@/sanity/lib/writeClient';
import { type RouteServer, send, serveRoute } from '@/test/http';

import * as route from './route';

vi.mock('@/sanity/lib/writeClient', () => ({ writeClient: vi.fn() }));
// The deployed Studio's address, which T128 sets in production.
vi.mock('@/sanity/lib/api', () => ({
  studioUrl: 'https://bluepath.sanity.studio/',
}));

const PATH = '/api/map-projects/';
const ORIGIN = 'https://bluepath.sanity.studio';
const NOW = new Date('2026-11-04T12:00:00.000Z');
const PERSON = 'Pat Editor';
/** Text that only the file holds. A log line that holds it repeats the file. */
const FILE_TEXT = 'Zebulon Quartz Array';
/** A proof's age limit and ID form, as the Studio pane relies on them. */
const TWO_MINUTES = 2 * 60 * 1000;
const PROOF_TYPE = 'mapProjects.request';
const proofId = (uuid: string) => `${PROOF_TYPE}.${uuid}`;
const SHEET_URL =
  'https://docs.google.com/spreadsheets/d/e/2PACX-sheet/pub?output=csv';
const SHEET_CONTENT_URL =
  'https://doc-0g-1c-sheets.googleusercontent.com/pub/sheet?output=csv';

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

/** Three shown plants and one hidden plant. The file below hides P-3 and returns P-4. */
const PROJECTS = [
  plant(1),
  plant(2),
  plant(3),
  plant(4, { hiddenAt: '2026-10-01T00:00:00.000Z' }),
];

const ROWS: Cells[] = [
  // Row 2 renames P-1 to the file-only text.
  { plantId: 'P-1', plantName: FILE_TEXT, projectType: 'Solar' },
  { plantId: 'P-2', plantName: 'Plant 2', projectType: 'Solar' },
  { plantId: 'P-4', plantName: 'Plant 4', projectType: 'Solar' },
  { plantId: 'P-6', plantName: 'Plant 6', projectType: 'Wind' },
  { plantId: 'P-7', plantName: 'Plant 7', projectType: 'Solar', size: 'lots' },
];
const FILE = new TextDecoder().decode(csv(...ROWS));

/** A file with every required column but State. */
const FILE_WITHOUT_STATE = (() => {
  const keys = COLUMN_KEYS.filter(
    (key) => COLUMNS[key].presence !== 'starter' && key !== 'state',
  );
  return [
    keys.map((key) => COLUMNS[key].header).join(','),
    keys.map((key) => (key === 'plantId' ? 'P-1' : 'x')).join(','),
  ].join('\r\n');
})();

let server: RouteServer;
let sanity: FakeSanity;
let logs: unknown[][];
let spies: MockInstance[];
/** Every proof ID a test made. No log line may repeat one. */
let proofIds: string[];
let fetchMock: ReturnType<typeof vi.fn>;

beforeAll(async () => {
  server = await serveRoute(route);
});

afterAll(async () => {
  await server.close();
});

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  sanity = fakeSanity(PROJECTS);
  vi.mocked(writeClient).mockReset();
  vi.mocked(writeClient).mockImplementation(
    () => sanity as unknown as SanityClient,
  );
  proofIds = [];
  fetchMock = vi.fn(() => {
    throw new Error('This test fetches no sheet.');
  });
  vi.stubGlobal('fetch', fetchMock);
  logs = [];
  spies = (['log', 'info', 'warn', 'error', 'debug'] as const).map((level) =>
    vi.spyOn(console, level).mockImplementation((...args: unknown[]) => {
      logs.push(args);
    }),
  );
});

afterEach(() => {
  for (const spy of spies) spy.mockRestore();
  vi.unstubAllGlobals();
  vi.useRealTimers();

  // NFR-007: no log line repeats a proof or the file.
  const logged = logs
    .map((args) =>
      args
        .map((arg) => (typeof arg === 'string' ? arg : inspect(arg)))
        .join(' '),
    )
    .join('\n');
  expect(logged).not.toContain(FILE_TEXT);
  for (const id of proofIds) expect(logged).not.toContain(id);
  expect(server.errors).toEqual([]);
});

const sha256 = (text: string) =>
  createHash('sha256').update(text).digest('hex');

interface ProofFields {
  bodyHash?: string | null;
  person?: string | null;
  createdAt?: Date;
}

/** Saves a proof for the body, as the Studio does before each request. */
async function prove(body: string, fields: ProofFields = {}) {
  const uuid = randomUUID();
  proofIds.push(uuid);
  const doc: FakeDocument = {
    _id: proofId(uuid),
    _type: PROOF_TYPE,
    _createdAt: (fields.createdAt ?? NOW).toISOString(),
  };
  if (fields.bodyHash !== null) doc.bodyHash = fields.bodyHash ?? sha256(body);
  if (fields.person !== null) doc.person = fields.person ?? PERSON;
  await sanity.mutate([{ create: doc }]);
  return uuid;
}

interface PostOptions {
  /** The Origin header. Null sends none. */
  origin?: string | null;
  /** A proof's fields, a proof header to send as is, or false to send none. */
  proof?: ProofFields | string | false;
  headers?: Record<string, string>;
}

function parse(text: string) {
  return text ? JSON.parse(text) : null;
}

/** Posts a JSON body from the Studio with a fresh proof. */
async function post(payload: unknown, options: PostOptions = {}) {
  const body = typeof payload === 'string' ? payload : JSON.stringify(payload);
  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.origin !== null) headers.origin = options.origin ?? ORIGIN;
  const proof =
    options.proof === false
      ? undefined
      : typeof options.proof === 'string'
        ? options.proof
        : await prove(body, options.proof);
  if (proof !== undefined) headers['x-map-projects-request'] = proof;
  Object.assign(headers, options.headers);
  const reply = await send(`${server.url}${PATH}`, { headers, body });
  return { ...reply, body: parse(reply.text), proof };
}

const proofLeft = (uuid: string | undefined) =>
  uuid !== undefined && sanity.get(proofId(uuid)) !== undefined;

const projects = () =>
  sanity.documents().filter(({ _type }) => _type === 'casestudies');

/** True when a transaction wrote anything but a proof. */
const wroteBeyondProofs = () =>
  sanity.transactions.some(
    ({ mutations, failed }) =>
      !failed &&
      mutations.some((mutation) => {
        const id =
          'create' in mutation
            ? mutation.create._id
            : 'patch' in mutation && 'id' in mutation.patch
              ? mutation.patch.id
              : 'delete' in mutation && 'id' in mutation.delete
                ? mutation.delete.id
                : undefined;
        return !String(id).startsWith(`${PROOF_TYPE}.`);
      }),
  );

function expectCors(headers: Record<string, unknown>) {
  expect(headers['access-control-allow-origin']).toBe(ORIGIN);
  expect(String(headers.vary)).toMatch(/\bOrigin\b/);
}

const OTHER_ORIGINS = [
  'http://localhost:3333',
  'http://bluepath.sanity.studio',
  'https://bluepath.sanity.studio.evil.example',
  'https://evil.example',
  'null',
];

describe('OPTIONS /api/map-projects/', () => {
  it('lets the Studio send JSON with its proof (FR-015)', async () => {
    const reply = await send(`${server.url}${PATH}`, {
      method: 'OPTIONS',
      headers: {
        origin: ORIGIN,
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'content-type,x-map-projects-request',
      },
    });

    expect(reply.status).toBe(204);
    expectCors(reply.headers);
    expect(reply.headers['access-control-allow-methods']).toBe('POST, OPTIONS');
    expect(
      String(reply.headers['access-control-allow-headers']).toLowerCase(),
    ).toBe('content-type, x-map-projects-request');
    expect(reply.headers['access-control-max-age']).toBe('600');
  });

  it.each([
    ...OTHER_ORIGINS,
    undefined,
  ])('refuses the origin %s', async (origin) => {
    const reply = await send(`${server.url}${PATH}`, {
      method: 'OPTIONS',
      headers: origin ? { origin } : {},
    });

    expect(reply.status).toBe(403);
    expect(reply.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('POST /api/map-projects/ checks', () => {
  it('refuses a GET with 405 and names POST', async () => {
    const reply = await send(`${server.url}${PATH}`, {
      method: 'GET',
      headers: { origin: ORIGIN },
    });

    expect(reply.status).toBe(405);
    expect(reply.headers.allow).toBe('POST, OPTIONS');
    expect(parse(reply.text).error).toBe('method-not-allowed');
  });

  it.each([
    ...OTHER_ORIGINS,
    null,
  ])('refuses the origin %s and leaves its proof alone', async (origin) => {
    const reply = await post({ action: 'columns' }, { origin });

    expect(reply.status).toBe(403);
    expect(reply.body.error).toBe('forbidden');
    expect(reply.headers['access-control-allow-origin']).toBeUndefined();
    expect(proofLeft(reply.proof)).toBe(true);
    expect(writeClient).not.toHaveBeenCalled();
  });

  it.each([
    ['no proof header', false],
    ['a proof that is not a UUID', 'mapProjects.lock'],
    ['an upper-case UUID', randomUUID().toUpperCase()],
    ['a UUID with text before it', `x${randomUUID()}`],
    ['a UUID with text after it', `${randomUUID()}x`],
  ] as const)('refuses %s without reading Sanity', async (_name, proof) => {
    const reply = await post({ action: 'columns' }, { proof });

    expect(reply.status).toBe(403);
    expect(reply.body.error).toBe('forbidden');
    expectCors(reply.headers);
    expect(writeClient).not.toHaveBeenCalled();
  });

  it('refuses a proof that Sanity lacks', async () => {
    const reply = await post({ action: 'columns' }, { proof: randomUUID() });

    expect(reply.status).toBe(403);
    expect(reply.body.error).toBe('forbidden');
  });

  it('deletes a proof once it serves a request, so it cannot serve twice', async () => {
    const first = await post({ action: 'columns' });
    expect(first.status).toBe(200);
    expectCors(first.headers);
    expect(proofLeft(first.proof)).toBe(false);

    const again = await post({ action: 'columns' }, { proof: first.proof });
    expect(again.status).toBe(403);
    expect(again.body.error).toBe('forbidden');
  });

  it('takes a proof made exactly two minutes ago', async () => {
    const reply = await post(
      { action: 'columns' },
      { proof: { createdAt: new Date(NOW.getTime() - TWO_MINUTES) } },
    );

    expect(reply.status).toBe(200);
  });

  it.each([
    [
      'an expired proof',
      { createdAt: new Date(NOW.getTime() - TWO_MINUTES - 1000) },
    ],
    ['a proof for another body', { bodyHash: sha256('{"action":"status"}') }],
    ['a proof without a hash', { bodyHash: null }],
    ['a proof without a person', { person: null }],
    ['a proof with a blank person', { person: '  ' }],
  ] as const)('refuses %s and deletes it', async (_name, proof) => {
    const reply = await post({ action: 'columns' }, { proof });

    expect(reply.status).toBe(403);
    expect(reply.body.error).toBe('forbidden');
    expect(proofLeft(reply.proof)).toBe(false);
    expect(wroteBeyondProofs()).toBe(false);
  });

  it('deletes expired proofs that never reached the website', async () => {
    const old = new Date(NOW.getTime() - TWO_MINUTES - 1000);
    // Another editor's request may still be on its way with this proof.
    const recent = new Date(NOW.getTime() - TWO_MINUTES + 1000);
    const lost = [
      await prove('a', { createdAt: old }),
      await prove('b', { createdAt: recent }),
    ];
    await sanity.mutate([
      { create: { ...plant(9), _createdAt: old.toISOString() } },
    ]);

    const reply = await post({ action: 'columns' });

    expect(reply.status).toBe(200);
    expect(proofLeft(lost[0])).toBe(false);
    expect(proofLeft(lost[1])).toBe(true);
    expect(sanity.get('plant-P-9')).toBeDefined();
  });

  it('still replies when deleting expired proofs fails', async () => {
    const old = new Date(NOW.getTime() - TWO_MINUTES - 1000);
    const lost = await prove('a', { createdAt: old });
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'delete' in mutation &&
          'id' in mutation.delete &&
          mutation.delete.id === proofId(lost),
      ),
    );

    const reply = await post({ action: 'columns' });

    expect(reply.status).toBe(200);
    expect(proofLeft(lost)).toBe(true);
  });

  it('replies 500 when the write client cannot start', async () => {
    vi.mocked(writeClient).mockImplementation(() => {
      throw new Error('SANITY_API_WRITE_TOKEN is unset.');
    });

    const reply = await post({ action: 'columns' });

    expect(reply.status).toBe(500);
    expect(reply.body.error).toBe('server-error');
    expectCors(reply.headers);
  });

  it.each([
    { action: 'status' },
    {
      action: 'apply',
      file: FILE,
      hideMissing: true,
      token: 'token',
      source: { kind: 'file', name: 'plants.csv' },
    },
  ])('replies 500 when Sanity fails unexpectedly during $action', async (payload) => {
    const fetch = sanity.fetch.bind(sanity);
    vi.spyOn(sanity, 'fetch').mockImplementation((query, params) =>
      query.includes('casestudies')
        ? Promise.reject(new Error('Sanity is down.'))
        : fetch(query, params),
    );

    const reply = await post(payload);

    expect(reply.status).toBe(500);
    expect(reply.body.error).toBe('server-error');
    expectCors(reply.headers);
  });

  it('takes a 5 MB file whose JSON is twice as long', async () => {
    // Each quote in a cell doubles in the CSV and again in the JSON.
    const plantName = '"'.repeat(MAX_FILE_BYTES / 2 - 1000);
    const file = new TextDecoder().decode(
      csv({ plantId: 'P-1', plantName, projectType: 'Solar' }),
    );
    expect(file.length).toBeLessThanOrEqual(MAX_FILE_BYTES);
    const body = JSON.stringify({
      action: 'preview',
      file,
      hideMissing: false,
    });
    expect(body.length).toBeGreaterThan(2 * MAX_FILE_BYTES - 4000);

    const reply = await post(body);

    expect(reply.status).toBe(200);
    expect(reply.body.plan.rows[0].changes).toEqual({ plantName });
  });

  it('refuses a body that is not JSON with 415 and leaves its proof alone', async () => {
    const reply = await post(
      { action: 'columns' },
      { headers: { 'content-type': 'text/plain' } },
    );

    expect(reply.status).toBe(415);
    expect(reply.body.error).toBe('unsupported-type');
    expect(proofLeft(reply.proof)).toBe(true);
  });

  it('takes JSON with a charset', async () => {
    const reply = await post(
      { action: 'columns' },
      { headers: { 'content-type': 'application/json; charset=utf-8' } },
    );

    expect(reply.status).toBe(200);
  });

  it('refuses a body over the limit by its length and leaves its proof alone', async () => {
    const proof = await prove('anything');
    const reply = await send(`${server.url}${PATH}`, {
      headers: {
        origin: ORIGIN,
        'content-type': 'application/json',
        'x-map-projects-request': proof,
      },
      body: new Uint8Array(11 * 1024 * 1024).fill(32),
    });

    expect(reply.status).toBe(413);
    expect(parse(reply.text).error).toBe('too-big');
    expect(proofLeft(proof)).toBe(true);
  });

  it('stops reading a body that grows past the limit', async () => {
    const chunk = new Uint8Array(1024 * 1024).fill(32);
    const head = '{"action":"preview","file":"';
    const proof = await prove('anything');
    const reply = await send(`${server.url}${PATH}`, {
      headers: {
        origin: ORIGIN,
        'content-type': 'application/json',
        'x-map-projects-request': proof,
      },
      chunks: [new TextEncoder().encode(head), ...Array(12).fill(chunk)],
    });

    expect(reply.status).toBe(413);
    expect(parse(reply.text).error).toBe('too-big');
    expect(proofLeft(proof)).toBe(false);
  });

  it.each([
    ['text that is not JSON', 'not json'],
    ['a JSON array', '[]'],
    ['an unknown action', { action: 'drop-everything' }],
    ['a preview without a file', { action: 'preview', hideMissing: true }],
    [
      'a preview with a non-boolean option',
      { action: 'preview', file: FILE, hideMissing: 'yes' },
    ],
    ['a sync without a link', { action: 'sync', hideMissing: true }],
  ])('refuses %s with 400', async (_name, payload) => {
    const reply = await post(payload);

    expect(reply.status).toBe(400);
    expect(reply.body.error).toBe('bad-request');
    expectCors(reply.headers);
    expect(wroteBeyondProofs()).toBe(false);
  });
});

describe('the columns action', () => {
  it('lists the template columns in order with their presence (AC-4.1)', async () => {
    const reply = await post({ action: 'columns' });

    expect(reply.status).toBe(200);
    expect(reply.body.columns).toEqual(
      COLUMN_KEYS.map((key) => ({
        key,
        header: COLUMNS[key].header,
        presence: COLUMNS[key].presence,
      })),
    );
  });
});

describe('the status action', () => {
  it('says the starter load is due and the feed has sent nothing yet', async () => {
    sanity = fakeSanity([
      { _id: 'old-library', _type: 'casestudies', projectName: 'Library' },
    ]);

    const reply = await post({ action: 'status' });

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({
      ready: false,
      feed: { last: null, lastAcceptedAt: null },
    });
  });

  it("reports readiness and the feed's last file (AC-4.13)", async () => {
    const last = {
      receivedAt: '2026-11-04T06:00:00.000Z',
      status: 409,
      reply: { error: 'busy', message: 'Another change is running.' },
    };
    await sanity.mutate([
      {
        create: {
          _id: FEED_STATUS_ID,
          _type: FEED_STATUS_ID,
          last,
          lastAcceptedAt: '2026-11-03T06:00:00.000Z',
        },
      },
      {
        create: {
          _id: 'old-library',
          _type: 'casestudies',
          projectName: 'Library',
        },
      },
    ]);

    const reply = await post({ action: 'status' });

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({
      ready: true,
      feed: { last, lastAcceptedAt: '2026-11-03T06:00:00.000Z' },
    });
  });
});

describe('the preview action', () => {
  it('lists each row, the hides, the returns, and a token, and writes nothing (AC-4.3)', async () => {
    const reply = await post({
      action: 'preview',
      file: FILE,
      hideMissing: true,
    });

    expect(reply.status).toBe(200);
    expect(reply.body.result).toBe('ready');
    const { plan } = reply.body;
    expect(plan.rows.map(({ action }: { action: string }) => action)).toEqual([
      'update',
      'unchanged',
      'update',
      'create',
      'error',
    ]);
    expect(plan.rows[0].changes).toEqual({ plantName: FILE_TEXT });
    expect(plan.rows[2].returns).toBe(true);
    expect(plan.rows[4].errors).toEqual([
      expect.objectContaining({ reason: 'bad-size' }),
    ]);
    expect(plan.hides).toEqual([
      { id: 'plant-P-3', plantId: 'P-3', name: 'Plant 3' },
    ]);
    expect(plan.returns).toEqual([
      { id: 'plant-P-4', plantId: 'P-4', name: 'Plant 4' },
    ]);
    expect(plan.token).toEqual(expect.any(String));
    expect(wroteBeyondProofs()).toBe(false);
    expect(projects()).toEqual(
      PROJECTS.map((project) => expect.objectContaining(project)),
    );
  });

  it('hides nothing when the editor turns hiding off (AC-4.5)', async () => {
    const reply = await post({
      action: 'preview',
      file: FILE,
      hideMissing: false,
    });

    expect(reply.status).toBe(200);
    expect(reply.body.plan.hides).toEqual([]);
  });

  it('names a missing column and writes nothing (AC-4.2, AC-4.8)', async () => {
    const reply = await post({
      action: 'preview',
      file: FILE_WITHOUT_STATE,
      hideMissing: true,
    });

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('missing-columns');
    expect(reply.body.message).toContain('State');
    expect(wroteBeyondProofs()).toBe(false);
  });

  it('says why a file cannot be read (AC-4.8)', async () => {
    const reply = await post({
      action: 'preview',
      file: '"Plant ID,Plant Name\r\nP-1',
      hideMissing: true,
    });

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('malformed');
    expect(reply.body.message).toEqual(expect.any(String));
  });

  it('rejects a file with no valid rows and shows its plan', async () => {
    const reply = await post({
      action: 'preview',
      file: new TextDecoder().decode(csv({ plantName: 'No ID' })),
      hideMissing: true,
    });

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('no-valid-rows');
    expect(reply.body.plan.rows).toHaveLength(1);
  });

  it('replies 503 before the starter load (AC-4.12)', async () => {
    sanity = fakeSanity([
      { _id: 'old-library', _type: 'casestudies', projectName: 'Library' },
    ]);

    const reply = await post({
      action: 'preview',
      file: FILE,
      hideMissing: true,
    });

    expect(reply.status).toBe(503);
    expect(reply.body.error).toBe('not-ready');
  });
});

describe('the apply action', () => {
  async function preview(file = FILE, hideMissing = true) {
    const reply = await post({ action: 'preview', file, hideMissing });
    expect(reply.status).toBe(200);
    return reply.body.plan.token as string;
  }

  const apply = (token: unknown, source: unknown) =>
    post({ action: 'apply', file: FILE, hideMissing: true, token, source });

  const fileSource = { kind: 'file', name: 'plants.csv' };

  it('applies the previewed file, saves a backup, and reports the counts (AC-4.4)', async () => {
    const token = await preview();

    const reply = await apply(token, fileSource);

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({
      result: 'applied',
      counts: {
        created: 1,
        updated: 2,
        unchanged: 1,
        skipped: 1,
        hidden: 1,
        returned: 1,
      },
      backupId: expect.stringMatching(/^mapProjects\.backup\./),
    });
    expect(sanity.get('plant-P-1')).toMatchObject({ plantName: FILE_TEXT });
    expect(sanity.get('plant-P-3')).toMatchObject({
      hiddenAt: NOW.toISOString(),
    });
    expect(sanity.get(reply.body.backupId)).toMatchObject({
      _type: BACKUP_TYPE,
      source: fileSource,
      person: PERSON,
    });
    expect(sanity.get(LOCK_ID)).toBeUndefined();
  });

  it('reports the import and logs a lock it could not release', async () => {
    const token = await preview();
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'delete' in mutation &&
          'id' in mutation.delete &&
          mutation.delete.id === LOCK_ID,
      ),
    );

    const reply = await apply(token, fileSource);

    expect(reply.status).toBe(200);
    expect(reply.body.result).toBe('applied');
    expect(logs.map((args) => args.join(' '))).toContainEqual(
      expect.stringContaining('unlock failed after the import applied'),
    );
  });

  it('records a sheet as the backup source', async () => {
    const token = await preview();
    const source = { kind: 'sheet', url: SHEET_URL };

    const reply = await apply(token, source);

    expect(reply.status).toBe(200);
    expect(sanity.get(reply.body.backupId)).toMatchObject({ source });
  });

  it('applies a preview with hiding off (AC-4.5)', async () => {
    const token = await preview(FILE, false);

    const reply = await post({
      action: 'apply',
      file: FILE,
      hideMissing: false,
      token,
      source: fileSource,
    });

    expect(reply.status).toBe(200);
    expect(reply.body.counts.hidden).toBe(0);
    expect(sanity.get('plant-P-3')).not.toHaveProperty('hiddenAt');
  });

  it('says nothing changed when the file matches the projects', async () => {
    expect((await apply(await preview(), fileSource)).status).toBe(200);
    const backups = () =>
      sanity.documents().filter(({ _type }) => _type === BACKUP_TYPE);
    expect(backups()).toHaveLength(1);

    const reply = await apply(await preview(), fileSource);

    expect(reply.status).toBe(200);
    expect(reply.body).toEqual({
      result: 'no-changes',
      counts: {
        created: 0,
        updated: 0,
        unchanged: 4,
        skipped: 1,
        hidden: 0,
        returned: 0,
      },
      backupId: null,
    });
    expect(backups()).toHaveLength(1);
  });

  it('takes a file name of 255 characters', async () => {
    const token = await preview();

    const reply = await apply(token, { kind: 'file', name: 'x'.repeat(255) });

    expect(reply.status).toBe(200);
  });

  it('writes nothing and shows a new preview when projects changed after the preview (AC-4.4)', async () => {
    const token = await preview();
    await sanity.mutate([
      { patch: { id: 'plant-P-2', set: { plantName: 'Renamed' } } },
    ]);
    const before = projects();

    const reply = await apply(token, fileSource);

    expect(reply.status).toBe(409);
    expect(reply.body.error).toBe('stale');
    expect(reply.body.plan.token).not.toBe(token);
    expect(projects()).toEqual(before);
  });

  it('says another change is running while the lock is held (AC-4.11)', async () => {
    const token = await preview();
    await sanity.mutate([
      {
        create: { _id: LOCK_ID, _type: LOCK_ID, takenAt: NOW.toISOString() },
      },
    ]);
    const before = projects();

    const reply = await apply(token, fileSource);

    expect(reply.status).toBe(409);
    expect(reply.body.error).toBe('busy');
    expect(reply.body.message).toMatch(/another change/i);
    expect(projects()).toEqual(before);
  });

  it('writes no project when the backup fails', async () => {
    const token = await preview();
    sanity.failWhen((mutations) =>
      mutations.some(
        (mutation) =>
          'create' in mutation && mutation.create._type === BACKUP_PART_TYPE,
      ),
    );
    const before = projects();

    const reply = await apply(token, fileSource);

    expect(reply.status).toBe(500);
    expect(reply.body.error).toBe('backup-failed');
    expect(projects()).toEqual(before);
  });

  it('names the reason when the file is rejected', async () => {
    const reply = await post({
      action: 'apply',
      file: FILE_WITHOUT_STATE,
      hideMissing: true,
      token: 'any',
      source: fileSource,
    });

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('missing-columns');
    expect(wroteBeyondProofs()).toBe(false);
  });

  it.each([
    ['no token', undefined, fileSource],
    ['an empty token', '', fileSource],
    ['no source', 'token', undefined],
    ['a feed source', 'token', { kind: 'feed' }],
    ['a file without a name', 'token', { kind: 'file', name: '' }],
    ['a file name too long', 'token', { kind: 'file', name: 'x'.repeat(256) }],
    [
      'a sheet link off Google',
      'token',
      { kind: 'sheet', url: 'https://evil.example/spreadsheets/x' },
    ],
  ])('refuses %s with 400 and writes nothing', async (_name, token, source) => {
    const reply = await apply(token, source);

    expect(reply.status).toBe(400);
    expect(reply.body.error).toBe('bad-request');
    expect(wroteBeyondProofs()).toBe(false);
  });
});

describe('the sync action', () => {
  type Route = (url: string, init: RequestInit) => Response | Promise<Response>;

  /** Serves sheet requests from `respond`, and checks that each one handles redirects itself. */
  function sheets(respond: Route) {
    fetchMock.mockImplementation(
      async (input: string | URL, init: RequestInit = {}) => {
        expect(init.redirect).toBe('manual');
        expect(init.signal).toBeInstanceOf(AbortSignal);
        return respond(String(input), init);
      },
    );
  }

  const redirect = (location: string) =>
    new Response(null, { status: 307, headers: { location } });
  const csvReply = (body: BodyInit, headers: Record<string, string> = {}) =>
    new Response(body, {
      status: 200,
      headers: { 'content-type': 'text/csv', ...headers },
    });

  const sync = (url: string, hideMissing = true) =>
    post({ action: 'sync', url, hideMissing });

  it("follows Google's redirect and previews the sheet (AC-4.1, AC-4.3)", async () => {
    sheets((url) =>
      url === SHEET_URL ? redirect(SHEET_CONTENT_URL) : csvReply(FILE),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(200);
    expect(reply.body.result).toBe('ready');
    expect(reply.body.file).toBe(FILE);
    expect(reply.body.plan.rows).toHaveLength(ROWS.length);
    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      SHEET_URL,
      SHEET_CONTENT_URL,
    ]);
    expect(wroteBeyondProofs()).toBe(false);
  });

  it("keeps a sheet's byte order mark, so its apply matches the preview", async () => {
    const withMark = `﻿${FILE}`;
    sheets(() => csvReply(withMark));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(200);
    expect(reply.body.file).toBe(withMark);
  });

  it('hides nothing when the editor turns hiding off (AC-4.5)', async () => {
    sheets(() => csvReply(FILE));

    const reply = await sync(SHEET_URL, false);

    expect(reply.status).toBe(200);
    expect(reply.body.plan.hides).toEqual([]);
  });

  it.each([
    'http://docs.google.com/spreadsheets/d/e/x/pub?output=csv',
    'https://docs.google.com.evil.example/spreadsheets/d/e/x/pub',
    'https://evil.example/spreadsheets/d/e/x/pub',
    'https://docs.google.com/document/d/x/pub',
    'https://user:pw@docs.google.com/spreadsheets/d/e/x/pub',
    'https://docs.google.com:8443/spreadsheets/d/e/x/pub',
    'not a link',
  ])('refuses %s without fetching it (AC-4.8)', async (url) => {
    const reply = await sync(url);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('bad-sheet-link');
    expect(reply.body.message).toContain('docs.google.com/spreadsheets');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    'https://evil.example/sheet.csv',
    'http://doc-0g-1c-sheets.googleusercontent.com/pub/sheet',
    'https://googleusercontent.com.evil.example/pub/sheet',
    'https://evilgoogle.com/pub/sheet',
    'https://evilgoogleusercontent.com/pub/sheet',
    'https://user@doc-0g.googleusercontent.com/pub/sheet',
    'https://:pw@doc-0g.googleusercontent.com/pub/sheet',
    'https://doc-0g.googleusercontent.com:444/pub/sheet',
    'http://localhost:3000/',
    'http://169.254.169.254/latest/meta-data/',
  ])('refuses a redirect to %s', async (location) => {
    sheets(() => redirect(location));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-redirect');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect relative to the link', async () => {
    sheets((url) =>
      url === SHEET_URL ? redirect('/spreadsheets/next') : csvReply(FILE),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(200);
    expect(String(fetchMock.mock.calls[1]?.[0])).toBe(
      'https://docs.google.com/spreadsheets/next',
    );
  });

  it('treats a redirect status without a location as a refusal', async () => {
    sheets(() => new Response(null, { status: 302 }));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-unreachable');
    expect(reply.body.message).toContain('302');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('follows a redirect to another Google host', async () => {
    sheets((url) =>
      url === SHEET_URL
        ? redirect('https://accounts.google.com/next')
        : csvReply(FILE),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(200);
  });

  it('gives up after five redirects', async () => {
    let hop = 0;
    sheets(() => {
      hop += 1;
      return redirect(`${SHEET_CONTENT_URL}&hop=${hop}`);
    });

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-redirect');
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it('follows five redirects', async () => {
    let hop = 0;
    sheets(() => {
      hop += 1;
      return hop <= 5
        ? redirect(`${SHEET_CONTENT_URL}&hop=${hop}`)
        : csvReply(FILE);
    });

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(200);
  });

  it('names the status when Google refuses the sheet (AC-4.8)', async () => {
    sheets(() => new Response('gone', { status: 404 }));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-unreachable');
    expect(reply.body.message).toContain('404');
  });

  it('says when the sheet cannot be reached (AC-4.8)', async () => {
    sheets(() => {
      throw new TypeError('fetch failed');
    });

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-unreachable');
  });

  it('says when the sheet breaks off partway', async () => {
    sheets(() =>
      csvReply(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('"Plant ID"'));
            controller.error(new Error('connection reset'));
          },
        }),
      ),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-unreachable');
  });

  it('says when the link leads to a web page instead of a CSV (AC-4.8)', async () => {
    sheets(
      () =>
        new Response('<html></html>', {
          status: 200,
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('sheet-not-csv');
  });

  it('refuses a sheet over 5 MB by its length', async () => {
    sheets(() =>
      csvReply('a', { 'content-length': String(MAX_FILE_BYTES + 1) }),
    );

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('too-big');
  });

  it('stops reading a sheet that grows past 5 MB', async () => {
    const chunk = new Uint8Array(64 * 1024).fill(32);
    let served = 0;
    // A sheet with no length that never ends.
    const endless = new ReadableStream<Uint8Array>({
      pull(controller) {
        served += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    sheets(() => csvReply(endless));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('too-big');
    expect(served).toBeLessThanOrEqual(MAX_FILE_BYTES + 4 * chunk.byteLength);
  });

  it('names a missing column in the sheet (AC-4.8)', async () => {
    sheets(() => csvReply(FILE_WITHOUT_STATE));

    const reply = await sync(SHEET_URL);

    expect(reply.status).toBe(422);
    expect(reply.body.error).toBe('missing-columns');
    expect(reply.body.message).toContain('State');
    // Only a ready preview carries the file for the pane to apply.
    expect(reply.body).not.toHaveProperty('file');
  });
});
