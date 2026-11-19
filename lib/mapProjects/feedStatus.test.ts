// @vitest-environment node
import { describe, expect, it } from 'vitest';

import { FEED_STATUS_ID, type FeedReply, recordFeedStatus } from './feedStatus';
import { fakeSanity } from './testing/fakeSanity';

const APPLIED = {
  result: 'applied',
  counts: {
    created: 1,
    updated: 2,
    unchanged: 3,
    skipped: 1,
    hidden: 0,
    returned: 0,
  },
  skipped: [
    {
      row: 4,
      plantId: 'P-4',
      reasons: [{ reason: 'bad-size', message: 'Size ($) is not a number.' }],
    },
  ],
} satisfies FeedReply;

const REJECTED = {
  error: 'missing-columns',
  message: 'The file is missing these columns: State.',
} satisfies FeedReply;

describe('recordFeedStatus', () => {
  it("records the last file's time, status, and reply (AC-4.13)", async () => {
    const sanity = fakeSanity();

    await recordFeedStatus(sanity, {
      receivedAt: '2026-11-04T12:00:00.000Z',
      status: 200,
      reply: APPLIED,
    });

    expect(sanity.get(FEED_STATUS_ID)).toMatchObject({
      _type: FEED_STATUS_ID,
      last: {
        receivedAt: '2026-11-04T12:00:00.000Z',
        status: 200,
        reply: APPLIED,
      },
      lastAcceptedAt: '2026-11-04T12:00:00.000Z',
    });
    expect(sanity.transactions).toHaveLength(1);
  });

  it('keeps the last accepted time when a later file is rejected (AC-4.13)', async () => {
    const sanity = fakeSanity();
    await recordFeedStatus(sanity, {
      receivedAt: '2026-11-04T12:00:00.000Z',
      status: 200,
      reply: APPLIED,
    });

    await recordFeedStatus(sanity, {
      receivedAt: '2026-11-05T12:00:00.000Z',
      status: 422,
      reply: REJECTED,
    });

    expect(sanity.get(FEED_STATUS_ID)).toMatchObject({
      last: {
        receivedAt: '2026-11-05T12:00:00.000Z',
        status: 422,
        reply: REJECTED,
      },
      lastAcceptedAt: '2026-11-04T12:00:00.000Z',
    });
  });

  it('has no accepted time until a file gets a 200', async () => {
    const sanity = fakeSanity();

    await recordFeedStatus(sanity, {
      receivedAt: '2026-11-04T12:00:00.000Z',
      status: 409,
      reply: { error: 'busy', message: 'Another change is running.' },
    });

    expect(sanity.get(FEED_STATUS_ID)).not.toHaveProperty('lastAcceptedAt');
  });
});
