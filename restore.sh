#!/usr/bin/env bash
# OmniHost Backup Restore Utility
set -e

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ] || [ ! -f "$BACKUP_FILE" ]; then
  echo "Usage: ./restore.sh <path-to-omnihost_backup.tar.gz>"
  exit 1
fi

echo "[RESTORE] Stopping OmniHost supervisor..."
systemctl stop omnihost || true

echo "[RESTORE] Extracting backup snapshot into /opt/omnihost..."
tar -xzf "$BACKUP_FILE" -C /opt/omnihost

echo "[RESTORE] Restarting OmniHost service..."
systemctl restart omnihost

echo "[RESTORE] Restore completed successfully."
