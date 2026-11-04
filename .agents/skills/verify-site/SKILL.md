---
name: verify-site
description: Launch the BluePath website on a local dev server and check pages and routes in a real browser. Use to capture page baselines, check the projects map for overlaps, or call the website's API routes. For unit tests, run `pnpm test` instead.
---

# Verify the BluePath website

These scripts run the Next.js site locally and drive it with `agent-browser`.
Run every command from `bluepath-frontend-ts/`.
The scripts live in `.agents/skills/verify-site/scripts/`. This file calls that folder `scripts/`.

Captured at revision `4448905` on branch `feat/case-studies`.
It covers `app/`, `components/`, `lib/`, `sanity/`, `next.config.ts`, and `netlify.toml`.
`scripts/doctor.sh` warns when a covered file changed since then.

## Launch

```sh
.agents/skills/verify-site/scripts/server.sh start                        # dataset production
.agents/skills/verify-site/scripts/server.sh start --dataset development  # test copy
```

- The server listens on port 3000. Set `VERIFY_SITE_PORT` to use another port.
- The script runs `pnpm exec next dev` rather than `pnpm dev`. `pnpm dev` runs `predev`, which rewrites the committed `sanity.schema.json`.
- `--dataset` sets `NEXT_PUBLIC_SANITY_DATASET` in the server's environment. Next.js lets that value win over `.env.local`.
- The server is ready when `/` answers 200. The script prints `ready: ...` and then returns.
- The script refuses to start when it already owns a server, or when another process holds the port.
- State lives in the run directory: `VERIFY_SITE_RUN_DIR`, or `$TMPDIR/verify-site-<port>` by default. It holds `server.env` and `next-dev.log`.

The `development` dataset must exist before you start against it. Task T006 creates it.

## Doctor

```sh
.agents/skills/verify-site/scripts/doctor.sh
```

Doctor only reads. It checks the checkout, revision drift, Node, the tools, dependencies, and the names of the env vars in `.env.local`. It never prints their values.
When a server runs, it reports the dataset from the saved state and from the server's own environment. It also says whether writes are allowed.
It exits 1 when a required check fails. Warnings do not fail it.

## Drive

Each helper opens a fresh `agent-browser` session and closes it on exit.
Every helper needs an evidence directory from `--out DIR` or `VERIFY_SITE_EVIDENCE`.
Pass `--base https://bluepathfinance.com` to read the live site instead of the local server.

**Baselines.** This captures pages at six viewports: 320×568, 375×667, 768×1024, 1024×768, 1280×720, and 1440×900.

```sh
.agents/skills/verify-site/scripts/baseline.sh --out DIR [--base URL] [--article /news/SLUG/] [PATH ...]
```

With no paths, it captures `/`, `/projects/`, `/news-and-events/`, and the first `/news/` article linked from `/news-and-events/`.
Each capture has a first-screen PNG, a full-page PNG, and a JSON file of metrics. The JSON reports sideways scrolling, the page height, pending images, and whether Google Maps showed its error box.

**Map overlaps.** This checks named elements against each other and against Google's logo and attribution.

```sh
.agents/skills/verify-site/scripts/overlap.sh --url /projects/ --out DIR \
  map='[data-map-root]' legend='[data-map-legend]' panel='[data-map-panel]' \
  --min-target '[data-map-legend] button' --min-size 24
```

- Each `name=SELECTOR` item counts every visible match.
- An element never overlaps its own ancestor. So the map does not overlap Google's logo inside it.
- `--allow a:b` permits one pair to overlap.
- `--min-target` fails when a match is smaller than `--min-size` pixels, or when nothing matches.
  Keep it narrow. Google's attribution bar holds a 14 px "Keyboard shortcuts" button, so `.gm-style button` always fails.
  To cover Google's controls, use `'.gm-style button:not(.gm-style-cc *):not(.gm-style-cc)'`.
- Each viewport also fails when the page scrolls sideways.
- It waits for `.gm-style-cc`, Google's attribution, before it measures. Change that with `--wait`.
- The script exits 1 when any viewport fails, and it lists each failure.

The selectors above are examples. Use the ones that the map component actually renders.

**Routes.** This sends one request to the local server and never follows redirects.

```sh
.agents/skills/verify-site/scripts/route.sh METHOD PATH [--file BODY] [--content-type TYPE] \
  [--secret-header NAME=ENV_VAR] [--origin ORIGIN] [--expect STATUS] [--out DIR]
```

- It prints the status, the `Location` header, a few other headers, and the first 600 bytes of the body.
- `--secret-header x-blueiq-key=BLUEIQ_FEED_KEY` reads the value from that env var. The value goes to curl through stdin and never prints.
- GET, HEAD, and OPTIONS need an owned server.
- Every other method needs an owned server on the `development` dataset. Otherwise it refuses.
- A path without its trailing slash returns 308, because `next.config.ts` sets `trailingSlash: true`.

## Evidence

For the case-studies work, evidence goes in `../.claude/specs/feat/case-studies/.mk-goal/evidence/<journey>/`.
Never point `--out` at the run directory. The run directory is disposable.

| Helper | Files |
| --- | --- |
| `baseline.sh` | `manifest.txt`, `<page>--<viewport>.png`, `<page>--<viewport>-full.png`, `<page>--<viewport>.json` |
| `overlap.sh` | `overlap-config.json`, `overlap-<viewport>.json`, `overlap-<viewport>.png` |
| `route.sh --out` | `route-<method><path>-<time>.headers.txt` and `.body.txt` |

## Cleanup

```sh
.agents/skills/verify-site/scripts/server.sh stop
```

- `stop` ends the server's whole process group by its saved PID. It never matches by name.
- It keeps the log and renames `server.env` to `server.env.stopped`.
- After a failed run, call `stop` before you retry. Then check that `server.sh status` says `stopped`.
- Helpers close their browser sessions on exit. `agent-browser session list` shows any leftover `verify-site-*` session. Close one with `agent-browser --session NAME close`.
- Evidence stays where `--out` put it.

## Limits

- Writes stay local. No helper writes to a remote site or to the `production` dataset.
- Google Maps fails on `localhost:3000` until the browser key allows `http://localhost:3000/*`. Until then, local map journeys show Google's error box. Use `--base https://bluepathfinance.com` for read-only map checks.
- `/api/blueiq/plants/` and `/api/map-projects/` do not exist at revision `4448905`. Before they exist, both return 404.
- One-finger and two-finger touch checks need a manual step or a touch-capable driver. `overlap.sh` does not test them.

Journeys live in `features/`. Start with `features/README.md`.
