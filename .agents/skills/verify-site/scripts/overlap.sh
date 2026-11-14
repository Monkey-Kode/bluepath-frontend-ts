#!/usr/bin/env bash
# Checks the map area for overlaps and sideways scrolling at each viewport.
#   overlap.sh --url /projects/ --out DIR [--base URL] [--viewports "375x667 ..."]
#              [--allow a:b]... [--min-target SELECTOR] [--min-size 24]
#              [--wait SELECTOR] name=SELECTOR ...
# Google's logo and attribution are always included. Exits 1 if any viewport fails.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

url="" out="" base="" viewports="$VS_VIEWPORTS" min_target="" min_size=24
wait_for=".gm-style-cc"
allow=() items=()
while [ $# -gt 0 ]; do
  case "$1" in
    --url) url="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    --base) base="$2"; shift 2 ;;
    --viewports) viewports="$2"; shift 2 ;;
    --allow) allow+=("$2"); shift 2 ;;
    --min-target) min_target="$2"; shift 2 ;;
    --min-size) min_size="$2"; shift 2 ;;
    --wait) wait_for="$2"; shift 2 ;;
    *=*) items+=("$1"); shift ;;
    *) vs_die "unknown argument $1" ;;
  esac
done
[ -n "$url" ] || vs_die "--url is required"
out="$(vs_evidence_dir "$out")"
if [ -z "$base" ]; then
  vs_server_owned || vs_die "no owned server on port $VS_PORT. Run server.sh start, or pass --base."
  base="$VS_BASE"
fi

config="$(node -e '
  const [minTarget, minSize, ...rest] = process.argv.slice(1);
  const sep = rest.indexOf("--");
  const allow = rest.slice(0, sep).map((p) => p.split(":"));
  const items = Object.fromEntries(rest.slice(sep + 1).map((kv) => {
    const i = kv.indexOf("=");
    return [kv.slice(0, i), kv.slice(i + 1)];
  }));
  console.log(JSON.stringify({ items, allow, minTarget: minTarget || null, minSize: Number(minSize) }));
' "$min_target" "$min_size" ${allow[@]+"${allow[@]}"} -- ${items[@]+"${items[@]}"})"
echo "$config" >"$out/overlap-config.json"

session="$(vs_session_name overlap)"
trap 'agent-browser --session "$session" close >/dev/null 2>&1 || true' EXIT
failed=0
for vp in $viewports; do
  w="${vp%x*}" h="${vp#*x}"
  agent-browser --session "$session" set viewport "$w" "$h" >/dev/null
  agent-browser --session "$session" open "$base$url" >/dev/null
  if [ -n "$wait_for" ] &&
    ! agent-browser --session "$session" wait "$wait_for" --timeout 45000 >/dev/null 2>&1; then
    echo "FAIL $vp: '$wait_for' never appeared" | tee "$out/overlap-$vp.txt"
    agent-browser --session "$session" screenshot "$out/overlap-$vp.png" >/dev/null
    failed=1
    continue
  fi
  agent-browser --session "$session" eval --stdin <"$VS_SCRIPTS/settle.js" >/dev/null
  { echo "const CONFIG = $config;"; cat "$VS_SCRIPTS/overlap.js"; } |
    agent-browser --session "$session" eval --stdin >"$out/overlap-$vp.json"
  agent-browser --session "$session" screenshot "$out/overlap-$vp.png" >/dev/null
  if node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).pass ? 0 : 1)' \
    "$out/overlap-$vp.json"; then
    echo "PASS $vp"
  else
    failed=1
    echo "FAIL $vp"
    node -e 'for (const f of JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).failures) console.log("  - " + f)' \
      "$out/overlap-$vp.json"
  fi
done
echo "evidence: $out"
exit "$failed"
