#!/usr/bin/env bash
# Sends one request to the owned local server and prints the reply.
#   route.sh METHOD PATH [--file BODY] [--content-type TYPE] [--secret-header NAME=ENV_VAR]
#            [--origin ORIGIN] [--expect STATUS] [--out DIR]
# It never follows redirects, so a missing trailing slash shows as a 308.
# It reads a secret from the named environment variable and never prints it.
# Any method other than GET, HEAD, or OPTIONS needs a server on the development dataset.
set -euo pipefail
. "$(dirname "$0")/lib.sh"

[ $# -ge 2 ] || vs_die "usage: route.sh METHOD PATH [options]"
method="$(echo "$1" | tr '[:lower:]' '[:upper:]')" path="$2"
shift 2
file="" ctype="" secret="" origin="" expect="" out=""
while [ $# -gt 0 ]; do
  case "$1" in
    --file) file="$2"; shift 2 ;;
    --content-type) ctype="$2"; shift 2 ;;
    --secret-header) secret="$2"; shift 2 ;;
    --origin) origin="$2"; shift 2 ;;
    --expect) expect="$2"; shift 2 ;;
    --out) out="$2"; shift 2 ;;
    *) vs_die "unknown option $1" ;;
  esac
done
[[ "$path" == /* ]] || vs_die "PATH must start with /"

case "$method" in
  GET | HEAD | OPTIONS) vs_server_owned || vs_die "no owned server on port $VS_PORT" ;;
  *) vs_require_dev_dataset ;;
esac

# Each call overwrites the last reply. Pass --out to keep a copy as evidence.
work="$VS_RUN_DIR/route"
mkdir -p "$work"
: >"$work/headers"
: >"$work/body"
args=(-sS -X "$method" -D "$work/headers" -o "$work/body" -w '%{http_code}' --max-time 120)
[ "$method" = "HEAD" ] && args=(-sS -I -D "$work/headers" -o "$work/body" -w '%{http_code}' --max-time 120)
[ -n "$file" ] && args+=(--data-binary "@$file")
[ -n "$ctype" ] && args+=(-H "Content-Type: $ctype")
[ -n "$origin" ] && args+=(-H "Origin: $origin")
secret_line=""
if [ -n "$secret" ]; then
  name="${secret%%=*}" var="${secret#*=}"
  [ -n "${!var:-}" ] || vs_die "environment variable $var is empty"
  secret_line="$name: ${!var}"
fi
# The secret header goes through stdin, so it stays out of the process list.
code="$(printf '%s\n' "$secret_line" | curl "${args[@]}" -H @- "$VS_BASE$path")"

echo "$method $path -> $code"
grep -i -E '^(location|content-type|retry-after|access-control-[a-z-]+|allow):' "$work/headers" |
  tr -d '\r' | sed 's/^/  /' || true
if [ -s "$work/body" ]; then
  echo "  body: $(head -c 600 "$work/body" | tr '\n' ' ')"
fi
if [ -n "$out" ]; then
  dir="$(vs_evidence_dir "$out")"
  stem="$dir/route-$(echo "$method$path" | tr '/' '_' | tr -cd 'A-Za-z0-9_.-')-$(date +%H%M%S)"
  tr -d '\r' <"$work/headers" >"$stem.headers.txt"
  cp "$work/body" "$stem.body.txt"
  echo "  saved: $stem.*"
fi
if [ -n "$expect" ] && [ "$code" != "$expect" ]; then
  echo "expected $expect, got $code" >&2
  exit 1
fi
