#!/usr/bin/env bash
# ==============================================================================
# ComputeHub Universal Server Platform - Linux VPS / Dedicated Server Installer
# ==============================================================================

set -e

echo "======================================================================"
echo "    COMPUTEHUB UNIVERSAL SERVER PLATFORM - LINUX WORKER INSTALLER     "
echo "======================================================================"

if [ "$EUID" -ne 0 ]; then 
    echo "[!] Please run as root or with sudo."
    exit 1
fi

echo "[1/4] Installing system prerequisites (curl, nodejs, python3, git)..."
apt-get update -y && apt-get install -y curl nodejs npm python3 python3-pip git build-essential

INSTALL_DIR="/opt/computehub-worker"
mkdir -p "$INSTALL_DIR/workloads"
mkdir -p "$INSTALL_DIR/logs"

# Copy agent script
cp "$(dirname "$0")/agent.js" "$INSTALL_DIR/"
cp "$(dirname "$0")/package.json" "$INSTALL_DIR/"

# Prompt for config
read -p "Enter ComputeHub Controller URL (e.g. https://mydomain.example): " CONTROLLER_INPUT
COMPUTEHUB_CONTROLLER_URL="${CONTROLLER_INPUT:-http://localhost:3000}"

read -p "Enter Worker Auth Token: " TOKEN_INPUT
COMPUTEHUB_WORKER_TOKEN="${TOKEN_INPUT:-sec_vps_$(openssl rand -hex 12)}"

read -p "Enter Worker Name (default: Linux Cloud VPS Node): " NAME_INPUT
COMPUTEHUB_WORKER_NAME="${NAME_INPUT:-Linux Cloud VPS Node}"

cat <<EOF > "$INSTALL_DIR/.env"
COMPUTEHUB_CONTROLLER_URL=$COMPUTEHUB_CONTROLLER_URL
COMPUTEHUB_WORKER_TOKEN=$COMPUTEHUB_WORKER_TOKEN
COMPUTEHUB_WORKER_NAME=$COMPUTEHUB_WORKER_NAME
COMPUTEHUB_WORKER_ID=vps_node_$(uname -m)_$(openssl rand -hex 4)
HEARTBEAT_INTERVAL_MS=8000
EOF

# Install systemd service
echo "[3/4] Registering 24/7 systemd service..."
cat <<EOF > /etc/systemd/system/computehub-worker.service
[Unit]
Description=ComputeHub 24/7 Universal Compute Worker Agent
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
EnvironmentFile=$INSTALL_DIR/.env
ExecStart=/usr/bin/node $INSTALL_DIR/agent.js
Restart=always
RestartSec=5
StandardOutput=append:$INSTALL_DIR/logs/agent.log
StandardError=append:$INSTALL_DIR/logs/agent.log

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable computehub-worker
systemctl restart computehub-worker

echo "[4/4] ✓ Service started and enabled on boot!"
echo ""
echo "======================================================================"
echo "    ✓ COMPUTEHUB LINUX WORKER INSTALLED SUCCESSFULLY                  "
echo "======================================================================"
echo "Check service status: systemctl status computehub-worker"
echo "View live worker logs: journalctl -u computehub-worker -f"
echo "======================================================================"
