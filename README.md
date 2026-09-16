# OmniHost Universal 24/7 Compute & Hosting Server Platform

**OmniHost** is an all-in-one, production-ready universal compute server and hosting platform. It transforms any standard Linux VPS, cloud VM, or dedicated server into an isolated, multi-workload cloud hosting node for **Websites**, **APIs**, **AI/ML Workloads (PyTorch, CUDA, FastAPI)**, **Game Servers (Minecraft, Valheim, Palworld, Terraria)**, **Background Workers**, and **Databases**.

---

## Key Features

1. **Universal Multi-Workload Orchestration**:
   - **Web & APIs**: Node.js, Python, PHP, Java, Go, Rust, C/C++, Bash, and Static HTTP.
   - **AI / ML Workloads**: FastAPI inference servers, PyTorch model loaders, HuggingFace embeddings, with automated NVIDIA CUDA GPU detection and CPU fallback.
   - **Game Servers**: Minecraft (Paper/Spigot/Fabric), Valheim, Palworld, Terraria, CS2 with live RCON console, TCP/UDP port mapping, and world save management.
   - **Databases**: Managed PostgreSQL, MySQL, Redis, and SQLite instances.

2. **Full-Stack Architecture**:
   - **Backend**: Node.js & TypeScript with Express, custom process supervisor, live log streaming, REST API, and reverse proxy dispatcher.
   - **Database**: PostgreSQL ACID persistence with automated SQL migrations and built-in failover storage.
   - **Frontend**: Sleek, high-density dark mode control panel built in React, TypeScript, and Tailwind CSS.
   - **Security**: Strict filesystem jail, path traversal guards, non-root sandbox execution, rate-limiting, and RBAC (User, Admin, Super Admin).

3. **24/7 Host Reliability**:
   - Automated Linux systemd process supervision with crash recovery.
   - Live hardware telemetry (real CPU cores, load average, RAM, NVMe disk, network bandwidth, and GPU sensors).
   - Automated ZIP/Git deployment engine with rollback history.
   - Interactive project-scoped web terminal.
   - Web-based File Manager with ZIP extract and in-browser code editor.

---

## Quick Installation on Linux VPS / Server

### One-Command Setup
Extract the ZIP package on your Linux VPS/server and run:

```bash
chmod +x install.sh
sudo ./install.sh
```

### What the installer handles automatically:
1. Validates OS (Ubuntu, Debian, CentOS, RHEL, Alpine).
2. Probes physical/virtual hardware (CPU cores, RAM, Disk, GPU/CUDA).
3. Installs Node.js 20 LTS, build-essential tools, and required runtime headers.
4. Generates cryptographic secrets in `.env`.
5. Builds the production frontend and backend bundles.
6. Installs and enables the `omnihost.service` systemd daemon for 24/7 boot recovery.
7. Opens firewall ports (3000, 80, 443, 25565).
8. Runs automated health probes and displays the control panel URL.

---

## Docker Compose Deployment

Alternatively, run via Docker Compose:

```bash
docker-compose up -d
```

---

## Default Access Credentials

- **Web Control Panel**: `http://<YOUR_SERVER_IP>:3000`
- **Super Admin Email**: `admin@omnihost.cloud`
- **Super Admin Password**: `admin123456`
- **Developer Account**: `developer@omnihost.cloud` / `admin123456`

---

## CLI Utilities

- `./health-check.sh` - Run instant diagnostics on processes, ports, and services.
- `./backup.sh` - Create a standalone archive of the system state and projects.
- `./restore.sh <backup.tar.gz>` - Restore snapshot to current node.
- `npm test` - Execute the full automated test suite.
