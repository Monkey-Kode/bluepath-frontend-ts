import type { ImportPlan, PlanErrorReason } from './plan';
import type { MapProjectsClient } from './store';
import type { RowIssue } from './validate';

/** The feed's status document. The dot keeps it out of public reads. */
export const FEED_STATUS_ID = 'mapProjects.feedStatus';

/** A row that the feed skipped, as the reply and the pane list it (D-38). */
export interface SkippedRow {
  row: number;
  /** Null when the row has no valid Plant ID, so a reply never repeats a bad cell. */
  plantId: string | null;
  reasons: RowIssue<PlanErrorReason>[];
}

/** The upload address's JSON reply. It never repeats the key or the file (AC-4.9). */
export type FeedReply =
  | {
      result: 'applied' | 'no-changes';
      counts: ImportPlan['counts'];
      skipped: SkippedRow[];
    }
  | { error: string; message: string; skipped?: SkippedRow[] };

export interface FeedStatus {
  receivedAt: string;
  /** The HTTP status of the reply. */
  status: number;
  reply: FeedReply;
}

/**
 * Records the reply to a request with a valid key as the feed's last file (AC-4.13). A 200 also
 * sets `lastAcceptedAt`, which the pane's two-day warning reads.
 */
export async function recordFeedStatus(
  client: MapProjectsClient,
  last: FeedStatus,
) {
  await client.mutate([
    { createIfNotExists: { _id: FEED_STATUS_ID, _type: FEED_STATUS_ID } },
    {
      patch: {
        id: FEED_STATUS_ID,
        set: {
          last,
          ...(last.status === 200 && { lastAcceptedAt: last.receivedAt }),
        },
      },
    },
  ]);
}
