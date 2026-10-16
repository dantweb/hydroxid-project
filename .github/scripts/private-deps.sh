#!/bin/sh
# oxid-fe-core and oxid-fe-user are private repositories; npm installs them over git+ssh. Each gets
# its own READ-ONLY deploy key (a deploy key belongs to one repository), routed by host alias.
set -eu
mkdir -p ~/.ssh && chmod 700 ~/.ssh
ssh-keyscan -t ed25519,rsa github.com >> ~/.ssh/known_hosts 2>/dev/null

add() { # alias repo key
  printf '%s\n' "$3" > ~/.ssh/"$1" && chmod 600 ~/.ssh/"$1"
  printf 'Host github.com-%s\n  HostName github.com\n  User git\n  IdentityFile ~/.ssh/%s\n  IdentitiesOnly yes\n' "$1" "$1" >> ~/.ssh/config
  for from in "ssh://git@github.com/dantweb/$2" "ssh://git@github.com/dantweb/$2.git" "git@github.com:dantweb/$2" "git@github.com:dantweb/$2.git" "https://github.com/dantweb/$2" "https://github.com/dantweb/$2.git"; do
    git config --global url."git@github.com-$1:dantweb/$2.git".insteadOf "$from"
  done
}

[ -n "${CORE_KEY:-}" ] && add core oxid-fe-core "$CORE_KEY"
[ -n "${USER_KEY:-}" ] && add user oxid-fe-user "$USER_KEY"
true
