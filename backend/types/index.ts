export type UserRole = 'user' | 'admin' | 'superadmin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  planId: string;
  status: 'active' | 'suspended';
  createdAt: string;
  lastLoginAt?: string;
}

export type WorkloadType = 'web' | 'api' | 'ai' | 'gameserver' | 'worker' | 'database' | 'custom';

export type RuntimeId = 
  | 'nodejs-20' 
  | 'nodejs-22' 
  | 'python-3.11' 
  | 'python-ai-pytorch' 
  | 'php-8.3' 
  | 'java-21' 
  | 'go-1.22' 
  | 'rust-1.78' 
  | 'cpp-gcc' 
  | 'bash' 
  | 'docker'
  | 'static';

export type ProjectStatus = 'running' | 'stopped' | 'building' | 'deploying' | 'crashed' | 'error' | 'healthy';

export interface ProjectResourceLimits {
  cpuCores: number; // e.g. 1.0 = 1 CPU Core
  memoryMB: number; // e.g. 512, 1024, 2048
  storageMB: number; // e.g. 5120
  processLimit: number;
  gpuEnabled?: boolean;
  gpuMemoryMB?: number;
}

export interface PortMapping {
  internalPort: number;
  publicPort?: number;
  protocol: 'http' | 'tcp' | 'udp';
  publicDomain?: string;
  isExposed: boolean;
}

export interface Project {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  description: string;
  workloadType: WorkloadType;
  runtime: RuntimeId;
  status: ProjectStatus;
  buildCommand?: string;
  startCommand?: string;
  workingDir?: string;
  envVars: Record<string, string>;
  limits: ProjectResourceLimits;
  ports: PortMapping[];
  domain?: string;
  subdomain: string;
  assignedInternalPort: number;
  storagePath: string;
  gitRepoUrl?: string;
  gitBranch?: string;
  restartPolicy: 'always' | 'on-failure' | 'never';
  restartCount: number;
  lastDeployedAt?: string;
  createdAt: string;
  updatedAt: string;
  workerId?: string; // Assigned ComputeHub Worker Node ID
  targetWorkerPreference?: 'auto' | string; // Preferred worker or auto-scheduler
  // Specific workload metadata
  aiConfig?: {
    modelType: string;
    accelerator: 'cpu' | 'cuda' | 'tensorrt';
    apiEndpointPath: string;
    maxContextTokens?: number;
  };
  gameServerConfig?: {
    gameType: 'minecraft' | 'valheim' | 'palworld' | 'terraria' | 'cs2' | 'custom';
    maxPlayers: number;
    worldName: string;
    queryPort?: number;
    rconPort?: number;
  };
}

export interface Deployment {
  id: string;
  projectId: string;
  version: number;
  status: 'queued' | 'building' | 'deploying' | 'active' | 'failed' | 'rolled_back';
  commitMessage?: string;
  sourceType: 'zip' | 'git' | 'template' | 'file';
  logs: string[];
  durationMs?: number;
  startedAt: string;
  completedAt?: string;
  deployedBy: string;
}

export interface ManagedProcess {
  id: string;
  projectId: string;
  pid?: number;
  name: string;
  command: string;
  status: 'running' | 'stopped' | 'crashed';
  cpuPercent: number;
  memoryMB: number;
  uptimeSeconds: number;
  restarts: number;
  startedAt: string;
}

export interface ManagedDomain {
  id: string;
  projectId: string;
  ownerId: string;
  domainName: string;
  isCustom: boolean;
  status: 'pending' | 'verified' | 'active' | 'ssl_active' | 'error';
  sslProvider: 'letsencrypt' | 'zerossl' | 'self_signed';
  sslExpiresAt?: string;
  dnsTarget: string;
  verificationToken?: string;
  createdAt: string;
}

export interface ManagedDatabase {
  id: string;
  projectId: string;
  ownerId: string;
  name: string;
  type: 'postgresql' | 'mysql' | 'redis' | 'sqlite';
  status: 'online' | 'offline' | 'creating';
  databaseName: string;
  username: string;
  port: number;
  connectionUri: string;
  sizeMB: number;
  createdAt: string;
}

export interface ApiKey {
  id: string;
  userId: string;
  name: string;
  keyPrefix: string;
  keyHash: string;
  scopes: string[];
  expiresAt?: string;
  lastUsedAt?: string;
  createdAt: string;
}

export interface HostingPlan {
  id: string;
  name: string;
  description: string;
  priceMonthly: number;
  maxProjects: number;
  maxCpuCores: number;
  maxMemoryMB: number;
  maxStorageMB: number;
  maxBandwidthGB: number;
  maxDatabases: number;
  allowCustomDomains: boolean;
  allowGpu: boolean;
  allowGameServers: boolean;
  allowAiWorkloads: boolean;
  maxProcesses: number;
  features: string[];
}

export interface SystemMetricSnapshot {
  timestamp: string;
  cpu: {
    cores: number;
    model: string;
    usagePercent: number;
    loadAverage: number[];
  };
  memory: {
    totalMB: number;
    usedMB: number;
    freeMB: number;
    usagePercent: number;
  };
  disk: {
    totalGB: number;
    usedGB: number;
    freeGB: number;
    usagePercent: number;
  };
  network: {
    bytesIn: number;
    bytesOut: number;
    connectionsCount: number;
  };
  gpu?: {
    available: boolean;
    name?: string;
    driverVersion?: string;
    cudaVersion?: string;
    totalMemoryMB?: number;
    usedMemoryMB?: number;
    utilizationPercent?: number;
    temperatureC?: number;
  };
  runningWorkloads: number;
  totalProjects: number;
  activeProcesses: number;
  uptimeSeconds: number;
}

export interface HostCapabilityReport {
  hasDocker: boolean;
  hasSystemd: boolean;
  hasPersistentProcesses: boolean;
  hasGpu: boolean;
  hasPostgres: boolean;
  hasRedis: boolean;
  hasNginx: boolean;
  hasSslCertbot: boolean;
  availableRuntimes: {
    runtime: RuntimeId;
    available: boolean;
    version?: string;
  }[];
  hostOs: string;
  kernel: string;
  arch: string;
  nodeVersion: string;
}

export interface ProjectFileEntry {
  name: string;
  path: string;
  isDirectory: boolean;
  size: number;
  modifiedAt: string;
  permissions?: string;
}

export interface BackupRecord {
  id: string;
  projectId: string;
  ownerId: string;
  projectName: string;
  name: string;
  sizeMB: number;
  filePath: string;
  backupType: 'full' | 'database_only' | 'files_only';
  status: 'completed' | 'in_progress' | 'failed';
  createdAt: string;
}

export interface AuditLog {
  id: string;
  userId?: string;
  userEmail?: string;
  action: string;
  category: 'auth' | 'project' | 'deployment' | 'security' | 'admin' | 'system' | 'worker';
  details: Record<string, unknown>;
  ipAddress?: string;
  createdAt: string;
}

// -------------------------------------------------------------
// COMPUTEHUB UNIVERSAL WORKER ARCHITECTURE TYPES
// -------------------------------------------------------------
export type WorkerType = 'termux' | 'linux_vps' | 'cloud_vm' | 'dedicated' | 'local_runner';

export type WorkerStatus = 'online' | 'busy' | 'offline' | 'unreachable' | 'maintenance';

export type WorkerConnectionType = 'inbound_http' | 'outbound_polling' | 'websocket_agent';

export interface WorkerBatteryInfo {
  level: number; // 0 to 100
  isCharging: boolean;
  temperatureC?: number;
}

export interface WorkerHardwareTelemetry {
  cpuCores: number;
  cpuModel: string;
  cpuUsagePercent: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  freeMemoryMB: number;
  memoryUsagePercent: number;
  totalStorageGB: number;
  usedStorageGB: number;
  freeStorageGB: number;
  storageUsagePercent: number;
  battery?: WorkerBatteryInfo;
  uptimeSeconds?: number;
  loadAverage?: number[];
}

export interface WorkerRuntimeCapability {
  runtime: RuntimeId;
  available: boolean;
  version?: string;
}

export interface WorkerOSInfo {
  name: string; // e.g. "Android (Termux)", "Ubuntu 24.04 LTS"
  version: string;
  arch: string; // e.g. "aarch64", "x86_64", "armv7l"
  platform: 'android' | 'linux' | 'darwin' | 'win32';
  isTermux: boolean;
  kernel?: string;
  nodeVersion?: string;
}

export interface ComputeWorker {
  id: string;
  name: string;
  type: WorkerType;
  status: WorkerStatus;
  url?: string; // Inbound URL if reachable from controller, or empty for outbound
  connectionType: WorkerConnectionType;
  token: string;
  ipAddress: string;
  os: WorkerOSInfo;
  hardware: WorkerHardwareTelemetry;
  runtimes: WorkerRuntimeCapability[];
  assignedProjectsCount: number;
  maxWorkloads: number;
  lastHeartbeatAt: string;
  pingLatencyMs: number;
  tags: string[];
  createdAt: string;
  notes?: string;
}

export interface WorkerJob {
  id: string;
  workerId: string;
  projectId: string;
  type: 'deploy' | 'start' | 'stop' | 'restart' | 'exec' | 'health_check' | 'cleanup';
  payload: Record<string, unknown>;
  status: 'pending' | 'dispatched' | 'running' | 'completed' | 'failed';
  result?: Record<string, unknown>;
  logs?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface WorkerClusterSummary {
  totalWorkers: number;
  onlineWorkers: number;
  totalCpuCores: number;
  totalMemoryMB: number;
  usedMemoryMB: number;
  avgPingLatencyMs: number;
  termuxCount: number;
  vpsCount: number;
  activeWorkloads: number;
}

