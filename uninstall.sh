#!/usr/bin/env bash
# OmniHost Clean Uninstaller
set -e

if [ "$EUID" -ne 0 ]; then
  echo "Please run as root: sudo ./uninstall.sh"
  exit 1
fi

echo "Stopping and disabling omnihost service..."
systemctl stop omnihost || true
systemctl disable omnihost || true
rm -f /etc/systemd/system/omnihost.service
systemctl daemon-reload

echo "Service removed. Data remains preserved in /opt/omnihost/storage."
echo "To permanently wipe all project data: rm -rf /opt/omnihost"
