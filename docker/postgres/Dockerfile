FROM postgres:15-bookworm

RUN apt-get update \
	&& apt-get install -y --no-install-recommends postgresql-15-pgaudit \
	&& rm -rf /var/lib/apt/lists/*

COPY docker/postgres/init/10-pgaudit.sql /docker-entrypoint-initdb.d/10-pgaudit.sql
