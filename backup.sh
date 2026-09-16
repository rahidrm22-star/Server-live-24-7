#!/usr/bin/env bash
# OmniHost Standalone Backup Generator
set -e

BACKUP_DIR="${1:-/opt/omnihost/storage/backups}"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_FILE="${BACKUP_DIR}/omnihost_system_backup_${TIMESTAMP}.tar.gz"

mkdir -p "$BACKUP_DIR"
echo "[BACKUP] Creating archive: $BACKUP_FILE"

tar -czf "$BACKUP_FILE" \
  -C /opt/omnihost \
  storage \
  .env \
  --exclude="storage/backups"

echo "[BACKUP] Completed successfully. Size: $(du -sh "$BACKUP_FILE" | cut -f1)"
