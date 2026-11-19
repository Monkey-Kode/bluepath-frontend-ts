#!/usr/bin/env bash
# Read-only checks before a journey. Prints one line per check.
#   doctor.sh            exits 1 if a required check fails
# It never starts, stops, or writes anything outside its own output.
set -uo pipefail
. "$(dirname "$0")/lib.sh"

# The revision that the toolkit and its baselines were captured at.
CAPTURED_REV=4448905
COVERED_PATHS=(app components lib sanity next.config.ts netlify.toml)

fails=0
ok() { echo "ok    $*"; }
warn() { echo "warn  $*"; }
bad() { echo "FAIL  $*"; fails=1; }

cd "$VS_REPO" || vs_die "cannot enter $VS_REPO"
[ -f package.json ] && grep -q '"next"' package.json &&
  ok "checkout: $VS_REPO" || bad "checkout: $VS_REPO has no Next package.json"
head="$(git rev-parse --short HEAD 2>/dev/null)"
ok "revision: $(git branch --show-current 2>/dev/null) @ $head"
drift="$(git diff --name-only "$CAPTURED_REV" -- "${COVERED_PATHS[@]}" 2>/dev/null | wc -l | tr -d ' ')"
if [ "$drift" = "0" ]; then
  ok "drift: no covered file changed since $CAPTURED_REV"
else
  warn "drift: $drift covered file(s) changed since $CAPTURED_REV. Selectors may be stale."
fi

want_node="$(node -e 'console.log(require("./package.json").volta?.node ?? "")')"
have_node="$(node --version | tr -d v)"
[ "$have_node" = "$want_node" ] && ok "node: $have_node" ||
  warn "node: $have_node, but Volta pins $want_node"
for tool in pnpm agent-browser curl lsof; do
  command -v "$tool" >/dev/null && ok "tool: $tool" || bad "tool: $tool is missing"
done
[ -x node_modules/.bin/next ] && ok "deps: node_modules/.bin/next" ||
  bad "deps: run pnpm install first"

# Names only. Values never print.
for name in NEXT_PUBLIC_SANITY_PROJECT_ID NEXT_PUBLIC_SANITY_DATASET NEXT_PUBLIC_GOOGLE_MAPS_API_KEY; do
  if grep -q "^$name=." .env.local 2>/dev/null; then ok "env: $name is set in .env.local"
  else bad "env: $name is missing from .env.local"; fi
done

if vs_server_owned; then
  # Next lets process.env win over .env.local, so the launch env sets the dataset.
  # The listener renames its process title, which hides its env. The group leader keeps it.
  seen="$(ps eww -o command= -p "$VS_PID" | grep -o 'NEXT_PUBLIC_SANITY_DATASET=[a-z0-9_-]*' | head -n 1)"
  ok "server: $VS_BASE pid=$VS_PID dataset=$VS_DATASET rev=$VS_REV"
  [ "$seen" = "NEXT_PUBLIC_SANITY_DATASET=$VS_DATASET" ] &&
    ok "server env: $seen" || warn "server env: could not confirm the dataset (saw '${seen:-nothing}')"
  [ "$VS_REV" = "$head" ] || warn "server: started at $VS_REV, but HEAD is $head"
  [ "$VS_DATASET" = "development" ] && ok "writes: allowed (development)" ||
    ok "writes: refused (dataset $VS_DATASET)"
elif lsof -nP -iTCP:"$VS_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
  bad "server: port $VS_PORT is held by a process that this run directory does not own"
else
  warn "server: none on port $VS_PORT. Run server.sh start."
fi

if [ -n "${VERIFY_SITE_EVIDENCE:-}" ]; then ok "evidence: $VERIFY_SITE_EVIDENCE"
else warn "evidence: VERIFY_SITE_EVIDENCE is unset, so pass --out to each helper"; fi
exit "$fails"
