#!/usr/bin/env bash
#
# backup-db.sh — Backup periódico de la base Postgres self-hosted de
# docker-compose.yml (contenedor "fixhub-db", volumen "db_data").
#
# Solo aplica si se despliega con el Postgres del propio docker-compose.yml.
# Si en su lugar se usa un proveedor administrado (Railway, Supabase, Neon,
# RDS, etc.), este script no hace falta: esos proveedores dan backups
# automáticos y point-in-time recovery. Ver AGENTS.md, sección "Base de datos".
#
# Qué hace:
#   1. Corre pg_dump DENTRO del contenedor "fixhub-db" (mismo Postgres,
#      sin depender de tener el cliente psql/pg_dump instalado en el host).
#   2. Comprime el dump con gzip.
#   3. Lo guarda en BACKUP_DIR con timestamp en el nombre.
#   4. Borra los backups más viejos que RETENTION_DAYS.
#
# Uso:
#   ./scripts/backup-db.sh
#
# Programarlo (cron del host, fuera de docker-compose):
#   0 3 * * * cd /ruta/al/proyecto && ./scripts/backup-db.sh >> /var/log/fixhub-backup.log 2>&1
#
# Importante: BACKUP_DIR debe vivir fuera del volumen "db_data" (y
# preferentemente fuera del host, ej. sincronizado a S3/otro storage
# aparte) — si el host se pierde, un backup guardado solo ahí se pierde
# con él. Este script solo genera el dump local; copiarlo a otro lado
# (rsync, aws s3 cp, rclone, etc.) queda a cargo de quien lo despliegue,
# según el proveedor de storage que elija.

set -euo pipefail

CONTAINER_NAME="${BACKUP_DB_CONTAINER:-fixhub-db}"
DB_USER="${DB_USER:-contrataya}"
DB_NAME="${DB_NAME:-contrataya}"
BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-14}"

timestamp="$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
dest="$BACKUP_DIR/${DB_NAME}_${timestamp}.sql.gz"

if ! docker ps --format '{{.Names}}' | grep -qx "$CONTAINER_NAME"; then
  echo "[backup-db] ERROR: el contenedor '$CONTAINER_NAME' no está corriendo." >&2
  exit 1
fi

echo "[backup-db] Volcando $DB_NAME desde $CONTAINER_NAME a $dest ..."
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$dest"

size="$(du -h "$dest" | cut -f1)"
echo "[backup-db] OK: $dest ($size)"

echo "[backup-db] Borrando backups de más de $RETENTION_DAYS días en $BACKUP_DIR ..."
find "$BACKUP_DIR" -name "${DB_NAME}_*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete

echo "[backup-db] Listo."
