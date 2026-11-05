# API routes

Calls the BlueIQ feed route and the Studio's map-projects route on the local server.

- **Prerequisites:** an owned server. Any POST needs `scripts/server.sh start --dataset development`.
  The feed key and the write token come from env vars that you set in the shell. Never paste them into a command line.
- **Entry point:** `scripts/route.sh`.
- **Actions:**

  ```sh
  scripts/route.sh GET /api/blueiq/plants --expect 308
  scripts/route.sh POST /api/blueiq/plants/ --file FEED.csv --content-type text/csv \
    --secret-header x-blueiq-key=BLUEIQ_FEED_KEY --expect 200 \
    --out ../.claude/specs/feat/case-studies/.mk-goal/evidence/routes
  scripts/route.sh OPTIONS /api/map-projects/ --origin http://localhost:3333 --expect 204
  PROOF_UUID=$(python3 -c 'import uuid; print(uuid.uuid4())') scripts/route.sh POST \
    /api/map-projects/ --file BODY.json --content-type application/json \
    --origin http://localhost:3333 --secret-header X-Map-Projects-Request=PROOF_UUID
  ```

  The header name is an example. Use the one that the feed route reads.
- **Expected result:** the status matches `--expect`. A path without its trailing slash gets a 308 to the slashed path.
- **Evidence:** with `--out`, the headers and body of each reply.
- **Known-bad proof:** a POST while the server reads `production` exits 1 with `refusing a write`.
- **Studio route:** only the origin in `NEXT_PUBLIC_SANITY_STUDIO_URL` gets CORS headers. Locally that is `http://localhost:3333`.
  A POST without the proof header gets 403. A proof header passes only when the Studio saved that proof in Sanity first.
  Without `SANITY_API_WRITE_TOKEN`, a POST with a proof header gets 500 `server-error`.
- **Limits:** the helper only reaches `localhost`. Remote calls are out of scope.
  It can't save a Studio proof, so an accepted Studio request needs the Studio itself or a write token.
