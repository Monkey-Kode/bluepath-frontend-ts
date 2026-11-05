/**
 * Helpers that BlueIQ's upload address and the Studio's route share. Replies name a problem by
 * code, and logs hold only codes, never a key, a proof, or a file (NFR-007).
 */

export interface ErrorBody {
  error: string;
  message: string;
}

export interface Reply<Body> {
  status: number;
  body: Body;
  headers?: Record<string, string>;
}

export const errorReply = (
  status: number,
  code: string,
  message: string,
  headers?: Record<string, string>,
): Reply<ErrorBody> => ({ status, body: { error: code, message }, headers });

/** True when a `Content-Type` header names the media type, whatever its parameters. */
export function hasMediaType(contentType: string | null, mediaType: string) {
  return contentType?.split(';')[0]?.trim().toLowerCase() === mediaType;
}

/**
 * Reads the body, or returns null once it passes `limit` bytes. It then releases the stream
 * unread, so a caller may cancel it.
 */
export async function readCapped(
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
    if (size > limit) {
      reader.releaseLock();
      return null;
    }
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

/** Logs only an error's name and status code. Sanity's error text can quote the file. */
export function logFailure(log: string, stage: string, cause: unknown) {
  const name = cause instanceof Error ? cause.name : typeof cause;
  const statusCode =
    typeof cause === 'object' && cause !== null && 'statusCode' in cause
      ? cause.statusCode
      : undefined;
  console.error(log, `${stage} failed`, { name, statusCode });
}
