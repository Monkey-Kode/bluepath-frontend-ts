# Fix list

Defects in this repository's code, config, scripts, or tests that a change would prevent.
Sessions do not load this file. `lessons show` prints how many items are open, and consolidation
works them.

One line per item, newest at the bottom: `- YYYY-MM-DD · bluepath-frontend-ts · defect · done when`. Record one
with `lessons fix . "<defect>" "<done when>"`. A repeat bumps its ×N count. Once the done-when
check exists, close the item with `lessons close <id> --by "<what fixed it>"`.

## Open

- 2026-11-16 · bluepath-frontend-ts · Faded legend and key text (#62729a) drops to about 4.07:1 over shaded states through the 85% white overlay, below WCAG AA 4.5:1. · A contrast check of --color-legend-faded composited over each state shade and the map's land color measures at least 4.5:1.
