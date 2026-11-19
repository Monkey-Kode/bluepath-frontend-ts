import {
  createServer,
  type IncomingHttpHeaders,
  type IncomingMessage,
  request as httpRequest,
} from 'node:http';
import type { AddressInfo } from 'node:net';

/** A route module's exports, such as `GET` and `POST`. */
type RouteModule = Record<string, unknown>;
type Handler = (request: Request) => Response | Promise<Response>;

const METHODS = ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'];

/** How long a reply waits for an upload that may never finish. */
const UPLOAD_GRACE_MS = 200;

/**
 * The upload as a web stream without backpressure. The server keeps reading after a route stops,
 * as a buffering host such as Netlify does, so a client is never cut off mid-send.
 */
function bodyOf(message: IncomingMessage) {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      message.on('data', (chunk: Buffer) => controller.enqueue(chunk));
      message.on('end', () => controller.close());
      message.on('error', (error) => controller.error(error));
    },
  });
}

/** Resolves when the upload ends, or after the grace period for one that never does. */
function uploadEnded(message: IncomingMessage) {
  if (message.readableEnded) return Promise.resolve();
  message.resume();
  return new Promise<void>((resolve) => {
    const timer = setTimeout(resolve, UPLOAD_GRACE_MS);
    message.once('end', () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

function toRequest(message: IncomingMessage, origin: string) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(message.headers)) {
    for (const item of Array.isArray(value) ? value : [value]) {
      if (item !== undefined) headers.append(name, item);
    }
  }
  const method = message.method ?? 'GET';
  const hasBody = method !== 'GET' && method !== 'HEAD';
  return new Request(new URL(message.url ?? '/', origin), {
    method,
    headers,
    body: hasBody ? bodyOf(message) : undefined,
    // Node's fetch needs this for a streamed request body.
    duplex: 'half',
  } as RequestInit);
}

export interface RouteServer {
  url: string;
  /** Errors that a handler threw. Next would reply 500 to each one. */
  errors: unknown[];
  close(): Promise<void>;
}

/**
 * Serves a Next route module over real HTTP on a free local port. A method the module doesn't
 * export gets an empty 405, as Next gives it.
 */
export async function serveRoute(route: RouteModule): Promise<RouteServer> {
  const errors: unknown[] = [];
  const server = createServer(async (message, res) => {
    const method = message.method ?? 'GET';
    const handler = METHODS.includes(method)
      ? (route[method] as Handler | undefined)
      : undefined;
    if (!handler) {
      res.writeHead(405).end();
      return;
    }
    try {
      const response = await handler(toRequest(message, origin));
      res.writeHead(response.status, [...response.headers].flat());
      if (response.body) {
        for await (const chunk of response.body) res.write(chunk);
      }
    } catch (error) {
      errors.push(error);
      if (!res.headersSent) res.writeHead(500);
    }
    await uploadEnded(message);
    res.end();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const { port } = server.address() as AddressInfo;
  const origin = `http://127.0.0.1:${port}`;
  return {
    url: origin,
    errors,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.closeAllConnections();
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

export interface SendOptions {
  method?: string;
  headers?: Record<string, string>;
  /** Sent whole, with a `Content-Length`. */
  body?: Uint8Array | string;
  /**
   * Sent one by one with chunked transfer and no `Content-Length`. Sending stops once the reply
   * arrives, as a real client's would.
   */
  chunks?: Iterable<Uint8Array>;
}

export interface Reply {
  status: number;
  headers: IncomingHttpHeaders;
  text: string;
}

/** Sends one request with `node:http`, so a test controls the body's framing. */
export function send(
  url: string,
  { method = 'POST', headers = {}, body, chunks }: SendOptions = {},
): Promise<Reply> {
  return new Promise((resolve, reject) => {
    let replied = false;
    // A fresh connection each time, so a body cut short can't spill into the next request.
    const outgoing = httpRequest(
      url,
      { method, headers, agent: false },
      (incoming) => {
        replied = true;
        const parts: Buffer[] = [];
        incoming.on('data', (part: Buffer) => parts.push(part));
        incoming.on('error', reject);
        incoming.on('end', () =>
          resolve({
            status: incoming.statusCode ?? 0,
            headers: incoming.headers,
            text: Buffer.concat(parts).toString('utf8'),
          }),
        );
      },
    );
    // A server that replies before the body ends may close the socket under the rest.
    outgoing.on('error', (error) => {
      if (!replied) reject(error);
    });

    if (!chunks) {
      outgoing.end(body);
      return;
    }
    const iterator = chunks[Symbol.iterator]();
    const writeNext = () => {
      for (;;) {
        if (replied || outgoing.destroyed) return;
        const next = iterator.next();
        if (next.done) {
          outgoing.end();
          return;
        }
        if (!outgoing.write(next.value)) {
          outgoing.once('drain', writeNext);
          return;
        }
      }
    };
    writeNext();
  });
}
