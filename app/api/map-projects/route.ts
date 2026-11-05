import {
  ChangeFailure,
  applyImport,
  type ImportResult,
  type PreviewResult,
  previewImport,
  starterLoadDone,
} from '@/lib/mapProjects/apply';
import type { BackupSource } from '@/lib/mapProjects/backups';
import { COLUMN_KEYS, COLUMNS } from '@/lib/mapProjects/columns';
import { FEED_STATUS_ID, type FeedStatus } from '@/lib/mapProjects/feedStatus';
import {
  type LinkResult,
  linkProject,
  listLinkOptions,
} from '@/lib/mapProjects/link';
import { MAX_FILE_BYTES } from '@/lib/mapProjects/parseCsv';
import type { CurrentProject } from '@/lib/mapProjects/plan';
import {
  type LinkedDocument,
  listHidden,
  type RemoveResult,
  removeHidden,
} from '@/lib/mapProjects/remove';
import {
  errorReply,
  hasMediaType,
  logFailure,
  type Reply,
  readCapped,
} from '@/lib/mapProjects/replies';
import {
  bodyHash,
  isProofHeader,
  pruneProofs,
  REQUEST_PROOF_HEADER,
  takeProof,
} from '@/lib/mapProjects/requestProof';
import { fetchSheet, isSheetLink } from '@/lib/mapProjects/sheet';
import type { MapProjectsClient } from '@/lib/mapProjects/store';
import { studioUrl } from '@/sanity/lib/api';
import { writeClient } from '@/sanity/lib/writeClient';

/**
 * The Studio's route for map project imports (FR-015). It takes POSTs only from the Studio's
 * origin, and only with a request proof that a Studio user saved in Sanity. Logs hold only codes,
 * never a proof or a file (NFR-007).
 */

const LOG = '[map-projects]';

/** JSON escapes can double a CSV's size, so a 5 MB file fits in twice that. */
const MAX_REQUEST_BYTES = 2 * MAX_FILE_BYTES + 64 * 1024;

const MAX_FILE_NAME_LENGTH = 255;

/** More than every plant BlueIQ has, so a real hidden list always fits. */
const MAX_DELETE_IDS = 1000;

function originOf(url: string) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

/** Locally `http://localhost:3333`. In production, the deployed Studio's origin. */
const STUDIO_ORIGIN = originOf(studioUrl);

type RouteReply = Reply<object>;

const FORBIDDEN = errorReply(
  403,
  'forbidden',
  'The website could not confirm that this request came from the Studio. Reload the Studio and try again.',
);
const METHOD_NOT_ALLOWED = errorReply(
  405,
  'method-not-allowed',
  'Send requests with POST.',
  { Allow: 'POST, OPTIONS' },
);
const BAD_REQUEST = errorReply(
  400,
  'bad-request',
  'The website did not understand the request. Reload the Studio and try again.',
);
const UNSUPPORTED_TYPE = errorReply(
  415,
  'unsupported-type',
  'Send the request as application/json.',
);
const TOO_BIG = errorReply(413, 'too-big', 'The file is larger than 5 MB.');
const BUSY = errorReply(
  409,
  'busy',
  'Another change to the map is running. Try again in a few minutes.',
);
const SERVER_ERROR = errorReply(
  500,
  'server-error',
  'The website could not finish the request. Try again later.',
);

/** The request's origin when it is the Studio's, otherwise null. */
function studioOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return STUDIO_ORIGIN !== null && origin === STUDIO_ORIGIN ? origin : null;
}

/** Only a reply to the Studio's origin lets its browser read the body. */
function respond({ status, body, headers }: RouteReply, origin: string | null) {
  return Response.json(body, {
    status,
    headers: {
      ...headers,
      'Cache-Control': 'no-store',
      Vary: 'Origin',
      ...(origin && { 'Access-Control-Allow-Origin': origin }),
    },
  });
}

/** The Studio's preflight. Another origin gets no CORS headers, so its browser blocks the POST. */
export function OPTIONS(request: Request) {
  const origin = studioOrigin(request);
  if (!origin) {
    return new Response(null, { status: 403, headers: { Vary: 'Origin' } });
  }
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': `Content-Type, ${REQUEST_PROOF_HEADER}`,
      'Access-Control-Max-Age': '600',
      Vary: 'Origin',
    },
  });
}

export function GET(request: Request) {
  return respond(METHOD_NOT_ALLOWED, studioOrigin(request));
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

type Action =
  | { action: 'columns' }
  | { action: 'status' }
  | { action: 'hidden' }
  | { action: 'delete'; ids: string[] }
  | { action: 'linkable' }
  | { action: 'link'; project: string; plant: string }
  | { action: 'preview'; file: string; hideMissing: boolean }
  | { action: 'sync'; url: string; hideMissing: boolean }
  | {
      action: 'apply';
      file: string;
      hideMissing: boolean;
      token: string;
      source: BackupSource;
    };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/** A manual import's backup records its file name or its sheet link (AC-7.1). */
function readSource(value: unknown): BackupSource | null {
  if (!isRecord(value)) return null;
  const { kind, name, url } = value;
  if (
    kind === 'file' &&
    typeof name === 'string' &&
    name.trim() !== '' &&
    name.length <= MAX_FILE_NAME_LENGTH
  ) {
    return { kind, name };
  }
  if (kind === 'sheet' && typeof url === 'string' && isSheetLink(url)) {
    return { kind, url };
  }
  return null;
}

/** A published map project's ID, such as `plant-P-7`. */
const isId = (value: unknown): value is string =>
  typeof value === 'string' && value !== '';

/** The IDs to delete, at most `MAX_DELETE_IDS`. */
function readIds(value: unknown): string[] | null {
  if (
    !Array.isArray(value) ||
    value.length === 0 ||
    value.length > MAX_DELETE_IDS
  ) {
    return null;
  }
  return value.every(isId) ? value : null;
}

function readAction(value: unknown): Action | null {
  if (!isRecord(value)) return null;
  const { action, file, url, hideMissing, token } = value;
  if (
    action === 'columns' ||
    action === 'status' ||
    action === 'hidden' ||
    action === 'linkable'
  ) {
    return { action };
  }
  if (action === 'link') {
    const { project, plant } = value;
    return isId(project) && isId(plant) ? { action, project, plant } : null;
  }
  if (action === 'delete') {
    const ids = readIds(value.ids);
    return ids ? { action, ids } : null;
  }
  if (typeof hideMissing !== 'boolean') return null;
  if (action === 'sync') {
    return typeof url === 'string' ? { action, url, hideMissing } : null;
  }
  if (typeof file !== 'string') return null;
  if (action === 'preview') return { action, file, hideMissing };
  if (action !== 'apply' || typeof token !== 'string' || token === '') {
    return null;
  }
  const source = readSource(value.source);
  return source ? { action, file, hideMissing, token, source } : null;
}

function parseJson(body: Uint8Array): unknown {
  try {
    return JSON.parse(new TextDecoder().decode(body));
  } catch {
    return undefined;
  }
}

const COLUMNS_REPLY: RouteReply = {
  status: 200,
  body: {
    columns: COLUMN_KEYS.map((key) => ({
      key,
      header: COLUMNS[key].header,
      presence: COLUMNS[key].presence,
    })),
  },
};

/** Whether the starter load ran, and the feed's last file for the two-day warning (AC-4.13). */
async function readStatus(client: MapProjectsClient): Promise<RouteReply> {
  const [projects, feed] = await Promise.all([
    client.fetch<Pick<CurrentProject, 'plantId'>[]>(
      '*[_type == "casestudies"]{ plantId }',
    ),
    client.fetch<{
      last: FeedStatus | null;
      lastAcceptedAt: string | null;
    } | null>('*[_id == $id][0]{ last, lastAcceptedAt }', {
      id: FEED_STATUS_ID,
    }),
  ]);
  return {
    status: 200,
    body: {
      ready: starterLoadDone(projects),
      feed: {
        last: feed?.last ?? null,
        lastAcceptedAt: feed?.lastAcceptedAt ?? null,
      },
    },
  };
}

function previewReply(result: PreviewResult): RouteReply {
  switch (result.status) {
    case 'ready':
      return { status: 200, body: { result: 'ready', plan: result.plan } };
    case 'not-ready':
      return errorReply(
        503,
        'not-ready',
        'The website has no BlueIQ plants yet. Run the starter load first.',
      );
    case 'unreadable':
      return errorReply(422, result.error.reason, result.message);
    case 'rejected': {
      const { rejection } = result.plan;
      if (!rejection) throw new Error('A rejected plan has no rejection.');
      return {
        status: 422,
        body: {
          error: rejection.reason,
          message: rejection.message,
          plan: result.plan,
        },
      };
    }
  }
}

function importReply(result: ImportResult): RouteReply {
  switch (result.status) {
    case 'applied':
      for (const problem of result.problems) {
        console.warn(LOG, `${problem.stage} failed after the import applied`);
      }
      return {
        status: 200,
        body: {
          result: result.plan.writes ? 'applied' : 'no-changes',
          counts: result.plan.counts,
          backupId: result.backupId,
        },
      };
    case 'stale':
      return {
        status: 409,
        body: {
          error: 'stale',
          message:
            'Map projects changed after the preview, so nothing changed. Check the new preview, then apply it.',
          plan: result.plan,
        },
      };
    case 'busy':
      return BUSY;
    default:
      return previewReply(result);
  }
}

function removeReply(result: RemoveResult): RouteReply {
  switch (result.status) {
    case 'deleted':
      for (const problem of result.problems) {
        console.warn(LOG, `${problem.stage} failed after the delete`);
      }
      return {
        status: 200,
        body: {
          result: 'deleted',
          deleted: result.deleted,
          backupId: result.backupId,
        },
      };
    case 'refused':
      return {
        status: 409,
        body: {
          error: 'changed',
          message:
            'Nothing was deleted. The hidden list changed after the pane showed it. Check the new list and try again.',
          refused: result.refused,
        },
      };
    case 'busy':
      return BUSY;
  }
}

/** A case study's title in quotes, marked when only a draft links. */
const caseStudyName = ({ title, published }: LinkedDocument) =>
  `"${title ?? 'Untitled case study'}"${published ? '' : ' (draft)'}`;

function linkReply(result: LinkResult): RouteReply {
  switch (result.status) {
    case 'linked':
      for (const problem of result.problems) {
        console.warn(LOG, `${problem.stage} failed after the link`);
      }
      return {
        status: 200,
        body: {
          result: 'linked',
          project: result.project,
          plant: result.plant,
          backupId: result.backupId,
        },
      };
    case 'refused': {
      if (result.reason !== 'case-studies') {
        return errorReply(
          409,
          'changed',
          'Nothing changed. The website project or the plant changed after the pane showed it. Check the lists and try again.',
        );
      }
      const { plant, caseStudies } = result;
      return {
        status: 409,
        body: {
          error: 'case-study',
          message: `Nothing changed. Case studies link to ${plant.name}, Plant ID ${plant.plantId}: ${caseStudies.map(caseStudyName).join(', ')}. Point each case study at the website project instead, then link again.`,
          plant,
          caseStudies,
        },
      };
    }
    case 'busy':
      return BUSY;
  }
}

/** A failed backup or write becomes a reply that names its stage (AC-7.1). */
async function guarded(change: () => Promise<RouteReply>) {
  try {
    return await change();
  } catch (cause) {
    if (!(cause instanceof ChangeFailure)) throw cause;
    logFailure(LOG, cause.stage, cause.cause);
    return errorReply(500, `${cause.stage}-failed`, cause.message);
  }
}

const encode = (file: string) => new TextEncoder().encode(file);

/** Keeps a byte order mark, so the file that the pane sends back has the same bytes. */
const decode = (file: Uint8Array) =>
  new TextDecoder('utf-8', { ignoreBOM: true }).decode(file);

async function sync(
  client: MapProjectsClient,
  url: string,
  hideMissing: boolean,
): Promise<RouteReply> {
  const sheet = await fetchSheet(url);
  if (!sheet.ok) return errorReply(422, sheet.error, sheet.message);
  const result = await previewImport(client, {
    file: sheet.file,
    options: { hideMissing },
  });
  const reply = previewReply(result);
  return result.status === 'ready'
    ? { ...reply, body: { ...reply.body, file: decode(sheet.file) } }
    : reply;
}

async function run(
  action: Action,
  client: MapProjectsClient,
  person: string,
  now: Date,
): Promise<RouteReply> {
  switch (action.action) {
    case 'columns':
      return COLUMNS_REPLY;
    case 'status':
      return readStatus(client);
    case 'preview':
      return previewReply(
        await previewImport(client, {
          file: encode(action.file),
          options: { hideMissing: action.hideMissing },
        }),
      );
    case 'sync':
      return sync(client, action.url, action.hideMissing);
    case 'apply':
      return guarded(async () =>
        importReply(
          await applyImport(client, {
            file: encode(action.file),
            options: { hideMissing: action.hideMissing },
            token: action.token,
            source: action.source,
            person,
            now,
          }),
        ),
      );
    case 'hidden':
      return { status: 200, body: { projects: await listHidden(client) } };
    case 'delete':
      return guarded(async () =>
        removeReply(
          await removeHidden(client, { ids: action.ids, person, now }),
        ),
      );
    case 'linkable':
      return { status: 200, body: await listLinkOptions(client) };
    case 'link':
      return guarded(async () =>
        linkReply(
          await linkProject(client, {
            project: action.project,
            plant: action.plant,
            person,
            now,
          }),
        ),
      );
  }
}

function refuse(reason: string): RouteReply {
  console.warn(LOG, `refused a request: ${reason}`);
  return FORBIDDEN;
}

/** Checks the request in order, then runs its action. The proof goes before the body is read. */
async function handle(
  request: Request,
): Promise<{ action?: string; reply: RouteReply }> {
  const proof = request.headers.get(REQUEST_PROOF_HEADER);
  if (!isProofHeader(proof)) return { reply: refuse('no-proof') };
  if (!hasMediaType(request.headers.get('content-type'), 'application/json')) {
    return { reply: UNSUPPORTED_TYPE };
  }
  if (Number(request.headers.get('content-length')) > MAX_REQUEST_BYTES) {
    return { reply: TOO_BIG };
  }

  const now = new Date();
  let client: MapProjectsClient;
  try {
    client = writeClient();
  } catch (cause) {
    // writeClient's own messages name a missing setting, never a secret.
    console.error(LOG, cause instanceof Error ? cause.message : cause);
    return { reply: SERVER_ERROR };
  }

  try {
    const taken = await takeProof(client, proof, now);
    if (!taken.ok) return { reply: refuse(taken.reason) };
    const body = await readCapped(request.body, MAX_REQUEST_BYTES);
    if (!body) return { reply: TOO_BIG };
    if (bodyHash(body) !== taken.bodyHash) return { reply: refuse('mismatch') };

    try {
      await pruneProofs(client, now);
    } catch (cause) {
      logFailure(LOG, 'deleting expired proofs', cause);
    }

    const action = readAction(parseJson(body));
    if (!action) return { reply: BAD_REQUEST };
    return {
      action: action.action,
      reply: await run(action, client, taken.person, now),
    };
  } catch (cause) {
    logFailure(LOG, 'the request', cause);
    return { reply: SERVER_ERROR };
  }
}

export async function POST(request: Request) {
  const origin = studioOrigin(request);
  if (!origin) {
    console.warn(LOG, 'refused a request from another origin');
    return respond(FORBIDDEN, null);
  }
  const { action = '-', reply } = await handle(request);
  const { body } = reply;
  console.info(
    LOG,
    action,
    reply.status,
    'error' in body ? body.error : 'result' in body ? body.result : 'ok',
  );
  return respond(reply, origin);
}
