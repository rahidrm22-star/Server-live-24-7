# ComputeHub Worker Agent for Android Termux

Transform any spare Android smartphone or tablet into a 24/7 distributed compute node connected to your **ComputeHub Universal Server Platform Controller**.

## Features

- **Outbound Heartbeat & Polling Protocol**: Works behind mobile 4G/5G carrier-grade NAT and Wi-Fi without port forwarding.
- **Hardware Telemetry**: Reports 8-core/4-core ARM CPU load, RAM usage, storage metrics, battery charge level, and temperature.
- **Auto-Runtime Detection**: Automatically detects installed Node.js, Python, PHP, Java, GCC/Clang, Rust, Go, and Bash in Termux.
- **24/7 Background Persistence**: Supports `termux-wake-lock` to keep compute workloads active without aggressive battery sleep interruptions.
- **Isolated Process Spawning**: Runs scheduled workloads and microservices dispatched from the ComputeHub Controller.

## Quick 1-Line Setup on Android Termux

Open Termux and run:

```bash
curl -fsSL https://your-computehub-controller.com/api/workers/scripts/termux-install | bash
```

Or clone and run manually:

```bash
pkg update && pkg install nodejs git -y
git clone https://your-computehub-controller.git computehub-worker
cd computehub-worker/worker-agent/termux
chmod +x install.sh
./install.sh
```

## Manual Configuration (`.env`)

```env
COMPUTEHUB_CONTROLLER_URL=https://your-computehub-domain.example
COMPUTEHUB_WORKER_TOKEN=sec_your_secure_worker_token
COMPUTEHUB_WORKER_NAME=Samsung Galaxy S24 Ultra (Termux)
HEARTBEAT_INTERVAL_MS=8000
```
