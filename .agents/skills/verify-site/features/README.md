# verify-site journeys

Each file names one journey: its prerequisites, entry point, actions, expected result, evidence, and limits.
Run commands from `bluepath-frontend-ts/`. `scripts/` means `.agents/skills/verify-site/scripts/`.

| Journey | Criteria | Proven |
| --- | --- | --- |
| [baselines.md](baselines.md) | Must Not Break pages, AC-2.9 widths | 2026-11-04 at `4448905`, local and live |
| [map-overlap.md](map-overlap.md) | AC-2.9 | helper proven on the live map at `4448905`; the new map does not exist yet |
| [routes.md](routes.md) | the feed route and the Studio route | feed route at `500e502` and Studio route at `c1b715c`, local on `development` |

Update the Proven column when a journey runs against a new revision.
