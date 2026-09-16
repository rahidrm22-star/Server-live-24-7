#!/usr/bin/env node
/**
 * ComputeHub Universal Server Platform - Termux Worker Agent
 * Runs on Android Termux to provide 24/7 distributed compute capabilities to the Controller.
 */

const http = require('http');
const https = require('https');
const { spawn, execSync } = require('child_process');
const os = require('os');
const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
  controllerUrl: process.env.COMPUTEHUB_CONTROLLER_URL || 'http://localhost:3000',
  workerToken: process.env.COMPUTEHUB_WORKER_TOKEN || 'sec_termux_default_token',
  workerId: process.env.COMPUTEHUB_WORKER_ID || `termux_${os.hostname()}_${os.arch()}`,
  workerName: process.env.COMPUTEHUB_WORKER_NAME || `Android Termux Node (${os.hostname()})`,
  heartbeatIntervalMs: parseInt(process.env.HEARTBEAT_INTERVAL_MS, 10) || 8000,
  workloadsDir: path.join(process.cwd(), 'workloads')
};

// Parse command line overrides: --controller https://... --token ... --name ...
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--controller' && args[i + 1]) CONFIG.controllerUrl = args[++i];
  if (args[i] === '--token' && args[i + 1]) CONFIG.workerToken = args[++i];
  if (args[i] === '--name' && args[i + 1]) CONFIG.workerName = args[++i];
  if (args[i] === '--id' && args[i + 1]) CONFIG.workerId = args[++i];
}

console.log('======================================================');
console.log('   COMPUTEHUB 24/7 WORKER AGENT FOR ANDROID TERMUX   ');
console.log('======================================================');
console.log(`[INIT] Controller:  ${CONFIG.controllerUrl}`);
console.log(`[INIT] Worker ID:   ${CONFIG.workerId}`);
console.log(`[INIT] Worker Name: ${CONFIG.workerName}`);
console.log(`[INIT] Platform:    ${os.type()} ${os.arch()} (Termux)`);

if (!fs.existsSync(CONFIG.workloadsDir)) {
  fs.mkdirSync(CONFIG.workloadsDir, { recursive: true });
}

// Active child processes managed by this worker
const activeWorkloads = new Map();

// Battery level detection in Android Termux
function getBatteryInfo() {
  try {
    // Try termux-battery-status if termux-api installed
    const out = execSync('termux-battery-status 2>/dev/null', { timeout: 1500 }).toString();
    const data = JSON.parse(out);
    return {
      level: data.percentage,
      isCharging: data.status === 'CHARGING' || data.status === 'FULL',
      temperatureC: data.temperature
    };
  } catch {
    try {
      // Try direct Linux sysfs battery node
      const cap = fs.readFileSync('/sys/class/power_supply/battery/capacity', 'utf-8').trim();
      const status = fs.readFileSync('/sys/class/power_supply/battery/status', 'utf-8').trim();
      return {
        level: parseInt(cap, 10) || 90,
        isCharging: status.toLowerCase().includes('charging') || status.toLowerCase().includes('full')
      };
    } catch {
      return { level: 95, isCharging: true };
    }
  }
}

// Storage stats detection
function getStorageStats() {
  try {
    const out = execSync('df -k . 2>/dev/null', { timeout: 1500 }).toString();
    const lines = out.trim().split('\n');
    if (lines.length >= 2) {
      const parts = lines[1].trim().split(/\s+/);
      const totalKB = parseInt(parts[1], 10) || 10000000;
      const usedKB = parseInt(parts[2], 10) || 2000000;
      const freeKB = parseInt(parts[3], 10) || 8000000;
      return {
        totalGB: Math.round((totalKB / (1024 * 1024)) * 10) / 10,
        usedGB: Math.round((usedKB / (1024 * 1024)) * 10) / 10,
        freeGB: Math.round((freeKB / (1024 * 1024)) * 10) / 10,
        storageUsagePercent: Math.round((usedKB / totalKB) * 1000) / 10
      };
    }
  } catch {}
  return { totalGB: 64, usedGB: 18, freeGB: 46, storageUsagePercent: 28.1 };
}

// Detect installed runtimes in Termux
function detectRuntimes() {
  const check = (cmd, runtimeId) => {
    try {
      const v = execSync(`${cmd} 2>/dev/null`, { timeout: 1500 }).toString().trim().split('\n')[0];
      return { runtime: runtimeId, available: true, version: v.substring(0, 40) };
    } catch {
      return { runtime: runtimeId, available: false };
    }
  };

  return [
    check('node --version', 'nodejs-20'),
    check('node --version', 'nodejs-22'),
    check('python3 --version', 'python-3.11'),
    check('python3 -c "import torch; print(torch.__version__)"', 'python-ai-pytorch'),
    check('php --version', 'php-8.3'),
    check('java --version', 'java-21'),
    check('go version', 'go-1.22'),
    check('rustc --version', 'rust-1.78'),
    check('gcc --version', 'cpp-gcc'),
    check('bash --version', 'bash'),
    check('docker --version', 'docker'),
    { runtime: 'static', available: true, version: 'Static Engine 1.0' }
  ];
}

// Collect hardware telemetry
function collectTelemetry() {
  const totalMem = Math.round(os.totalmem() / (1024 * 1024));
  const freeMem = Math.round(os.freemem() / (1024 * 1024));
  const usedMem = totalMem - freeMem;
  const storage = getStorageStats();
  const battery = getBatteryInfo();
  const cpus = os.cpus();
  const load = os.loadavg();

  // Approximate CPU load
  let cpuUsage = 15;
  if (cpus && cpus.length > 0) {
    const coreLoad = load[0] ? (load[0] / cpus.length) * 100 : 15;
    cpuUsage = Math.min(100, Math.max(5, Math.round(coreLoad * 10) / 10));
  }

  return {
    cpuCores: cpus.length || 8,
    cpuModel: cpus[0]?.model || 'ARMv8 Processor (Termux)',
    cpuUsagePercent: cpuUsage,
    totalMemoryMB: totalMem,
    usedMemoryMB: usedMem,
    freeMemoryMB: freeMem,
    memoryUsagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
    totalStorageGB: storage.totalGB,
    usedStorageGB: storage.usedGB,
    freeStorageGB: storage.freeGB,
    storageUsagePercent: storage.storageUsagePercent,
    battery,
    uptimeSeconds: Math.floor(os.uptime()),
    loadAverage: load
  };
}

// HTTP request helper
function sendApi(endpoint, data) {
  return new Promise((resolve, reject) => {
    try {
      const url = new URL(endpoint, CONFIG.controllerUrl);
      const isHttps = url.protocol === 'https:';
      const client = isHttps ? https : http;

      const bodyStr = JSON.stringify(data);
      const options = {
        hostname: url.hostname,
        port: url.port || (isHttps ? 443 : 80),
        path: url.pathname + url.search,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(bodyStr),
          'Authorization': `Bearer ${CONFIG.workerToken}`
        },
        timeout: 10000
      };

      const req = client.request(options, (res) => {
        let resData = '';
        res.on('data', chunk => resData += chunk);
        res.on('end', () => {
          try {
            const parsed = JSON.parse(resData);
            resolve(parsed);
          } catch (e) {
            resolve({ raw: resData, statusCode: res.statusCode });
          }
        });
      });

      req.on('error', (err) => reject(err));
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('HTTP request timed out'));
      });

      req.write(bodyStr);
      req.end();
    } catch (err) {
      reject(err);
    }
  });
}

// Execute workload job
async function executeJob(job) {
  console.log(`[JOB] Processing job ${job.id} (${job.type}) for project ${job.projectId}`);
  const payload = job.payload || {};

  try {
    if (job.type === 'deploy' || job.type === 'start' || job.type === 'restart') {
      const projectDir = path.join(CONFIG.workloadsDir, job.projectId);
      if (!fs.existsSync(projectDir)) {
        fs.mkdirSync(projectDir, { recursive: true });
      }

      // If starter/custom files provided in payload, write them to disk
      if (payload.files && typeof payload.files === 'object') {
        for (const [filename, content] of Object.entries(payload.files)) {
          const filePath = path.join(projectDir, filename);
          fs.writeFileSync(filePath, String(content), 'utf-8');
        }
      }

      // Determine default files if runtime is python and no main script exists
      const runtime = payload.runtime || 'python-3.11';
      if (runtime.includes('python')) {
        const pyFile = path.join(projectDir, 'main.py');
        if (!fs.existsSync(pyFile)) {
          const defaultPyCode = `import time
import sys
import os

print(f"[TERMUX PYTHON WORKLOAD] Initializing on Android Termux...")
print(f"[TERMUX PYTHON WORKLOAD] Python Version: {sys.version.split()[0]}")
print(f"[TERMUX PYTHON WORKLOAD] Architecture: {os.uname().machine} | Node: {os.uname().nodename}")
print(f"[TERMUX PYTHON WORKLOAD] Process PID: {os.getpid()} | Internal Port: {os.environ.get('PORT', '3200')}")
sys.stdout.flush()

count = 1
while True:
    print(f"[TERMUX PYTHON WORKLOAD] Worker heartbeat tick #{count} | Running 24/7 on Android Termux")
    sys.stdout.flush()
    count += 1
    time.sleep(8)
`;
          fs.writeFileSync(pyFile, defaultPyCode, 'utf-8');
        }
      } else if (runtime.includes('nodejs')) {
        const jsFile = path.join(projectDir, 'index.js');
        if (!fs.existsSync(jsFile)) {
          const defaultJsCode = `const http = require('http');
const port = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ status: 'ok', runtime: 'NodeJS on Termux', uptime: process.uptime() }));
});
server.listen(port, () => {
  console.log(\`[TERMUX NODEJS WORKLOAD] HTTP Server listening on port \${port}\`);
});
`;
          fs.writeFileSync(jsFile, defaultJsCode, 'utf-8');
        }
      }

      // Determine start command
      let startScript = payload.startCommand;
      if (!startScript) {
        if (runtime.includes('python')) {
          startScript = 'python3 main.py';
        } else if (runtime.includes('nodejs')) {
          startScript = 'node index.js';
        } else if (runtime.includes('bash')) {
          startScript = 'bash run.sh';
        } else {
          startScript = 'python3 main.py';
        }
      }

      console.log(`[JOB] Starting workload in ${projectDir} with command: "${startScript}"`);

      // Stop existing instance if any
      if (activeWorkloads.has(job.projectId)) {
        const existing = activeWorkloads.get(job.projectId);
        try { existing.kill('SIGTERM'); } catch {}
        activeWorkloads.delete(job.projectId);
      }

      const logFile = path.join(projectDir, 'app.log');
      const logStream = fs.createWriteStream(logFile, { flags: 'a' });

      // Spawn process
      const child = spawn(startScript, [], {
        cwd: projectDir,
        env: { ...process.env, ...payload.envVars, PORT: String(payload.port || 3200) },
        shell: true
      });

      child.stdout.on('data', (d) => {
        const str = d.toString();
        logStream.write(str);
        process.stdout.write(`[${job.projectId}] ${str}`);
      });

      child.stderr.on('data', (d) => {
        const str = d.toString();
        logStream.write(`[STDERR] ${str}`);
        process.stderr.write(`[${job.projectId} ERR] ${str}`);
      });

      activeWorkloads.set(job.projectId, child);

      child.on('exit', (code) => {
        console.log(`[WORKLOAD] Project ${job.projectId} exited with code ${code}`);
        logStream.write(`\n[PROCESS EXITED] Exit code: ${code}\n`);
        activeWorkloads.delete(job.projectId);
      });

      // Submit success
      await sendApi(`/api/workers/${CONFIG.workerId}/jobs/${job.id}/result`, {
        status: 'completed',
        result: { pid: child.pid, started: true, runtime: payload.runtime, command: startScript }
      });
    } else if (job.type === 'stop') {
      if (activeWorkloads.has(job.projectId)) {
        const proc = activeWorkloads.get(job.projectId);
        try { proc.kill('SIGTERM'); } catch {}
        activeWorkloads.delete(job.projectId);
      }
      await sendApi(`/api/workers/${CONFIG.workerId}/jobs/${job.id}/result`, {
        status: 'completed',
        result: { stopped: true }
      });
    }
  } catch (err) {
    console.error(`[JOB ERROR] Job ${job.id} failed:`, err.message);
    await sendApi(`/api/workers/${CONFIG.workerId}/jobs/${job.id}/result`, {
      status: 'failed',
      result: { error: err.message }
    });
  }
}

// Initial Registration
async function register() {
  const telemetry = collectTelemetry();
  const runtimes = detectRuntimes();

  const regPayload = {
    workerId: CONFIG.workerId,
    name: CONFIG.workerName,
    type: 'termux',
    token: CONFIG.workerToken,
    connectionType: 'outbound_polling',
    os: {
      name: 'Android Termux Linux',
      version: os.release(),
      arch: os.arch(),
      platform: 'android',
      isTermux: true,
      nodeVersion: process.version
    },
    hardware: telemetry,
    runtimes,
    maxWorkloads: 10,
    tags: ['termux', 'android', 'arm64', 'edge', 'outbound-worker']
  };

  try {
    console.log(`[REGISTER] Contacting Controller at ${CONFIG.controllerUrl}/api/workers/register...`);
    const res = await sendApi('/api/workers/register', regPayload);
    if (res.success) {
      console.log(`[REGISTER] ✓ Successfully registered with Controller! Worker ID: ${res.data?.id || CONFIG.workerId}`);
    } else {
      console.log(`[REGISTER] Response from Controller:`, res);
    }
  } catch (err) {
    console.warn(`[REGISTER WARNING] Could not register immediately (${err.message}). Will retry in heartbeat loop.`);
  }
}

// Heartbeat Loop
async function heartbeat() {
  const telemetry = collectTelemetry();
  const payload = {
    workerId: CONFIG.workerId,
    hardware: telemetry,
    timestamp: Date.now(),
    activeWorkloadsCount: activeWorkloads.size
  };

  try {
    const res = await sendApi('/api/workers/heartbeat', payload);
    if (res.success) {
      // Process pending jobs dispatched by controller
      const jobs = res.data?.pendingJobs || res.pendingJobs || [];
      if (jobs.length > 0) {
        console.log(`[HEARTBEAT] Received ${jobs.length} pending job(s) from controller`);
        for (const job of jobs) {
          await executeJob(job);
        }
      }
    }
  } catch (err) {
    console.warn(`[HEARTBEAT] Ping failed (${err.message}). Reconnecting...`);
  }
}

// Startup execution
async function main() {
  await register();
  setInterval(heartbeat, CONFIG.heartbeatIntervalMs);
  console.log(`[RUNNING] ComputeHub Termux Worker Agent is active 24/7. Heartbeat every ${CONFIG.heartbeatIntervalMs / 1000}s.`);
}

main();
