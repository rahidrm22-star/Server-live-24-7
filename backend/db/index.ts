import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { 
  User, Project, Deployment, ManagedProcess, ManagedDomain, 
  ManagedDatabase, ApiKey, HostingPlan, AuditLog, BackupRecord,
  ComputeWorker, WorkerJob
} from '../types/index.ts';

const STORAGE_DIR = path.join(process.cwd(), 'storage');
const DB_FILE = path.join(STORAGE_DIR, 'omnihost.db.json');

export interface DatabaseState {
  users: User[];
  projects: Project[];
  deployments: Deployment[];
  processes: ManagedProcess[];
  domains: ManagedDomain[];
  databases: ManagedDatabase[];
  apiKeys: ApiKey[];
  plans: HostingPlan[];
  auditLogs: AuditLog[];
  backups: BackupRecord[];
  workers: ComputeWorker[];
  workerJobs: WorkerJob[];
  systemSettings: Record<string, unknown>;
}

export function hashPassword(password: string, salt: string = 'omnihost_salt'): string {
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function generateToken(payload: object): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const secret = process.env.JWT_SECRET || 'omnihost_super_secret_production_key_2026';
  const signature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${signature}`;
}

export function verifyToken(token: string): { valid: boolean; payload?: any } {
  try {
    const [header, body, signature] = token.split('.');
    if (!header || !body || !signature) return { valid: false };
    const secret = process.env.JWT_SECRET || 'omnihost_super_secret_production_key_2026';
    const expectedSignature = crypto.createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
    if (signature !== expectedSignature) return { valid: false };
    const decoded = JSON.parse(Buffer.from(body, 'base64url').toString('utf-8'));
    return { valid: true, payload: decoded };
  } catch {
    return { valid: false };
  }
}

const DEFAULT_PLANS: HostingPlan[] = [
  {
    id: 'free',
    name: 'Free Tier',
    description: 'Great for testing small APIs, static sites, and microservices',
    priceMonthly: 0,
    maxProjects: 3,
    maxCpuCores: 1.0,
    maxMemoryMB: 1024,
    maxStorageMB: 5120,
    maxBandwidthGB: 50,
    maxDatabases: 1,
    allowCustomDomains: false,
    allowGpu: false,
    allowGameServers: false,
    allowAiWorkloads: true,
    maxProcesses: 3,
    features: ['1 vCPU Compute', '1 GB RAM', '5 GB SSD', 'Shared Subdomain', 'Auto Restart', 'SSL Termination']
  },
  {
    id: 'pro',
    name: 'Pro Compute',
    description: 'High performance for production web apps, databases & game servers',
    priceMonthly: 19,
    maxProjects: 15,
    maxCpuCores: 4.0,
    maxMemoryMB: 8192,
    maxStorageMB: 51200,
    maxBandwidthGB: 1000,
    maxDatabases: 5,
    allowCustomDomains: true,
    allowGpu: false,
    allowGameServers: true,
    allowAiWorkloads: true,
    maxProcesses: 20,
    features: ['4 vCPU Compute', '8 GB RAM', '50 GB NVMe', 'Custom Domains', 'Game Servers (Minecraft/Valheim)', 'Automated Backups', 'Terminal Access']
  },
  {
    id: 'business',
    name: 'Business & AI Cluster',
    description: 'Maximum power for ML models, high-tick game servers & intensive apps',
    priceMonthly: 79,
    maxProjects: 50,
    maxCpuCores: 16.0,
    maxMemoryMB: 32768,
    maxStorageMB: 256000,
    maxBandwidthGB: 5000,
    maxDatabases: 20,
    allowCustomDomains: true,
    allowGpu: true,
    allowGameServers: true,
    allowAiWorkloads: true,
    maxProcesses: 100,
    features: ['16 vCPU Compute', '32 GB RAM', '256 GB NVMe', 'GPU Acceleration / CUDA', 'Dedicated Ports', 'Priority Background Workers', '24/7 SLA Recovery']
  }
];

class DatabaseService {
  private state: DatabaseState = {
    users: [],
    projects: [],
    deployments: [],
    processes: [],
    domains: [],
    databases: [],
    apiKeys: [],
    plans: DEFAULT_PLANS,
    auditLogs: [],
    backups: [],
    workers: [],
    workerJobs: [],
    systemSettings: {
      serverName: 'ComputeHub Primary Controller 01',
      publicDomain: 'computehub.local',
      allowRegistration: true,
      requireEmailVerification: false,
      defaultUserPlan: 'pro',
      reverseProxyPort: 80,
      sslEnabled: true,
      maxGlobalProcesses: 500,
      autoRestartCrashed: true
    }
  };

  constructor() {
    this.ensureStorage();
    this.load();
    this.seedDefaultData();
  }

  private ensureStorage() {
    if (!fs.existsSync(STORAGE_DIR)) {
      fs.mkdirSync(STORAGE_DIR, { recursive: true });
    }
    const projectsDir = path.join(STORAGE_DIR, 'projects');
    if (!fs.existsSync(projectsDir)) {
      fs.mkdirSync(projectsDir, { recursive: true });
    }
    const backupsDir = path.join(STORAGE_DIR, 'backups');
    if (!fs.existsSync(backupsDir)) {
      fs.mkdirSync(backupsDir, { recursive: true });
    }
  }

  private load() {
    try {
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.state = { ...this.state, ...parsed };
      }
    } catch (e) {
      console.error('[DB] Failed to load database, using clean state:', e);
    }
  }

  public save() {
    try {
      this.ensureStorage();
      fs.writeFileSync(DB_FILE, JSON.stringify(this.state, null, 2), 'utf-8');
    } catch (e) {
      console.error('[DB] Failed to save database:', e);
    }
  }

  private seedDefaultData() {
    // Seed Admin if not exists
    if (this.state.users.length === 0) {
      const adminPasswordHash = hashPassword('admin123456');
      const adminUser: User = {
        id: 'user_admin_root',
        email: 'admin@omnihost.cloud',
        name: 'OmniHost Super Admin',
        role: 'superadmin',
        planId: 'business',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };
      
      const demoUser: User = {
        id: 'user_developer_01',
        email: 'developer@omnihost.cloud',
        name: 'Senior Systems Engineer',
        role: 'user',
        planId: 'pro',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLoginAt: new Date().toISOString()
      };

      this.state.users = [adminUser, demoUser];

      // Seed Starter Projects
      const sampleProjects: Project[] = [
        {
          id: 'proj_api_gateway',
          ownerId: 'user_developer_01',
          name: 'Core API Gateway Microservice',
          slug: 'api-gateway',
          description: 'High throughput Node.js / Express REST and WebSocket gateway',
          workloadType: 'api',
          runtime: 'nodejs-20',
          status: 'running',
          buildCommand: 'npm install',
          startCommand: 'node index.js',
          assignedInternalPort: 3101,
          ports: [{ internalPort: 3101, publicPort: 443, protocol: 'http', isExposed: true }],
          subdomain: 'api-gateway',
          storagePath: path.join(STORAGE_DIR, 'projects', 'proj_api_gateway'),
          restartPolicy: 'always',
          restartCount: 0,
          envVars: {
            NODE_ENV: 'production',
            PORT: '3101',
            RATE_LIMIT: '1000'
          },
          limits: {
            cpuCores: 2.0,
            memoryMB: 2048,
            storageMB: 10240,
            processLimit: 5
          },
          createdAt: new Date(Date.now() - 3600000 * 24 * 4).toISOString(),
          updatedAt: new Date().toISOString(),
          lastDeployedAt: new Date(Date.now() - 3600000 * 5).toISOString()
        },
        {
          id: 'proj_fastapi_llama',
          ownerId: 'user_developer_01',
          name: 'FastAPI Llama AI Embeddings & Inference',
          slug: 'fastapi-llama',
          description: 'Python FastAPI PyTorch AI engine serving embeddings and semantic search',
          workloadType: 'ai',
          runtime: 'python-ai-pytorch',
          status: 'running',
          buildCommand: 'pip install -r requirements.txt',
          startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
          assignedInternalPort: 8000,
          ports: [{ internalPort: 8000, publicPort: 8000, protocol: 'http', isExposed: true }],
          subdomain: 'ai-infer',
          storagePath: path.join(STORAGE_DIR, 'projects', 'proj_fastapi_llama'),
          restartPolicy: 'always',
          restartCount: 0,
          envVars: {
            MODEL_NAME: 'meta-llama-3-8b-instruct',
            MAX_BATCH_SIZE: '16',
            ENABLE_CUDA: 'true'
          },
          limits: {
            cpuCores: 4.0,
            memoryMB: 8192,
            storageMB: 51200,
            processLimit: 10,
            gpuEnabled: true,
            gpuMemoryMB: 4096
          },
          aiConfig: {
            modelType: 'text-generation-inference',
            accelerator: 'cuda',
            apiEndpointPath: '/api/v1/generate'
          },
          createdAt: new Date(Date.now() - 3600000 * 24 * 2).toISOString(),
          updatedAt: new Date().toISOString(),
          lastDeployedAt: new Date(Date.now() - 3600000 * 12).toISOString()
        },
        {
          id: 'proj_game_paper_mc',
          ownerId: 'user_developer_01',
          name: 'Survival SMP Paper Minecraft Dedicated',
          slug: 'survival-smp',
          description: 'High-tick Java 21 Paper Minecraft game server with automated world backups',
          workloadType: 'gameserver',
          runtime: 'java-21',
          status: 'running',
          buildCommand: 'echo "Java Paper Ready"',
          startCommand: 'java -Xms2G -Xmx4G -XX:+UseG1GC -jar paper.jar --nogui',
          assignedInternalPort: 25565,
          ports: [
            { internalPort: 25565, publicPort: 25565, protocol: 'tcp', isExposed: true },
            { internalPort: 25575, publicPort: 25575, protocol: 'tcp', isExposed: false }
          ],
          subdomain: 'play-survival',
          storagePath: path.join(STORAGE_DIR, 'projects', 'proj_game_paper_mc'),
          restartPolicy: 'always',
          restartCount: 0,
          envVars: {
            MAX_PLAYERS: '30',
            DIFFICULTY: 'hard',
            MOTD: 'OmniHost 24/7 High-Perf SMP'
          },
          limits: {
            cpuCores: 4.0,
            memoryMB: 6144,
            storageMB: 30720,
            processLimit: 5
          },
          gameServerConfig: {
            gameType: 'minecraft',
            maxPlayers: 30,
            worldName: 'world_smp_prime',
            queryPort: 25565,
            rconPort: 25575
          },
          createdAt: new Date(Date.now() - 3600000 * 24 * 7).toISOString(),
          updatedAt: new Date().toISOString(),
          lastDeployedAt: new Date(Date.now() - 3600000 * 24).toISOString()
        }
      ];

      this.state.projects = sampleProjects;

      // Create project directory files for sample projects
      this.initSampleProjectFiles();

      // Seed Deployments
      this.state.deployments = [
        {
          id: 'dep_001',
          projectId: 'proj_api_gateway',
          version: 1,
          status: 'active',
          commitMessage: 'Initial microservice deployment',
          sourceType: 'template',
          logs: [
            '[SYSTEM] Validating project manifest...',
            '[BUILD] Executing: npm install',
            '[BUILD] Dependencies resolved in 1.4s',
            '[RUNTIME] Allocating isolated port 3101',
            '[HEALTH] Probing http://localhost:3101/health - Status 200 OK',
            '[PROXY] Route mapped to https://api-gateway.omnihost.local',
            '[STATUS] Deployment ACTIVE'
          ],
          startedAt: new Date(Date.now() - 3600000 * 5).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 5 + 8000).toISOString(),
          deployedBy: 'user_developer_01'
        },
        {
          id: 'dep_002',
          projectId: 'proj_fastapi_llama',
          version: 1,
          status: 'active',
          commitMessage: 'Mount PyTorch CUDA inference worker',
          sourceType: 'template',
          logs: [
            '[SYSTEM] Validating Python AI runtime requirements...',
            '[CUDA] Detecting GPU Hardware: CUDA cores available',
            '[BUILD] Loading requirements.txt (fastapi, torch, transformers)',
            '[PROCESS] Spawning worker: uvicorn main:app --port 8000',
            '[HEALTH] Ready state verified',
            '[AI] Endpoint /api/v1/generate authenticated and active'
          ],
          startedAt: new Date(Date.now() - 3600000 * 12).toISOString(),
          completedAt: new Date(Date.now() - 3600000 * 12 + 14000).toISOString(),
          deployedBy: 'user_developer_01'
        }
      ];

      // Seed Databases
      this.state.databases = [
        {
          id: 'db_pg_primary',
          projectId: 'proj_api_gateway',
          ownerId: 'user_developer_01',
          name: 'Production PostgreSQL Cluster',
          type: 'postgresql',
          status: 'online',
          databaseName: 'omnihost_app_db',
          username: 'db_user_app',
          port: 5432,
          connectionUri: 'postgresql://db_user_app:pg_secret_pass_2026@localhost:5432/omnihost_app_db',
          sizeMB: 142,
          createdAt: new Date().toISOString()
        },
        {
          id: 'db_redis_cache',
          projectId: 'proj_api_gateway',
          ownerId: 'user_developer_01',
          name: 'Redis 7 Session & Queue Cache',
          type: 'redis',
          status: 'online',
          databaseName: 'redis_0',
          username: 'default',
          port: 6379,
          connectionUri: 'redis://:redis_secret_pass_2026@localhost:6379/0',
          sizeMB: 28,
          createdAt: new Date().toISOString()
        }
      ];

      // Seed Domains
      this.state.domains = [
        {
          id: 'dom_001',
          projectId: 'proj_api_gateway',
          ownerId: 'user_developer_01',
          domainName: 'api.omnihost.local',
          isCustom: false,
          status: 'ssl_active',
          sslProvider: 'letsencrypt',
          dnsTarget: 'node1.omnihost.cloud',
          createdAt: new Date().toISOString()
        },
        {
          id: 'dom_002',
          projectId: 'proj_fastapi_llama',
          ownerId: 'user_developer_01',
          domainName: 'ai-engine.omnihost.local',
          isCustom: false,
          status: 'ssl_active',
          sslProvider: 'letsencrypt',
          dnsTarget: 'node1.omnihost.cloud',
          createdAt: new Date().toISOString()
        }
      ];

      // Seed Audit Logs
      this.state.auditLogs = [
        {
          id: 'audit_001',
          userId: 'user_admin_root',
          userEmail: 'admin@omnihost.cloud',
          action: 'SYSTEM_BOOT',
          category: 'system',
          details: { message: 'OmniHost 24/7 Cloud Node supervisor initialized successfully' },
          createdAt: new Date(Date.now() - 3600000 * 24).toISOString()
        },
        {
          id: 'audit_002',
          userId: 'user_developer_01',
          userEmail: 'developer@omnihost.cloud',
          action: 'DEPLOYMENT_SUCCESS',
          category: 'deployment',
          details: { projectId: 'proj_api_gateway', version: 1 },
          createdAt: new Date(Date.now() - 3600000 * 5).toISOString()
        }
      ];

      // Seed API Keys
      this.state.apiKeys = [
        {
          id: 'key_master_01',
          userId: 'user_developer_01',
          name: 'CLI Deployment Token',
          keyPrefix: 'omh_live_9f82',
          keyHash: crypto.createHash('sha256').update('omh_live_9f828a2c11099e4b77f1').digest('hex'),
          scopes: ['projects:read', 'projects:write', 'deployments:read', 'deployments:write', 'ai:generate', 'logs:read'],
          createdAt: new Date().toISOString(),
          lastUsedAt: new Date().toISOString()
        }
      ];

      // Seed ComputeHub Worker Nodes (Termux, VPS, Local Runner)
      this.state.workers = [
        {
          id: 'worker_termux_node01',
          name: 'Samsung Galaxy S24 Ultra (Termux v0.118)',
          type: 'termux',
          status: 'online',
          connectionType: 'outbound_polling',
          token: 'sec_termux_node01_' + crypto.randomBytes(8).toString('hex'),
          ipAddress: '192.168.1.142',
          os: {
            name: 'Android 14 (Termux Linux)',
            version: '14.0',
            arch: 'aarch64',
            platform: 'android',
            isTermux: true,
            kernel: 'Linux 6.1.43-android14-arm64',
            nodeVersion: 'v20.18.0'
          },
          hardware: {
            cpuCores: 8,
            cpuModel: 'Qualcomm Snapdragon 8 Gen 3 (8x Kryo)',
            cpuUsagePercent: 18.5,
            totalMemoryMB: 12288,
            usedMemoryMB: 3410,
            freeMemoryMB: 8878,
            memoryUsagePercent: 27.7,
            totalStorageGB: 512,
            usedStorageGB: 114,
            freeStorageGB: 398,
            storageUsagePercent: 22.2,
            battery: {
              level: 92,
              isCharging: true,
              temperatureC: 32.4
            },
            uptimeSeconds: 384920,
            loadAverage: [0.42, 0.38, 0.31]
          },
          runtimes: [
            { runtime: 'nodejs-20', available: true, version: '20.18.0' },
            { runtime: 'nodejs-22', available: true, version: '22.9.0' },
            { runtime: 'python-3.11', available: true, version: '3.11.9' },
            { runtime: 'python-ai-pytorch', available: true, version: '2.4.0+cpu' },
            { runtime: 'php-8.3', available: true, version: '8.3.11' },
            { runtime: 'cpp-gcc', available: true, version: '14.2.0' },
            { runtime: 'rust-1.78', available: true, version: '1.78.0' },
            { runtime: 'go-1.22', available: true, version: '1.22.4' },
            { runtime: 'bash', available: true, version: '5.2.26' },
            { runtime: 'docker', available: false }
          ],
          assignedProjectsCount: 1,
          maxWorkloads: 8,
          lastHeartbeatAt: new Date().toISOString(),
          pingLatencyMs: 24,
          tags: ['arm64', 'termux', 'android', 'low-power', 'edge-compute'],
          createdAt: new Date(Date.now() - 3600000 * 48).toISOString(),
          notes: 'Android Termux outbound worker with 8-core CPU and 12GB RAM.'
        },
        {
          id: 'worker_vps_hetzner01',
          name: 'Hetzner Cloud CPX31 (Linux VPS)',
          type: 'linux_vps',
          status: 'online',
          url: 'https://vps-node01.computehub.cloud:8443',
          connectionType: 'inbound_http',
          token: 'sec_vps_hetzner01_' + crypto.randomBytes(8).toString('hex'),
          ipAddress: '159.69.182.94',
          os: {
            name: 'Ubuntu 24.04 LTS (Noble Numbat)',
            version: '24.04',
            arch: 'x86_64',
            platform: 'linux',
            isTermux: false,
            kernel: 'Linux 6.8.0-45-generic',
            nodeVersion: 'v20.18.0'
          },
          hardware: {
            cpuCores: 4,
            cpuModel: 'AMD EPYC-Milan Processor (4 Cores)',
            cpuUsagePercent: 24.1,
            totalMemoryMB: 8192,
            usedMemoryMB: 2890,
            freeMemoryMB: 5302,
            memoryUsagePercent: 35.2,
            totalStorageGB: 160,
            usedStorageGB: 38,
            freeStorageGB: 122,
            storageUsagePercent: 23.7,
            uptimeSeconds: 1284920,
            loadAverage: [0.65, 0.72, 0.58]
          },
          runtimes: [
            { runtime: 'nodejs-20', available: true, version: '20.18.0' },
            { runtime: 'nodejs-22', available: true, version: '22.9.0' },
            { runtime: 'python-3.11', available: true, version: '3.11.9' },
            { runtime: 'python-ai-pytorch', available: true, version: '2.4.0+cu121' },
            { runtime: 'java-21', available: true, version: '21.0.4 OpenJDK' },
            { runtime: 'php-8.3', available: true, version: '8.3.11' },
            { runtime: 'go-1.22', available: true, version: '1.22.6' },
            { runtime: 'rust-1.78', available: true, version: '1.78.0' },
            { runtime: 'cpp-gcc', available: true, version: '13.2.0' },
            { runtime: 'docker', available: true, version: '27.2.0' },
            { runtime: 'bash', available: true, version: '5.2.21' }
          ],
          assignedProjectsCount: 2,
          maxWorkloads: 20,
          lastHeartbeatAt: new Date().toISOString(),
          pingLatencyMs: 14,
          tags: ['x86_64', 'ubuntu', 'docker', 'high-bandwidth', 'nvme'],
          createdAt: new Date(Date.now() - 3600000 * 72).toISOString(),
          notes: 'High-performance cloud VPS running full Docker daemon and Java Minecraft paper runtime.'
        },
        {
          id: 'worker_local_controller',
          name: 'ComputeHub Primary Local Runner',
          type: 'local_runner',
          status: 'online',
          connectionType: 'inbound_http',
          token: 'sec_local_internal_token',
          ipAddress: '127.0.0.1',
          os: {
            name: 'Linux (Shared Host Engine)',
            version: '6.6.0',
            arch: 'x86_64',
            platform: 'linux',
            isTermux: false,
            nodeVersion: process.version
          },
          hardware: {
            cpuCores: 4,
            cpuModel: 'Intel Xeon Virtual CPU',
            cpuUsagePercent: 12.0,
            totalMemoryMB: 4096,
            usedMemoryMB: 1120,
            freeMemoryMB: 2976,
            memoryUsagePercent: 27.3,
            totalStorageGB: 100,
            usedStorageGB: 22,
            freeStorageGB: 78,
            storageUsagePercent: 22.0,
            uptimeSeconds: Math.floor(process.uptime()),
            loadAverage: [0.2, 0.15, 0.1]
          },
          runtimes: [
            { runtime: 'nodejs-20', available: true, version: process.version },
            { runtime: 'python-3.11', available: true, version: '3.11.x' },
            { runtime: 'bash', available: true, version: '5.x' },
            { runtime: 'static', available: true, version: '1.0' }
          ],
          assignedProjectsCount: 0,
          maxWorkloads: 10,
          lastHeartbeatAt: new Date().toISOString(),
          pingLatencyMs: 1,
          tags: ['controller', 'local', 'sandbox-jail'],
          createdAt: new Date().toISOString(),
          notes: 'Built-in local controller process isolation sandbox.'
        }
      ];

      // Assign initial sample projects to workers
      this.state.projects[0].workerId = 'worker_termux_node01';
      this.state.projects[1].workerId = 'worker_vps_hetzner01';
      this.state.projects[2].workerId = 'worker_vps_hetzner01';

      this.save();
    }
  }

  private initSampleProjectFiles() {
    for (const proj of this.state.projects) {
      if (!fs.existsSync(proj.storagePath)) {
        fs.mkdirSync(proj.storagePath, { recursive: true });
      }

      if (proj.runtime.startsWith('nodejs')) {
        const pkgJson = path.join(proj.storagePath, 'package.json');
        if (!fs.existsSync(pkgJson)) {
          fs.writeFileSync(pkgJson, JSON.stringify({
            name: proj.slug,
            version: '1.0.0',
            main: 'index.js',
            scripts: { start: 'node index.js' },
            dependencies: { express: '^4.21.2' }
          }, null, 2));
        }

        const indexJs = path.join(proj.storagePath, 'index.js');
        if (!fs.existsSync(indexJs)) {
          fs.writeFileSync(indexJs, `// OmniHost Isolated Worker Process
const http = require('http');
const port = process.env.PORT || ${proj.assignedInternalPort};

const server = http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime(), pid: process.pid }));
  }
  res.writeHead(200, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ 
    message: 'Hello from ${proj.name} running on OmniHost!',
    runtime: 'Node.js 20 LTS',
    port: port,
    timestamp: new Date().toISOString()
  }));
});

server.listen(port, '0.0.0.0', () => {
  console.log('[${proj.slug}] Server listening on port ' + port);
});
`);
        }
      } else if (proj.runtime.includes('python')) {
        const reqTxt = path.join(proj.storagePath, 'requirements.txt');
        if (!fs.existsSync(reqTxt)) {
          fs.writeFileSync(reqTxt, `fastapi>=0.110.0\nuvicorn>=0.28.0\npydantic>=2.0.0\n`);
        }

        const mainPy = path.join(proj.storagePath, 'main.py');
        if (!fs.existsSync(mainPy)) {
          fs.writeFileSync(mainPy, `# FastAPI AI Inference Microservice
from fastapi import FastAPI
from pydantic import BaseModel
import time, os

app = FastAPI(title="${proj.name}")

class GenerateRequest(BaseModel):
    prompt: str
    max_tokens: int = 128
    temperature: float = 0.7

@app.get("/")
def read_root():
    return {"status": "online", "model": "${proj.envVars['MODEL_NAME'] || 'meta-llama-3-8b'}", "accelerator": "CUDA / CPU"}

@app.get("/health")
def health():
    return {"status": "ok", "service": "${proj.slug}"}

@app.post("/api/v1/generate")
def generate(req: GenerateRequest):
    return {
        "prompt": req.prompt,
        "completion": f"OmniHost Compute Engine response for: {req.prompt[:50]}...",
        "tokens_evaluated": len(req.prompt.split()) + 42,
        "latency_ms": 14.8,
        "device": "cuda:0" if os.getenv("ENABLE_CUDA") == "true" else "cpu"
    }
`);
        }
      } else if (proj.workloadType === 'gameserver') {
        const sProp = path.join(proj.storagePath, 'server.properties');
        if (!fs.existsSync(sProp)) {
          fs.writeFileSync(sProp, `# Minecraft Server Properties - Managed by OmniHost
server-port=${proj.assignedInternalPort}
max-players=${proj.gameServerConfig?.maxPlayers || 20}
motd=${proj.envVars['MOTD'] || 'OmniHost Managed Game Server'}
difficulty=hard
pvp=true
enable-rcon=true
rcon.port=25575
view-distance=12
online-mode=true
`);
        }
      }
    }
  }

  // Getters
  public getUsers(): User[] { return this.state.users; }
  public getProjects(): Project[] { return this.state.projects; }
  public getDeployments(): Deployment[] { return this.state.deployments; }
  public getProcesses(): ManagedProcess[] { return this.state.processes; }
  public getDomains(): ManagedDomain[] { return this.state.domains; }
  public getDatabases(): ManagedDatabase[] { return this.state.databases; }
  public getApiKeys(): ApiKey[] { return this.state.apiKeys; }
  public getPlans(): HostingPlan[] { return this.state.plans; }
  public getAuditLogs(): AuditLog[] { return this.state.auditLogs; }
  public getBackups(): BackupRecord[] { return this.state.backups; }
  public getWorkers(): ComputeWorker[] { return this.state.workers || []; }
  public getWorkerJobs(): WorkerJob[] { return this.state.workerJobs || []; }
  public getSystemSettings(): Record<string, unknown> { return this.state.systemSettings; }

  // User Methods
  public findUserById(id: string): User | undefined {
    return this.state.users.find(u => u.id === id);
  }

  public findUserByEmail(email: string): User | undefined {
    return this.state.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public createUser(user: User): User {
    this.state.users.push(user);
    this.save();
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | undefined {
    const idx = this.state.users.findIndex(u => u.id === id);
    if (idx === -1) return undefined;
    this.state.users[idx] = { ...this.state.users[idx], ...updates };
    this.save();
    return this.state.users[idx];
  }

  public deleteUser(id: string): boolean {
    const initial = this.state.users.length;
    this.state.users = this.state.users.filter(u => u.id !== id);
    // cascade delete user projects
    this.state.projects = this.state.projects.filter(p => p.ownerId !== id);
    this.save();
    return this.state.users.length < initial;
  }

  // Project Methods
  public findProjectById(id: string): Project | undefined {
    return this.state.projects.find(p => p.id === id);
  }

  public findProjectBySlug(slug: string): Project | undefined {
    return this.state.projects.find(p => p.slug === slug);
  }

  public findProjectBySubdomain(subdomain: string): Project | undefined {
    return this.state.projects.find(p => p.subdomain === subdomain);
  }

  public createProject(project: Project): Project {
    this.state.projects.push(project);
    this.save();
    return project;
  }

  public updateProject(id: string, updates: Partial<Project>): Project | undefined {
    const idx = this.state.projects.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.state.projects[idx] = { ...this.state.projects[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.state.projects[idx];
  }

  public deleteProject(id: string): boolean {
    const initial = this.state.projects.length;
    this.state.projects = this.state.projects.filter(p => p.id !== id);
    this.state.deployments = this.state.deployments.filter(d => d.projectId !== id);
    this.state.domains = this.state.domains.filter(d => d.projectId !== id);
    this.state.databases = this.state.databases.filter(d => d.projectId !== id);
    this.save();
    return this.state.projects.length < initial;
  }

  // Deployment Methods
  public createDeployment(deployment: Deployment): Deployment {
    this.state.deployments.unshift(deployment);
    this.save();
    return deployment;
  }

  public updateDeployment(id: string, updates: Partial<Deployment>): Deployment | undefined {
    const idx = this.state.deployments.findIndex(d => d.id === id);
    if (idx === -1) return undefined;
    this.state.deployments[idx] = { ...this.state.deployments[idx], ...updates };
    this.save();
    return this.state.deployments[idx];
  }

  // Domains
  public createDomain(domain: ManagedDomain): ManagedDomain {
    this.state.domains.push(domain);
    this.save();
    return domain;
  }

  public deleteDomain(id: string): boolean {
    const initial = this.state.domains.length;
    this.state.domains = this.state.domains.filter(d => d.id !== id);
    this.save();
    return this.state.domains.length < initial;
  }

  // Databases
  public createDatabase(database: ManagedDatabase): ManagedDatabase {
    this.state.databases.push(database);
    this.save();
    return database;
  }

  public deleteDatabase(id: string): boolean {
    const initial = this.state.databases.length;
    this.state.databases = this.state.databases.filter(d => d.id !== id);
    this.save();
    return this.state.databases.length < initial;
  }

  // API Keys
  public createApiKey(apiKey: ApiKey): ApiKey {
    this.state.apiKeys.push(apiKey);
    this.save();
    return apiKey;
  }

  public deleteApiKey(id: string): boolean {
    const initial = this.state.apiKeys.length;
    this.state.apiKeys = this.state.apiKeys.filter(k => k.id !== id);
    this.save();
    return this.state.apiKeys.length < initial;
  }

  // Plans
  public updatePlan(id: string, updates: Partial<HostingPlan>): HostingPlan | undefined {
    const idx = this.state.plans.findIndex(p => p.id === id);
    if (idx === -1) return undefined;
    this.state.plans[idx] = { ...this.state.plans[idx], ...updates };
    this.save();
    return this.state.plans[idx];
  }

  // Backups
  public createBackup(backup: BackupRecord): BackupRecord {
    this.state.backups.unshift(backup);
    this.save();
    return backup;
  }

  public deleteBackup(id: string): boolean {
    const initial = this.state.backups.length;
    this.state.backups = this.state.backups.filter(b => b.id !== id);
    this.save();
    return this.state.backups.length < initial;
  }

  // Audit Logs
  public addAuditLog(log: Omit<AuditLog, 'id' | 'createdAt'>): AuditLog {
    const entry: AuditLog = {
      ...log,
      id: 'audit_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      createdAt: new Date().toISOString()
    };
    this.state.auditLogs.unshift(entry);
    // Keep max 500 audit logs in history
    if (this.state.auditLogs.length > 500) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 500);
    }
    this.save();
    return entry;
  }

  // Workers
  public findWorkerById(id: string): ComputeWorker | undefined {
    return (this.state.workers || []).find(w => w.id === id);
  }

  public findWorkerByToken(token: string): ComputeWorker | undefined {
    return (this.state.workers || []).find(w => w.token === token);
  }

  public createWorker(worker: ComputeWorker): ComputeWorker {
    if (!this.state.workers) this.state.workers = [];
    this.state.workers.push(worker);
    this.save();
    return worker;
  }

  public updateWorker(id: string, updates: Partial<ComputeWorker>): ComputeWorker | undefined {
    if (!this.state.workers) this.state.workers = [];
    const idx = this.state.workers.findIndex(w => w.id === id);
    if (idx === -1) return undefined;
    this.state.workers[idx] = { ...this.state.workers[idx], ...updates };
    this.save();
    return this.state.workers[idx];
  }

  public deleteWorker(id: string): boolean {
    if (!this.state.workers) return false;
    const initial = this.state.workers.length;
    this.state.workers = this.state.workers.filter(w => w.id !== id);
    // Unassign or fallback projects that were bound to this worker
    if (this.state.projects) {
      for (const p of this.state.projects) {
        if (p.workerId === id) {
          p.workerId = undefined;
        }
      }
    }
    this.save();
    return this.state.workers.length < initial;
  }

  // Worker Jobs
  public getJobsForWorker(workerId: string): WorkerJob[] {
    return (this.state.workerJobs || []).filter(j => j.workerId === workerId);
  }

  public findJobById(id: string): WorkerJob | undefined {
    return (this.state.workerJobs || []).find(j => j.id === id);
  }

  public createWorkerJob(job: WorkerJob): WorkerJob {
    if (!this.state.workerJobs) this.state.workerJobs = [];
    this.state.workerJobs.unshift(job);
    // Keep max 200 jobs in buffer
    if (this.state.workerJobs.length > 200) {
      this.state.workerJobs = this.state.workerJobs.slice(0, 200);
    }
    this.save();
    return job;
  }

  public updateWorkerJob(id: string, updates: Partial<WorkerJob>): WorkerJob | undefined {
    if (!this.state.workerJobs) this.state.workerJobs = [];
    const idx = this.state.workerJobs.findIndex(j => j.id === id);
    if (idx === -1) return undefined;
    this.state.workerJobs[idx] = { ...this.state.workerJobs[idx], ...updates, updatedAt: new Date().toISOString() };
    this.save();
    return this.state.workerJobs[idx];
  }

  public updateSystemSettings(settings: Record<string, unknown>) {
    this.state.systemSettings = { ...this.state.systemSettings, ...settings };
    this.save();
    return this.state.systemSettings;
  }
}

export const db = new DatabaseService();
