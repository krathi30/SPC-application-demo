#!/bin/sh
set -e
# /data and /backups are bind-mounted from the host, so their ownership comes
# from the host. Fix it once as root, then drop to the unprivileged "node" user
# (busybox su, -p keeps the environment).
if [ "$(id -u)" = "0" ]; then
  mkdir -p /data /backups
  chown -R node:node /data /backups
  exec su -p node -s /bin/sh -c 'exec "$0" "$@"' -- "$@"
fi
exec "$@"
