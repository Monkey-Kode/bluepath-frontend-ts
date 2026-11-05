import { createHash, timingSafeEqual } from 'node:crypto';

import {
  ChangeFailure,
  applyImport,
  type ImportResult,
} from '@/lib/mapProjects/apply';
import { FEED_PERSON } from '@/lib/mapProjects/backups';
import {
  type FeedReply,
  recordFeedStatus,
  type SkippedRow,
} from '@/lib/mapProjects/feedStatus';
import { MAX_FILE_BYTES } from '@/lib/mapProjects/parseCsv';
import type { ImportPlan } from '@/lib/mapProjects/plan';
import type { MapProjectsClient } from '@/lib/mapProjects/store';
import { writeClient } from '@/sanity/lib/writeClient';

/**
 * BlueIQ's upload address for its daily plant file (D-28, D-29, D-39). The checks run in the order
 * in AC-4.9. Replies never repeat the key or the file, and logs hold only codes (NFR-007).
 */

/** NFR-007 asks for 32 random bytes, so a shorter key is a setup mistake. */
const MIN_KEY_LENGTH = 32;

/** BlueIQ retries a 409 after this many seconds, once the lock has expired. */
const RETRY_AFTER_SECONDS = 120;

const LOG = '[blueiq-feed]';

interface Reply {
  status: number;
  body: FeedReply;
  headers?: Record<string, string>;
}

const error = (
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Reply => ({ status, body: { error: code, message }, headers });

const METHOD_NOT_ALLOWED = error(
  405,
  'method-not-allowed',
  'Send the file with POST.',
  { Allow: 'POST' },
);
const NOT_CONFIGURED = error(
  503,
  'not-configured',
  'The feed is not set up on the website yet.',
);
const UNAUTHORIZED = error(
  401,
  'unauthorized',
  'The X-API-Key header is missing or wrong.',
);
const UNSUPPORTED_TYPE = error(
  415,
  'unsupported-type',
  'Send the file as text/csv.',
);
const TOO_BIG = error(413, 'too-big', 'The file is larger than 5 MB.');
const SERVER_ERROR = error(
  500,
  'server-error',
  'The website could not take the file. Try again later.',
);

function respond({ status, body, headers }: Reply) {
  return Response.json(body, { status, headers });
}

export function GET() {
  return respond(METHOD_NOT_ALLOWED);
}
export const PUT = GET;
export const PATCH = GET;
export const DELETE = GET;

const digest = (value: string) => createHash('sha256').update(value).digest();

/** Equal-length digests let `timingSafeEqual` compare keys of any length in constant time. */
const keyMatches = (sent: string | null, key: string) =>
  sent !== null && timingSafeEqual(digest(sent), digest(key));

function isCsv(contentType: string | null) {
  const mediaType = contentType?.split(';')[0]?.trim().toLowerCase();
  return mediaType === 'text/csv';
}

/** Reads the body, or returns null once it passes `limit` bytes. */
async function readCapped(
  body: ReadableStream<Uint8Array> | null,
  limit: number,
): Promise<Uint8Array | null> {
  if (!body) return new Uint8Array();
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    // The rest goes unread. Cancelling could close the connection before the reply.
    if (size > limit) return null;
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** The skipped rows. A Plant ID stays only when it is valid, so no bad cell is repeated. */
function skippedRows(plan: ImportPlan): SkippedRow[] {
  return plan.rows.flatMap((row) =>
    row.action === 'error'
      ? [
          {
            row: row.row,
            plantId: row.errors.some(({ reason }) => reason === 'bad-plant-id')
              ? null
              : row.plantId,
            reasons: row.errors,
          },
        ]
      : [],
  );
}

function importReply(result: ImportResult): Reply {
  switch (result.status) {
    case 'applied':
      return {
        status: 200,
        body: {
          result: result.plan.writes ? 'applied' : 'no-changes',
          counts: result.plan.counts,
          skipped: skippedRows(result.plan),
        },
      };
    case 'not-ready':
      return error(
        503,
        'not-ready',
        'The website has no BlueIQ plants yet. It takes files once the starter load runs.',
      );
    case 'unreadable':
      return result.error.reason === 'too-big'
        ? TOO_BIG
        : error(422, result.error.reason, result.message);
    case 'rejected': {
      const { rejection } = result.plan;
      if (!rejection) throw new Error('A rejected plan has no rejection.');
      return {
        status: 422,
        body: {
          error: rejection.reason,
          message: rejection.message,
          skipped: skippedRows(result.plan),
        },
      };
    }
    case 'busy':
      return error(
        409,
        'busy',
        'Another change to the map is running. Try again in a few minutes.',
        { 'Retry-After': String(RETRY_AFTER_SECONDS) },
      );
    case 'stale':
      throw new Error('The feed sends no preview token.');
  }
}

/** Logs only an error's name and status code. Sanity's error text can quote the file. */
function logFailure(stage: string, cause: unknown) {
  const name = cause instanceof Error ? cause.name : typeof cause;
  const statusCode =
    typeof cause === 'object' && cause !== null && 'statusCode' in cause
      ? cause.statusCode
      : undefined;
  console.error(LOG, `${stage} failed`, { name, statusCode });
}

async function accept(
  request: Request,
  client: MapProjectsClient,
  now: Date,
): Promise<Reply> {
  if (!isCsv(request.headers.get('content-type'))) return UNSUPPORTED_TYPE;
  if (Number(request.headers.get('content-length')) > MAX_FILE_BYTES) {
    return TOO_BIG;
  }

  try {
    const file = await readCapped(request.body, MAX_FILE_BYTES);
    if (!file) return TOO_BIG;
    const result = await applyImport(client, {
      file,
      options: { hideMissing: true },
      source: { kind: 'feed' },
      person: FEED_PERSON,
      now,
    });
    if (result.status === 'applied') {
      for (const problem of result.problems) {
        console.warn(LOG, `${problem.stage} failed after the file applied`);
      }
    }
    return importReply(result);
  } catch (cause) {
    if (cause instanceof ChangeFailure) {
      logFailure(cause.stage, cause.cause);
      return error(500, `${cause.stage}-failed`, cause.message);
    }
    logFailure('import', cause);
    return SERVER_ERROR;
  }
}

export async function POST(request: Request) {
  const key = process.env.BLUEIQ_FEED_KEY;
  if (!key || key.length < MIN_KEY_LENGTH) {
    console.error(
      LOG,
      'BLUEIQ_FEED_KEY is unset or shorter than 32 characters',
    );
    return respond(NOT_CONFIGURED);
  }
  if (!keyMatches(request.headers.get('x-api-key'), key)) {
    console.warn(LOG, 'refused a request with a missing or wrong key');
    return respond(UNAUTHORIZED);
  }

  const now = new Date();
  let client: MapProjectsClient;
  try {
    client = writeClient();
  } catch (cause) {
    // writeClient's own messages name a missing setting, never a secret.
    console.error(LOG, cause instanceof Error ? cause.message : cause);
    return respond(SERVER_ERROR);
  }

  const reply = await accept(request, client, now);
  try {
    await recordFeedStatus(client, {
      receivedAt: now.toISOString(),
      status: reply.status,
      reply: reply.body,
    });
  } catch (cause) {
    logFailure('saving the feed status', cause);
  }
  console.info(
    LOG,
    reply.status,
    'error' in reply.body ? reply.body.error : reply.body.result,
  );
  return respond(reply);
}
