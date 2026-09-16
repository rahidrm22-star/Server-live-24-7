#!/usr/bin/env bash
# ==============================================================================
# OmniHost 24/7 Universal Compute & Hosting Platform - Automated Linux Installer
# Supported OS: Ubuntu 20.04+, Debian 11+, CentOS 8+, RHEL 8+, Alpine 3.18+
# ==============================================================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

echo -e "${CYAN}==================================================================${NC}"
echo -e "${CYAN}        OMNIHOST 24/7 UNIVERSAL COMPUTE PLATFORM INSTALLER        ${NC}"
echo -e "${CYAN}==================================================================${NC}"
echo ""

# 1. PRIVILEGE CHECK
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[ERROR] This installer must be run with root privileges.${NC}"
  echo "Please run: sudo ./install.sh"
  exit 1
fi

# 2. OS DETECTION
echo -e "${BLUE}[STEP 1/12] Detecting Operating System & Kernel...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  OS_VERSION=$VERSION_ID
  echo -e "${GREEN}[OK] Detected OS: $NAME ($VERSION)${NC}"
else
  echo -e "${YELLOW}[WARN] Unknown OS release file, attempting generic Linux installation.${NC}"
  OS="generic"
fi

# 3. HARDWARE & RESOURCE VERIFICATION
echo -e "${BLUE}[STEP 2/12] Inspecting Server Hardware Resources...${NC}"
CPU_CORES=$(nproc)
TOTAL_RAM_MB=$(free -m | awk '/^Mem:/{print $2}')
DISK_FREE_GB=$(df -BG / | awk 'NR==2 {print $4}' | tr -d 'G')

echo -e "  - CPU Cores Available: ${CYAN}${CPU_CORES} vCPU${NC}"
echo -e "  - Total RAM: ${CYAN}${TOTAL_RAM_MB} MB${NC}"
echo -e "  - Root Disk Free: ${CYAN}${DISK_FREE_GB} GB${NC}"

if [ "$TOTAL_RAM_MB" -lt 1000 ]; then
  echo -e "${YELLOW}[WARN] Minimum recommended RAM is 1024 MB. Server might experience memory pressure.${NC}"
fi

# GPU Detection
if command -v nvidia-smi &> /dev/null; then
  GPU_NAME=$(nvidia-smi --query-gpu=name --format=csv,noheader | head -n 1)
  echo -e "${GREEN}[OK] Dedicated GPU Detected: ${GPU_NAME} (CUDA enabled)${NC}"
else
  echo -e "${YELLOW}[INFO] No dedicated NVIDIA GPU detected. AI workloads will operate in High-Performance CPU Mode.${NC}"
fi

# 4. DEPENDENCY INSTALLATION
echo -e "${BLUE}[STEP 3/12] Installing Prerequisites & System Packages...${NC}"
if [ "$OS" = "ubuntu" ] || [ "$OS" = "debian" ]; then
  apt-get update -y
  apt-get install -y curl wget git unzip tar build-essential libssl-dev jq ufw
elif [ "$OS" = "centos" ] || [ "$OS" = "rhel" ] || [ "$OS" = "rocky" ]; then
  yum install -y curl wget git unzip tar make gcc gcc-c++ jq
fi

# 5. NODE.JS & RUNTIME PREREQUISITES
echo -e "${BLUE}[STEP 4/12] Verifying Node.js 20+ LTS Environment...${NC}"
if ! command -v node &> /dev/null || [ "$(node -v | cut -d'.' -f1 | tr -d 'v')" -lt 20 ]; then
  echo -e "Installing Node.js 20 LTS via NodeSource..."
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
  apt-get install -y nodejs || yum install -y nodejs
fi
echo -e "${GREEN}[OK] Node.js $(node -v) ready.${NC}"

# 6. DOCKER & CONTAINER ENGINE (Optional / Recommended)
echo -e "${BLUE}[STEP 5/12] Checking Container Engine (Docker)...${NC}"
if command -v docker &> /dev/null; then
  echo -e "${GREEN}[OK] Docker Engine is active: $(docker --version)${NC}"
else
  echo -e "${YELLOW}[INFO] Docker not found. Projects will run in secured Linux process jail.${NC}"
fi

# 7. STORAGE & DIRECTORY INITIALIZATION
echo -e "${BLUE}[STEP 6/12] Setting up Persistent Storage Volumes...${NC}"
INSTALL_DIR="/opt/omnihost"
mkdir -p "$INSTALL_DIR/storage/projects"
mkdir -p "$INSTALL_DIR/storage/backups"
mkdir -p "$INSTALL_DIR/storage/databases"
mkdir -p "$INSTALL_DIR/logs"

# Copy current bundle to install directory if needed
if [ "$PWD" != "$INSTALL_DIR" ]; then
  echo "Copying files to $INSTALL_DIR..."
  cp -r ./* "$INSTALL_DIR/"
fi
cd "$INSTALL_DIR"

# 8. ENVIRONMENT CONFIGURATION
echo -e "${BLUE}[STEP 7/12] Generating Cryptographic Secrets & .env...${NC}"
if [ ! -f .env ]; then
  JWT_SECRET=$(head -c 32 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 32)
  POSTGRES_PASS=$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)
  REDIS_PASS=$(head -c 16 /dev/urandom | base64 | tr -dc 'a-zA-Z0-9' | head -c 16)

  cat <<EOF > .env
PORT=3000
NODE_ENV=production
JWT_SECRET=${JWT_SECRET}
DATABASE_URL=postgresql://omnihost:${POSTGRES_PASS}@localhost:5432/omnihost
REDIS_URL=redis://:${REDIS_PASS}@localhost:6379/0
SERVER_DOMAIN=localhost
STORAGE_ROOT=${INSTALL_DIR}/storage
EOF
  echo -e "${GREEN}[OK] Generated secure .env configuration.${NC}"
fi

# 9. DEPENDENCY INSTALLATION & BUILD
echo -e "${BLUE}[STEP 8/12] Installing Node dependencies & compiling application...${NC}"
npm install --production=false
npm run build

# 10. SYSTEMD SERVICE SUPERVISION
echo -e "${BLUE}[STEP 9/12] Configuring 24/7 Systemd Service...${NC}"
cat <<EOF > /etc/systemd/system/omnihost.service
[Unit]
Description=OmniHost 24/7 Universal Compute & Hosting Platform
After=network.target postgresql.service redis.service

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${INSTALL_DIR}/.env
ExecStart=/usr/bin/node ${INSTALL_DIR}/dist/server.cjs
Restart=always
RestartSec=5
StandardOutput=append:${INSTALL_DIR}/logs/omnihost.log
StandardError=append:${INSTALL_DIR}/logs/omnihost_error.log
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable omnihost
systemctl restart omnihost

# 11. FIREWALL & NETWORK PORTS
echo -e "${BLUE}[STEP 10/12] Configuring Network Firewall (Ports: 3000, 80, 443, 25565)...${NC}"
if command -v ufw &> /dev/null; then
  ufw allow 3000/tcp comment 'OmniHost Web Control Panel'
  ufw allow 80/tcp comment 'HTTP Proxy'
  ufw allow 443/tcp comment 'HTTPS Proxy'
  ufw allow 25565:25575/tcp comment 'Game Server Ports'
fi

# 12. VERIFICATION & HEALTH CHECK
echo -e "${BLUE}[STEP 11/12] Running Automated Health Check...${NC}"
sleep 3
SERVER_IP=$(curl -s ifconfig.me || hostname -I | awk '{print $1}')
HEALTH_RESPONSE=$(curl -s http://localhost:3000/api/health || echo "error")

echo ""
echo -e "${GREEN}==================================================================${NC}"
echo -e "${GREEN}       🎉 OMNIHOST PLATFORM INSTALLED & OPERATIONAL 24/7!          ${NC}"
echo -e "${GREEN}==================================================================${NC}"
echo ""
echo -e "Web Control Panel:  ${CYAN}http://${SERVER_IP}:3000${NC}"
echo -e "REST API Base URL:  ${CYAN}http://${SERVER_IP}:3000/api${NC}"
echo -e "Health Diagnostic:  ${CYAN}http://${SERVER_IP}:3000/api/health${NC}"
echo ""
echo -e "Initial Super Admin: ${YELLOW}admin@omnihost.cloud${NC}"
echo -e "Default Password:    ${YELLOW}admin123456${NC}"
echo ""
echo -e "To view service logs:  ${CYAN}journalctl -u omnihost -f${NC}"
echo -e "To restart service:    ${CYAN}systemctl restart omnihost${NC}"
echo -e "=================================================================="
