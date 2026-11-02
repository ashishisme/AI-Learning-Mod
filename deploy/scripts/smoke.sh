#!/usr/bin/env bash
# SPEC: FR-030, FR-031, FR-033, FR-034, SC-013
# Checks a deployed revision without signing in. Used before and after traffic moves.
# Usage: smoke.sh BASE_URL [EXPECTED_RELEASE] [BUNDLED_IMAGE_NAME]
set -euo pipefail

base="${1:?base URL required}"
release="${2:-}"
image="${3:-}"
fail() { echo "SMOKE FAILED: $*" >&2; exit 1; }

health=""
for _ in 1 2 3 4 5 6 7 8 9 10; do # a scaled-to-zero revision needs a moment to start
  health="$(curl -sS --max-time 20 "$base/api/health" || true)"
  [ "$health" = '{"ok":true}' ] && break
  sleep 3
done
[ "$health" = '{"ok":true}' ] || fail "health body was: $health"

runtime="$(curl -sS --max-time 20 "$base/api/runtime")"
echo "$runtime" | jq -e '.hosted == true and .authRequired == true' >/dev/null || fail "not running in hosted mode: $runtime"
if [ -n "$release" ]; then
  echo "$runtime" | jq -e --arg r "$release" '.release == $r' >/dev/null || fail "release is not $release: $runtime"
fi

headers="$(curl -sS --max-time 20 -D - -o /dev/null "$base/")"
echo "$headers" | grep -qi '^HTTP/.* 200' || fail "the app did not load"
csp="$(echo "$headers" | grep -i '^content-security-policy:' || true)"
[ -n "$csp" ] || fail "no CSP header"
case "$csp" in *http*|*data:*) fail "CSP allows another origin: $csp" ;; esac

code="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code}' "$base/api/lessons")"
[ "$code" = "401" ] || fail "lessons without a session returned $code, want 401"

if [ -n "$image" ]; then
  type="$(curl -sS --max-time 20 -o /dev/null -w '%{http_code} %{content_type}' "$base/lesson-assets/$image")"
  case "$type" in "200 image/"*) ;; *) fail "bundled image returned: $type" ;; esac
fi
echo "Smoke checks passed for $base"
