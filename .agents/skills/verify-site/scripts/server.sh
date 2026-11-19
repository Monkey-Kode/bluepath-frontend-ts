#!/usr/bin/env bash
# Start, check, or stop the local Next dev server that verify-site owns.
#   server.sh start [--dataset NAME]   start on $VERIFY_SITE_PORT (3000) and wait until ready
#   server.sh status                   print the owned server's state
#   server.sh stop                     stop the owned server's process group
set -euo pipefail
. "$(dirname "$0")/lib.sh"

start() {
  local dataset="production"
  while [ $# -gt 0 ]; do
    case "$1" in
      --dataset) dataset="$2"; shift 2 ;;
      *) vs_die "unknown option $1" ;;
    esac
  done
  [[ "$dataset" =~ ^[a-z0-9_-]+$ ]] || vs_die "bad dataset name '$dataset'"
  if vs_server_owned; then
    vs_die "an owned server already runs (pid $VS_PID, dataset $VS_DATASET). Stop it first."
  fi
  if lsof -nP -iTCP:"$VS_PORT" -sTCP:LISTEN >/dev/null 2>&1; then
    vs_die "port $VS_PORT is held by a process that this run directory does not own"
  fi
  mkdir -p "$VS_RUN_DIR"
  local log="$VS_RUN_DIR/next-dev.log"
  # `pnpm dev` would run predev, which rewrites the committed sanity.schema.json.
  # Run next directly instead. Job control gives the server its own process group.
  set -m
  (
    cd "$VS_REPO"
    exec env NEXT_PUBLIC_SANITY_DATASET="$dataset" pnpm exec next dev --port "$VS_PORT"
  ) >"$log" 2>&1 &
  local pid=$!
  set +m
  {
    echo "VS_PID=$pid"
    echo "VS_DATASET=$dataset"
    echo "VS_REV=$(git -C "$VS_REPO" rev-parse --short HEAD)"
    echo "VS_STARTED='$(date -u +%Y-%m-%dT%H:%M:%SZ)'"
  } >"$VS_STATE"
  # Ready means the home page answers 200. The first compile can take a while.
  local code="" i
  for i in $(seq 1 90); do
    kill -0 "$pid" 2>/dev/null || { tail -n 20 "$log" >&2; vs_die "next dev exited early. Log: $log"; }
    code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 60 "$VS_BASE/" || true)"
    [ "$code" = "200" ] && break
    sleep 2
  done
  [ "$code" = "200" ] || { stop; vs_die "no 200 from $VS_BASE/ after 90 tries (last: $code). Log: $log"; }
  vs_server_owned || { stop; vs_die "the port listener is not in process group $pid"; }
  echo "ready: $VS_BASE pid=$pid dataset=$dataset log=$log"
}

status() {
  if vs_server_owned; then
    echo "running: $VS_BASE pid=$VS_PID dataset=$VS_DATASET rev=$VS_REV started=$VS_STARTED"
  elif vs_load_state; then
    echo "stale: recorded pid $VS_PID no longer holds port $VS_PORT"
    return 1
  else
    echo "stopped: no state at $VS_STATE"
    return 1
  fi
}

stop() {
  vs_load_state || { echo "stopped: nothing recorded"; return 0; }
  if kill -0 "$VS_PID" 2>/dev/null; then
    kill -TERM -- "-$VS_PID" 2>/dev/null || true
    local i
    for i in $(seq 1 20); do
      pgrep -g "$VS_PID" >/dev/null 2>&1 || break
      sleep 0.5
    done
    if pgrep -g "$VS_PID" >/dev/null 2>&1; then
      kill -KILL -- "-$VS_PID" 2>/dev/null || true
    fi
  fi
  mv "$VS_STATE" "$VS_STATE.stopped"
  echo "stopped: process group $VS_PID"
}

cmd="${1:-}"
shift || true
case "$cmd" in
  start) start "$@" ;;
  status) status ;;
  stop) stop ;;
  *) vs_die "usage: server.sh start [--dataset NAME] | status | stop" ;;
esac
