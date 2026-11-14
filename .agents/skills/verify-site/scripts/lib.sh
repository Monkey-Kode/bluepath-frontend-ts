# Shared helpers for the verify-site scripts. Source it; don't run it.
# shellcheck shell=bash

VS_SCRIPTS="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VS_REPO="$(cd "$VS_SCRIPTS/../../../.." && pwd)"
VS_PORT="${VERIFY_SITE_PORT:-3000}"
VS_RUN_DIR="${VERIFY_SITE_RUN_DIR:-${TMPDIR:-/tmp}/verify-site-$VS_PORT}"
VS_STATE="$VS_RUN_DIR/server.env"
VS_BASE="http://localhost:$VS_PORT"

vs_die() {
  echo "verify-site: $*" >&2
  exit 1
}

# Prints the evidence directory and creates it. Evidence must outlive the run
# directory, so it never defaults to a temp path.
vs_evidence_dir() {
  local dir="${1:-${VERIFY_SITE_EVIDENCE:-}}"
  [ -n "$dir" ] || vs_die "set --out DIR or VERIFY_SITE_EVIDENCE"
  mkdir -p "$dir" || vs_die "cannot create $dir"
  (cd "$dir" && pwd)
}

# Loads the state that server.sh recorded: VS_PID, VS_DATASET, VS_REV.
vs_load_state() {
  [ -f "$VS_STATE" ] || return 1
  # shellcheck disable=SC1090
  . "$VS_STATE"
}

# True when the recorded server is alive and still holds the port.
vs_server_owned() {
  vs_load_state || return 1
  kill -0 "$VS_PID" 2>/dev/null || return 1
  local listener pgid
  listener="$(lsof -nP -t -iTCP:"$VS_PORT" -sTCP:LISTEN 2>/dev/null | head -n 1)"
  [ -n "$listener" ] || return 1
  pgid="$(ps -o pgid= -p "$listener" | tr -d ' ')"
  [ "$pgid" = "$VS_PID" ]
}

# Every helper that writes data calls this first. Writes go only to the
# owned local server, and only when it reads the development dataset.
vs_require_dev_dataset() {
  vs_server_owned || vs_die "refusing a write: no owned server on port $VS_PORT"
  [ "$VS_DATASET" = "development" ] ||
    vs_die "refusing a write: the server reads dataset '$VS_DATASET', not 'development'"
}

# A fresh agent-browser session name for one journey.
vs_session_name() {
  echo "verify-site-$1-$(date +%Y%m%d-%H%M%S)-$$"
}

# Viewports for the six widths in AC-2.9, as WIDTHxHEIGHT.
VS_VIEWPORTS="320x568 375x667 768x1024 1024x768 1280x720 1440x900"
