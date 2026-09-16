#!/data/data/com.termux/files/usr/bin/bash
# ==============================================================================
# ComputeHub Universal Server Platform - Termux Worker Automated Installer
# Run inside Android Termux to connect this device as a 24/7 compute node.
# ==============================================================================

set -e

echo ""
echo "======================================================================"
echo "    COMPUTEHUB UNIVERSAL SERVER PLATFORM - TERMUX WORKER INSTALLER    "
echo "======================================================================"
echo "Preparing Android Termux environment for 24/7 background compute..."
echo ""

# 1. Acquire Wake Lock to prevent Android OS battery optimization sleep
if command -v termux-wake-lock &> /dev/null; then
    echo "[1/5] Acquiring Termux Wake-Lock for 24/7 persistent execution..."
    termux-wake-lock
else
    echo "[1/5] termux-wake-lock command not found, continuing..."
fi

# 2. Update Termux pkg repositories and install prerequisites
echo "[2/5] Updating packages and installing Node.js, Python, Git, and build tools..."
pkg update -y
pkg install -y nodejs python git curl procps termux-api

# 3. Create worker directory structure
INSTALL_DIR="$HOME/computehub-worker"
echo "[3/5] Setting up worker agent in $INSTALL_DIR..."
mkdir -p "$INSTALL_DIR/workloads"
mkdir -p "$INSTALL_DIR/logs"

# 4. Prompt for Controller configuration if not passed via env
if [ -z "$COMPUTEHUB_CONTROLLER_URL" ]; then
    read -p "Enter ComputeHub Controller URL (e.g. https://mydomain.example or http://192.168.1.100:3000): " CONTROLLER_INPUT
    COMPUTEHUB_CONTROLLER_URL="${CONTROLLER_INPUT:-http://localhost:3000}"
fi

if [ -z "$COMPUTEHUB_WORKER_TOKEN" ]; then
    read -p "Enter Worker Auth Token (or press Enter to auto-generate): " TOKEN_INPUT
    if [ -z "$TOKEN_INPUT" ]; then
        COMPUTEHUB_WORKER_TOKEN="sec_termux_$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 16 | head -n 1)"
    else
        COMPUTEHUB_WORKER_TOKEN="$TOKEN_INPUT"
    fi
fi

if [ -z "$COMPUTEHUB_WORKER_NAME" ]; then
    read -p "Enter Worker Display Name (default: Android Termux Node): " NAME_INPUT
    COMPUTEHUB_WORKER_NAME="${NAME_INPUT:-Android Termux Node}"
fi

# 5. Write configuration file
cat <<EOF > "$INSTALL_DIR/.env"
COMPUTEHUB_CONTROLLER_URL=$COMPUTEHUB_CONTROLLER_URL
COMPUTEHUB_WORKER_TOKEN=$COMPUTEHUB_WORKER_TOKEN
COMPUTEHUB_WORKER_NAME=$COMPUTEHUB_WORKER_NAME
COMPUTEHUB_WORKER_ID=termux_node_$(uname -m)_$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)
HEARTBEAT_INTERVAL_MS=8000
EOF

# Copy agent script if in current directory, or create startup wrapper
cat <<'EOF' > "$INSTALL_DIR/start.sh"
#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
if [ -f .env ]; then
    export $(cat .env | xargs)
fi
echo "Starting ComputeHub Worker Agent in background..."
nohup node agent.js > logs/agent.log 2>&1 &
echo "Agent started with PID $!"
echo "View real-time logs with: tail -f $HOME/computehub-worker/logs/agent.log"
EOF

chmod +x "$INSTALL_DIR/start.sh"

echo ""
echo "======================================================================"
echo "    ✓ COMPUTEHUB TERMUX WORKER AGENT CONFIGURED SUCCESSFULLY!         "
echo "======================================================================"
echo "Controller URL: $COMPUTEHUB_CONTROLLER_URL"
echo "Worker Token:   $COMPUTEHUB_WORKER_TOKEN"
echo "Worker Name:    $COMPUTEHUB_WORKER_NAME"
echo ""
echo "To start the worker now, run:"
echo "   $INSTALL_DIR/start.sh"
echo ""
echo "To view live logs:"
echo "   tail -f $INSTALL_DIR/logs/agent.log"
echo "======================================================================"
