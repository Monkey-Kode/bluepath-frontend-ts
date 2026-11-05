import { MAX_FILE_BYTES } from './parseCsv';
import { hasMediaType, readCapped } from './replies';

/**
 * Pulls a Google Sheet's "Publish to web" CSV (FR-015). The website fetches only a
 * `https://docs.google.com/spreadsheets/` link and follows redirects only to Google hosts, so an
 * editor's link can't make the website call another server.
 */

/** Google sends a published sheet through one or two redirects. */
const MAX_REDIRECTS = 5;

/** How long the whole pull may take, redirects included. */
const SHEET_TIMEOUT_MS = 20_000;

export type SheetError =
  | 'bad-sheet-link'
  | 'sheet-redirect'
  | 'sheet-unreachable'
  | 'sheet-not-csv'
  | 'too-big';

export type SheetResult =
  | { ok: true; file: Uint8Array }
  | { ok: false; error: SheetError; message: string };

const BAD_LINK = `Use the sheet's "Publish to web" CSV link. It starts with https://docs.google.com/spreadsheets/.`;

function parse(link: string, base?: URL) {
  try {
    return new URL(link, base);
  } catch {
    return null;
  }
}

const plainHttps = (url: URL) =>
  url.protocol === 'https:' && !url.username && !url.password && !url.port;

/** True for a published sheet's link, the only kind the website fetches. */
export function isSheetLink(link: string) {
  const url = parse(link);
  return (
    url !== null &&
    plainHttps(url) &&
    url.hostname === 'docs.google.com' &&
    url.pathname.startsWith('/spreadsheets/')
  );
}

/** True for a host that a published sheet's redirects may lead to. */
function isGoogleHost(url: URL) {
  const host = url.hostname;
  return (
    plainHttps(url) &&
    (host.endsWith('.google.com') || host.endsWith('.googleusercontent.com'))
  );
}

const fail = (error: SheetError, message: string): SheetResult => ({
  ok: false,
  error,
  message,
});

const REDIRECT_AWAY = fail(
  'sheet-redirect',
  'The sheet link led away from Google, so the website stopped. Check the link.',
);
const UNREACHABLE = fail(
  'sheet-unreachable',
  "The website couldn't reach the sheet. Try again in a few minutes.",
);
const TOO_BIG = fail('too-big', 'The sheet is larger than 5 MB.');

const isRedirect = (response: Response) =>
  response.status >= 300 &&
  response.status < 400 &&
  response.headers.has('location');

async function readSheet(response: Response): Promise<SheetResult> {
  if (!response.ok) {
    return fail(
      'sheet-unreachable',
      `Google answered the sheet link with status ${response.status}. Check that the sheet is still published to the web.`,
    );
  }
  if (!hasMediaType(response.headers.get('content-type'), 'text/csv')) {
    return fail(
      'sheet-not-csv',
      'The link gave a web page, not a CSV file. Publish the sheet as "Comma-separated values (.csv)" and copy that link.',
    );
  }
  if (Number(response.headers.get('content-length')) > MAX_FILE_BYTES) {
    return TOO_BIG;
  }
  const file = await readCapped(response.body, MAX_FILE_BYTES);
  return file ? { ok: true, file } : TOO_BIG;
}

/** Fetches the sheet's CSV, or names why it can't (AC-4.8). */
export async function fetchSheet(link: string): Promise<SheetResult> {
  if (!isSheetLink(link)) return fail('bad-sheet-link', BAD_LINK);

  const signal = AbortSignal.timeout(SHEET_TIMEOUT_MS);
  let url = new URL(link);
  for (let redirects = 0; ; redirects += 1) {
    let response: Response;
    try {
      // `fetch` is read at call time, so tests can stub it.
      response = await fetch(url, {
        redirect: 'manual',
        signal,
        headers: { accept: 'text/csv' },
      });
    } catch {
      return UNREACHABLE;
    }

    if (!isRedirect(response)) {
      try {
        return await readSheet(response);
      } catch {
        return UNREACHABLE;
      } finally {
        // A refused or overlong reply goes unread.
        await response.body?.cancel().catch(() => {});
      }
    }

    await response.body?.cancel().catch(() => {});
    const next = parse(response.headers.get('location') ?? '', url);
    if (redirects >= MAX_REDIRECTS || !next || !isGoogleHost(next)) {
      return REDIRECT_AWAY;
    }
    url = next;
  }
}
