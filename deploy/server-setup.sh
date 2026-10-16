#!/bin/sh
# ONE-TIME server setup, run as root on pay1.oxid.dev (outside the project folder). After this,
# /var/www/oxid/oxid75/hydroxid-project is written ONLY by the `github-actions` user (the CI):
#   - a self-signed origin certificate (Cloudflare "Full" mode reaches custom ports over TLS)
#   - /etc/nginx/conf.d/hydroxid-project.conf that INCLUDES the config the CI ships with each release
#   - the folder owned by github-actions
# The CI then needs only `sudo nginx -s reload` (sudoers: /etc/sudoers.d/github-actions-nginx).
set -eu

BASE="${DEPLOY_PATH:-/var/www/oxid/oxid75/hydroxid-project}"
CERT_DIR=/etc/ssl/hydroxid

mkdir -p "$CERT_DIR"
if [ ! -f "$CERT_DIR/origin.crt" ]; then
  openssl req -x509 -nodes -newkey rsa:2048 -days 3650 -keyout "$CERT_DIR/origin.key" \
    -out "$CERT_DIR/origin.crt" -subj "/CN=pay1.oxid.dev" -addext "subjectAltName=DNS:pay1.oxid.dev" 2>/dev/null
  chmod 600 "$CERT_DIR/origin.key"
fi

mkdir -p "$BASE/releases"
chown -R github-actions:github-actions "$BASE"

# root owns this one-line file; the content it pulls in belongs to the CI
printf '# managed by deploy/server-setup.sh — the server blocks ship with each release\ninclude %s/current/build/nginx-pay1.conf;\n' "$BASE" \
  > /etc/nginx/conf.d/hydroxid-project.conf
echo "server setup done (nginx is reloaded by the next deploy)"
