# Page baselines

Captures the pages that the case-studies work touches, so later changes can be compared.

- **Prerequisites:** `scripts/doctor.sh` passes. For a local run, `scripts/server.sh start` printed `ready`.
- **Entry point:** `scripts/baseline.sh`.
- **Actions:**
  1. `scripts/baseline.sh --out ../.claude/specs/feat/case-studies/.mk-goal/evidence/baselines/local`
  2. `scripts/baseline.sh --base https://bluepathfinance.com --out ../.claude/specs/feat/case-studies/.mk-goal/evidence/baselines/live`
- **Expected result:** each page has 18 files, which are 3 per viewport. Every JSON file shows `"horizontalScroll": false`.
  Today, `/projects/` shows `"mapError": true` locally because of the key restriction. It shows `false` on the live site.
- **Evidence:** `manifest.txt` records the base URL, the revision, the time, and the pages.
- **Limits:** the article is the first one on `/news-and-events/`, so it can change when news is published. Pass `--article` to pin one.
  Live captures read the production deploy, which may lag the local revision.
