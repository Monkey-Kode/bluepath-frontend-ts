#!/usr/bin/env bash
# Captures pages at each viewport: a first-screen shot, a full-page shot, and metrics.
#   baseline.sh --out DIR [--base URL] [--article /news/SLUG/] [--viewports "..."] [PATH ...]
# Default pages: /, /projects/, /news-and-events/, and one news article.
# Without --article, it uses the first /news/ link on /news-and-events/.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

out="" base="" article="" viewports="$VS_VIEWPORTS"
pages=()
while [ $# -gt 0 ]; do
  case "$1" in
    --out) out="$2"; shift 2 ;;
    --base) base="$2"; shift 2 ;;
    --article) article="$2"; shift 2 ;;
    --viewports) viewports="$2"; shift 2 ;;
    /*) pages+=("$1"); shift ;;
    *) vs_die "unknown argument $1" ;;
  esac
done
out="$(vs_evidence_dir "$out")"
rev="unknown"
if [ -z "$base" ]; then
  vs_server_owned || vs_die "no owned server on port $VS_PORT. Run server.sh start, or pass --base."
  base="$VS_BASE"
  rev="$VS_REV dataset=$VS_DATASET"
fi

session="$(vs_session_name baseline)"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
if [ ${#pages[@]} -eq 0 ]; then
  pages=(/ /projects/ /news-and-events/)
  if [ -z "$article" ]; then
    agent-browser --session "$session" open "$base/news-and-events/" >/dev/null
    agent-browser --session "$session" wait 'a[href*="/news/"]' --timeout 30000 >/dev/null
    article="$(agent-browser --session "$session" eval \
      'new URL(document.querySelector("a[href*=\"/news/\"]").href).pathname' | tr -d '"')"
  fi
  pages+=("$article")
fi

{
  echo "base: $base"
  echo "revision: $rev"
  echo "captured: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "viewports: $viewports"
  echo "pages: ${pages[*]}"
} >"$out/manifest.txt"

for page in "${pages[@]}"; do
  slug="$(echo "$page" | sed -e 's#^/##' -e 's#/$##' -e 's#/#_#g')"
  slug="${slug:-home}"
  for vp in $viewports; do
    w="${vp%x*}" h="${vp#*x}"
    agent-browser --session "$session" set viewport "$w" "$h" >/dev/null
    agent-browser --session "$session" open "$base$page" >/dev/null
    agent-browser --session "$session" wait --load load >/dev/null 2>&1 || true
    agent-browser --session "$session" eval --stdin <"$VS_SCRIPTS/settle.js" >"$out/$slug--$vp.json"
    agent-browser --session "$session" screenshot "$out/$slug--$vp.png" >/dev/null
    agent-browser --session "$session" screenshot --full "$out/$slug--$vp-full.png" >/dev/null
    echo "captured $page at $vp"
  done
done
echo "evidence: $out"
