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
import {
  errorReply,
  hasMediaType,
  logFailure,
  readCapped,
  type Reply,
} from '@/lib/mapProjects/replies';
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

type FeedResponse = Reply<FeedReply>;

const METHOD_NOT_ALLOWED = errorReply(
  405,
  'method-not-allowed',
  'Send the file with POST.',
  { Allow: 'POST' },
);
const NOT_CONFIGURED = errorReply(
  503,
  'not-configured',
  'The feed is not set up on the website yet.',
);
const UNAUTHORIZED = errorReply(
  401,
  'unauthorized',
  'The X-API-Key header is missing or wrong.',
);
const UNSUPPORTED_TYPE = errorReply(
  415,
  'unsupported-type',
  'Send the file as text/csv.',
);
const TOO_BIG = errorReply(413, 'too-big', 'The file is larger than 5 MB.');
const SERVER_ERROR = errorReply(
  500,
  'server-error',
  'The website could not take the file. Try again later.',
);

function respond({ status, body, headers }: FeedResponse) {
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

function importReply(result: ImportResult): FeedResponse {
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
      return errorReply(
        503,
        'not-ready',
        'The website has no BlueIQ plants yet. It takes files once the starter load runs.',
      );
    case 'unreadable':
      return result.error.reason === 'too-big'
        ? TOO_BIG
        : errorReply(422, result.error.reason, result.message);
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
      return errorReply(
        409,
        'busy',
        'Another change to the map is running. Try again in a few minutes.',
        { 'Retry-After': String(RETRY_AFTER_SECONDS) },
      );
    case 'stale':
      throw new Error('The feed sends no preview token.');
  }
}

async function accept(
  request: Request,
  client: MapProjectsClient,
  now: Date,
): Promise<FeedResponse> {
  if (!hasMediaType(request.headers.get('content-type'), 'text/csv')) {
    return UNSUPPORTED_TYPE;
  }
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
      logFailure(LOG, cause.stage, cause.cause);
      return errorReply(500, `${cause.stage}-failed`, cause.message);
    }
    logFailure(LOG, 'import', cause);
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
    logFailure(LOG, 'saving the feed status', cause);
  }
  console.info(
    LOG,
    reply.status,
    'error' in reply.body ? reply.body.error : reply.body.result,
  );
  return respond(reply);
}
