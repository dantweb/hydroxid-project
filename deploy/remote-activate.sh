#!/bin/sh
# Runs ON the server (pay1.oxid.dev), called by deploy.sh with the release directory:
#   remote-activate.sh /var/www/oxid/oxid75/hydroxid-project/releases/<sha>
# Switches `current` to the release, installs the nginx config, reloads nginx — and rolls back to the
# previous release if nginx rejects the new configuration. Keeps the five newest releases.
set -eu

RELEASE="$1"
BASE="$(dirname "$(dirname "$RELEASE")")"   # …/hydroxid-project
CONF="${NGINX_CONF:-/etc/nginx/conf.d/hydroxid-project.conf}"
PREVIOUS="$(readlink -f "$BASE/current" 2>/dev/null || true)"

test -f "$RELEASE/dist/index.html"
test -f "$RELEASE/build/nginx-pay1.conf"

ln -sfn "$RELEASE" "$BASE/current.next"
mv -Tf "$BASE/current.next" "$BASE/current"       # atomic switch
[ -f "$CONF" ] && cp "$CONF" "$CONF.previous"
cp "$RELEASE/build/nginx-pay1.conf" "$CONF"

if nginx -t 2>&1; then
  systemctl reload nginx
  echo "activated $(basename "$RELEASE")"
else
  echo "nginx rejected the configuration — rolling back" >&2
  [ -f "$CONF.previous" ] && cp "$CONF.previous" "$CONF" || rm -f "$CONF"
  [ -n "$PREVIOUS" ] && ln -sfn "$PREVIOUS" "$BASE/current.next" && mv -Tf "$BASE/current.next" "$BASE/current"
  exit 1
fi

# housekeeping: keep the newest five releases
ls -1dt "$BASE"/releases/*/ 2>/dev/null | tail -n +6 | xargs -r rm -rf
