#!/bin/sh
set -eu

if [ "${#REDIS_PASSWORD}" -lt 16 ]; then
	echo "REDIS_PASSWORD must contain at least 16 characters" >&2
	exit 1
fi

case "$REDIS_PASSWORD" in
	*[!A-Za-z0-9_-]*)
		echo "REDIS_PASSWORD must use base64url characters" >&2
		exit 1
		;;
esac

umask 077
printf 'appendonly yes\nmaxmemory 512mb\nmaxmemory-policy noeviction\nrequirepass "%s"\n' \
	"$REDIS_PASSWORD" >/tmp/redis.conf
exec redis-server /tmp/redis.conf
