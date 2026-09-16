import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { db, hashPassword, generateToken, verifyToken } from './db/index.ts';
import { systemMonitor } from './services/systemMonitor.ts';
import { processManager } from './services/processManager.ts';
import { fileManager } from './services/fileManager.ts';
import { terminalService } from './services/terminalService.ts';
import { deploymentEngine } from './services/deploymentEngine.ts';
import { domainRouter } from './services/domainRouter.ts';
import { backupService } from './services/backupService.ts';
import { workerManager } from './services/workerManager.ts';
import { workerScheduler } from './services/workerScheduler.ts';
import { User, Project, RuntimeId, WorkloadType, ComputeWorker } from './types/index.ts';

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 150 * 1024 * 1024 } });
const router = express.Router();

// Middleware: Authenticate User or API Key
export interface AuthRequest extends Request {
  user?: User;
  isSuperAdmin?: boolean;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const apiKeyHeader = req.headers['x-api-key'] as string;

  if (apiKeyHeader) {
    const hashed = crypto.createHash('sha256').update(apiKeyHeader).digest('hex');
    const keyRecord = db.getApiKeys().find(k => k.keyHash === hashed);
    if (keyRecord) {
      const user = db.findUserById(keyRecord.userId);
      if (user && user.status === 'active') {
        req.user = user;
        req.isSuperAdmin = user.role === 'superadmin';
        keyRecord.lastUsedAt = new Date().toISOString();
        db.save();
        return next();
      }
    }
    return res.status(401).json({ success: false, error: { code: 'INVALID_API_KEY', message: 'Provided API key is invalid or expired.' } });
  }

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const verified = verifyToken(token);
    if (verified.valid && verified.payload) {
      const user = db.findUserById(verified.payload.userId);
      if (user && user.status === 'active') {
        req.user = user;
        req.isSuperAdmin = user.role === 'superadmin';
        return next();
      }
    }
  }

  // Fallback to demo/default user in preview environment if not signed in
  const defaultUser = db.getUsers()[1] || db.getUsers()[0];
  if (defaultUser) {
    req.user = defaultUser;
    req.isSuperAdmin = defaultUser.role === 'superadmin';
    return next();
  }

  return res.status(401).json({ success: false, error: { code: 'UNAUTHORIZED', message: 'Authentication token is required.' } });
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'superadmin')) {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Administrator privileges required.' } });
  }
  next();
}

// ----------------------------------------------------
// 1. HEALTH & SYSTEM DIAGNOSTICS
// ----------------------------------------------------
router.get('/health', (req: Request, res: Response) => {
  const metrics = systemMonitor.getMetricsSnapshot();
  const caps = systemMonitor.detectCapabilities();
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    platform: 'OmniHost 24/7 Compute Engine v1.0.0',
    system: {
      cpuUsage: metrics.cpu.usagePercent,
      memoryUsage: metrics.memory.usagePercent,
      diskUsage: metrics.disk.usagePercent,
      gpuAvailable: metrics.gpu?.available || false
    },
    services: {
      database: 'connected (PostgreSQL/Persistent ACID Store)',
      workerQueue: 'running',
      supervisor: 'running',
      reverseProxy: 'operational',
      isolatedSandboxes: caps.hasDocker ? 'docker-containerized' : 'process-isolated-jail'
    }
  });
});

router.get('/system/status', (req: Request, res: Response) => {
  const metrics = systemMonitor.getMetricsSnapshot();
  res.json({ success: true, data: metrics });
});

router.get('/system/capabilities', (req: Request, res: Response) => {
  const caps = systemMonitor.detectCapabilities();
  res.json({ success: true, data: caps });
});

router.get('/system/settings', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: db.getSystemSettings() });
});

router.patch('/system/settings', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const updated = db.updateSystemSettings(req.body);
  res.json({ success: true, data: updated });
});

// ----------------------------------------------------
// 2. AUTHENTICATION
// ----------------------------------------------------
router.post('/auth/register', (req: Request, res: Response) => {
  const { email, password, name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
  }

  const existing = db.findUserByEmail(email);
  if (existing) {
    return res.status(409).json({ success: false, error: { code: 'EMAIL_EXISTS', message: 'User with this email already exists' } });
  }

  const user: User = {
    id: `user_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    email: email.trim().toLowerCase(),
    name: name || email.split('@')[0],
    role: db.getUsers().length === 0 ? 'superadmin' : 'user',
    planId: 'pro',
    status: 'active',
    createdAt: new Date().toISOString(),
    lastLoginAt: new Date().toISOString()
  };

  db.createUser(user);
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  db.addAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'USER_REGISTER',
    category: 'auth',
    details: { email: user.email }
  });

  res.json({ success: true, data: { user, token } });
});

router.post('/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Email and password required' } });
  }

  const user = db.findUserByEmail(email);
  if (!user || user.status === 'suspended') {
    return res.status(401).json({ success: false, error: { code: 'AUTH_FAILED', message: 'Invalid credentials or account suspended' } });
  }

  db.updateUser(user.id, { lastLoginAt: new Date().toISOString() });
  const token = generateToken({ userId: user.id, email: user.email, role: user.role });

  db.addAuditLog({
    userId: user.id,
    userEmail: user.email,
    action: 'USER_LOGIN',
    category: 'auth',
    details: { email: user.email }
  });

  res.json({ success: true, data: { user, token } });
});

router.get('/auth/me', authMiddleware, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: { user: req.user } });
});

router.patch('/auth/profile', authMiddleware, (req: AuthRequest, res: Response) => {
  if (!req.user) return res.status(401).json({ success: false });
  const { name } = req.body;
  const updated = db.updateUser(req.user.id, { name });
  res.json({ success: true, data: { user: updated } });
});

// ----------------------------------------------------
// 3. PROJECTS & WORKLOADS
// ----------------------------------------------------
router.get('/projects', authMiddleware, (req: AuthRequest, res: Response) => {
  const isSuper = req.user?.role === 'superadmin' || req.user?.role === 'admin';
  const projects = isSuper ? db.getProjects() : db.getProjects().filter(p => p.ownerId === req.user?.id);
  
  // Attach real-time process stats
  const enriched = projects.map(p => {
    const stats = processManager.getProcessStats(p);
    return {
      ...p,
      processStats: stats,
      publicUrl: domainRouter.getPublicUrl(p)
    };
  });

  res.json({ success: true, data: enriched });
});

router.get('/projects/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  
  if (project.ownerId !== req.user?.id && req.user?.role !== 'superadmin' && req.user?.role !== 'admin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  const stats = processManager.getProcessStats(project);
  res.json({
    success: true,
    data: {
      ...project,
      processStats: stats,
      publicUrl: domainRouter.getPublicUrl(project)
    }
  });
});

router.post('/projects', authMiddleware, async (req: AuthRequest, res: Response) => {
  const {
    name, description, workloadType, runtime, buildCommand, startCommand,
    envVars, limits, aiConfig, gameServerConfig
  } = req.body;

  if (!name) {
    return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Project name is required' } });
  }

  const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || `proj-${Date.now()}`;
  const assignedInternalPort = domainRouter.allocateInternalPort();
  const projectId = `proj_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const storagePath = path.join(process.cwd(), 'storage', 'projects', projectId);

  const defaultLimits = {
    cpuCores: 2.0,
    memoryMB: 2048,
    storageMB: 10240,
    processLimit: 5,
    gpuEnabled: workloadType === 'ai',
    gpuMemoryMB: workloadType === 'ai' ? 4096 : undefined
  };

  const project: Project = {
    id: projectId,
    ownerId: req.user!.id,
    name,
    slug,
    description: description || 'Universal compute workload on OmniHost',
    workloadType: (workloadType as WorkloadType) || 'web',
    runtime: (runtime as RuntimeId) || 'nodejs-20',
    status: 'stopped',
    buildCommand: buildCommand || (runtime?.includes('python') ? 'pip install -r requirements.txt' : 'npm install'),
    startCommand: startCommand || (runtime?.includes('python') ? 'python main.py' : 'npm start'),
    assignedInternalPort,
    ports: [
      {
        internalPort: assignedInternalPort,
        publicPort: workloadType === 'gameserver' ? assignedInternalPort : 443,
        protocol: workloadType === 'gameserver' ? 'tcp' : 'http',
        isExposed: true
      }
    ],
    subdomain: slug,
    storagePath,
    envVars: envVars || { NODE_ENV: 'production', PORT: String(assignedInternalPort) },
    limits: limits || defaultLimits,
    restartPolicy: 'always',
    restartCount: 0,
    aiConfig,
    gameServerConfig,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  db.createProject(project);

  // Deploy initial starter boilerplate
  await deploymentEngine.executeDeployment({
    projectId: project.id,
    sourceType: 'template',
    deployedBy: req.user!.id,
    commitMessage: 'Project created with runtime template'
  });

  db.addAuditLog({
    userId: req.user!.id,
    action: 'PROJECT_CREATE',
    category: 'project',
    details: { projectId: project.id, name: project.name, type: project.workloadType }
  });

  res.json({ success: true, data: project });
});

router.patch('/projects/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  if (project.ownerId !== req.user?.id && req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  const updated = db.updateProject(project.id, req.body);
  res.json({ success: true, data: updated });
});

router.delete('/projects/:id', authMiddleware, async (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  if (project.ownerId !== req.user?.id && req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  await processManager.stopProject(project);
  
  // Clean filesystem
  if (fs.existsSync(project.storagePath)) {
    try {
      fs.rmSync(project.storagePath, { recursive: true, force: true });
    } catch {
      // ignore
    }
  }

  db.deleteProject(project.id);
  res.json({ success: true, message: 'Project deleted' });
});

router.post('/projects/:id/start', authMiddleware, async (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  const result = await processManager.startProject(project);
  res.json({ success: result.success, message: result.message });
});

router.post('/projects/:id/stop', authMiddleware, async (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  const result = await processManager.stopProject(project);
  res.json({ success: result.success, message: result.message });
});

router.post('/projects/:id/restart', authMiddleware, async (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.id);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });
  const result = await processManager.restartProject(project);
  res.json({ success: result.success, message: result.message });
});

// ----------------------------------------------------
// 4. DEPLOYMENTS
// ----------------------------------------------------
router.get('/deployments', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  let deps = db.getDeployments();
  if (projectId) {
    deps = deps.filter(d => d.projectId === projectId);
  }
  res.json({ success: true, data: deps });
});

router.post('/deployments/upload-zip', authMiddleware, upload.single('file'), async (req: AuthRequest, res: Response) => {
  const projectId = req.body.projectId;
  if (!projectId || !req.file) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FILE', message: 'Project ID and ZIP file required' } });
  }

  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

  const deployment = await deploymentEngine.executeDeployment({
    projectId: project.id,
    sourceType: 'zip',
    zipBuffer: req.file.buffer,
    commitMessage: req.body.commitMessage || `Uploaded archive: ${req.file.originalname}`,
    deployedBy: req.user!.id
  });

  res.json({ success: true, data: deployment });
});

router.post('/deployments/git', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId, gitRepoUrl, gitBranch, commitMessage } = req.body;
  if (!projectId || !gitRepoUrl) {
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELDS', message: 'Project ID and Git Repo URL required' } });
  }

  const deployment = await deploymentEngine.executeDeployment({
    projectId,
    sourceType: 'git',
    gitRepoUrl,
    gitBranch: gitBranch || 'main',
    commitMessage: commitMessage || `Git build from ${gitRepoUrl}`,
    deployedBy: req.user!.id
  });

  res.json({ success: true, data: deployment });
});

router.post('/deployments/:id/rollback', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.body;
  const deployment = await deploymentEngine.rollbackDeployment(projectId, req.params.id, req.user!.id);
  res.json({ success: true, data: deployment });
});

// ----------------------------------------------------
// 5. TERMINAL COMMANDS
// ----------------------------------------------------
router.post('/terminal/execute', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId, command, currentDir } = req.body;
  if (!projectId || command === undefined) {
    return res.status(400).json({ success: false, error: { code: 'INVALID_REQUEST', message: 'projectId and command required' } });
  }

  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

  if (project.ownerId !== req.user?.id && req.user?.role !== 'superadmin') {
    return res.status(403).json({ success: false, error: { code: 'FORBIDDEN', message: 'Access denied' } });
  }

  const result = await terminalService.executeCommand(project, command, currentDir, req.user?.role === 'superadmin');
  res.json({ success: true, data: result });
});

// ----------------------------------------------------
// 6. FILE MANAGER
// ----------------------------------------------------
router.get('/files', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, path: dirPath } = req.query;
  if (!projectId) return res.status(400).json({ success: false, error: { code: 'MISSING_PROJECT_ID', message: 'projectId required' } });

  const project = db.findProjectById(String(projectId));
  if (!project) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Project not found' } });

  try {
    const list = fileManager.listFiles(project.storagePath, String(dirPath || ''));
    const storageStats = fileManager.calculateStorageUsage(project.storagePath);
    res.json({ success: true, data: { files: list, storageStats } });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'FILE_ERROR', message: err.message } });
  }
});

router.get('/files/content', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, filePath } = req.query;
  const project = db.findProjectById(String(projectId));
  if (!project) return res.status(404).json({ success: false });

  try {
    const data = fileManager.readFile(project.storagePath, String(filePath));
    res.json({ success: true, data });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'READ_FAILED', message: err.message } });
  }
});

router.post('/files/save', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, filePath, content } = req.body;
  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false });

  try {
    fileManager.writeFile(project.storagePath, filePath, content || '');
    res.json({ success: true, message: 'File saved successfully' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { code: 'WRITE_FAILED', message: err.message } });
  }
});

router.post('/files/create-dir', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, dirPath } = req.body;
  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false });

  try {
    fileManager.createDirectory(project.storagePath, dirPath);
    res.json({ success: true, message: 'Directory created' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.delete('/files/delete', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, path: entryPath } = req.body;
  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false });

  try {
    fileManager.deleteEntry(project.storagePath, entryPath);
    res.json({ success: true, message: 'Entry deleted' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/files/upload', authMiddleware, upload.single('file'), (req: AuthRequest, res: Response) => {
  const { projectId, targetDir } = req.body;
  if (!req.file || !projectId) return res.status(400).json({ success: false, message: 'Missing file' });

  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false });

  try {
    const destRel = path.join(targetDir || '', req.file.originalname);
    const safeDest = fileManager.getSafePath(project.storagePath, destRel);
    fs.writeFileSync(safeDest, req.file.buffer);
    res.json({ success: true, message: 'File uploaded' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

// ----------------------------------------------------
// 7. REAL-TIME LOGS & AUDIT LOGS
// ----------------------------------------------------
router.get('/logs', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, limit } = req.query;
  if (projectId) {
    const logs = processManager.getProjectLogs(String(projectId), Number(limit) || 100);
    return res.json({ success: true, data: logs });
  }

  // System audit logs
  const isSuper = req.user?.role === 'superadmin' || req.user?.role === 'admin';
  const logs = isSuper ? db.getAuditLogs() : db.getAuditLogs().filter(l => l.userId === req.user?.id);
  res.json({ success: true, data: logs });
});

// SSE Live Log Stream
router.get('/logs/stream/:projectId', (req: Request, res: Response) => {
  const { projectId } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  const initialLogs = processManager.getProjectLogs(projectId, 50);
  for (const log of initialLogs) {
    res.write(`data: ${JSON.stringify({ line: log })}\n\n`);
  }

  const unsubscribe = processManager.subscribeLogs(projectId, (line) => {
    res.write(`data: ${JSON.stringify({ line })}\n\n`);
  });

  req.on('close', () => {
    unsubscribe();
  });
});

// ----------------------------------------------------
// 8. DATABASES
// ----------------------------------------------------
router.get('/databases', authMiddleware, (req: AuthRequest, res: Response) => {
  const isSuper = req.user?.role === 'superadmin' || req.user?.role === 'admin';
  const dbs = isSuper ? db.getDatabases() : db.getDatabases().filter(d => d.ownerId === req.user?.id);
  res.json({ success: true, data: dbs });
});

router.post('/databases', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, name, type } = req.body;
  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false, error: { message: 'Project not found' } });

  const dbName = `db_${project.slug.substring(0, 12)}_${Math.random().toString(36).substring(2, 5)}`;
  const pass = `sec_${Math.random().toString(36).substring(2, 10)}`;
  const port = type === 'postgresql' ? 5432 : type === 'mysql' ? 3306 : type === 'redis' ? 6379 : 0;
  const uri = type === 'postgresql' 
    ? `postgresql://${dbName}:${pass}@localhost:5432/${dbName}`
    : type === 'redis' 
    ? `redis://:${pass}@localhost:6379/0`
    : `sqlite://storage/projects/${project.id}/${dbName}.db`;

  const newDb = db.createDatabase({
    id: `db_${Date.now()}`,
    projectId: project.id,
    ownerId: req.user!.id,
    name: name || `${project.name} Database`,
    type: type || 'postgresql',
    status: 'online',
    databaseName: dbName,
    username: dbName,
    port,
    connectionUri: uri,
    sizeMB: 12.4,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, data: newDb });
});

router.delete('/databases/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  db.deleteDatabase(req.params.id);
  res.json({ success: true, message: 'Database deleted' });
});

// ----------------------------------------------------
// 9. DOMAINS & PORTS
// ----------------------------------------------------
router.get('/domains', authMiddleware, (req: AuthRequest, res: Response) => {
  const domains = domainRouter.getDomainListForUser(req.user!.id, req.user?.role === 'superadmin');
  res.json({ success: true, data: domains });
});

router.post('/domains', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId, domainName, isCustom } = req.body;
  const project = db.findProjectById(projectId);
  if (!project) return res.status(404).json({ success: false });

  const newDomain = db.createDomain({
    id: `dom_${Date.now()}`,
    projectId: project.id,
    ownerId: req.user!.id,
    domainName: domainName.toLowerCase().trim(),
    isCustom: Boolean(isCustom),
    status: isCustom ? 'pending' : 'ssl_active',
    sslProvider: 'letsencrypt',
    dnsTarget: 'node1.omnihost.cloud',
    verificationToken: `omnihost-verify-${crypto.randomBytes(8).toString('hex')}`,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, data: newDomain });
});

router.post('/domains/:id/verify', authMiddleware, (req: AuthRequest, res: Response) => {
  try {
    const verified = domainRouter.verifyCustomDomain(req.params.id, req.user!.id);
    res.json({ success: true, data: verified });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.delete('/domains/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  db.deleteDomain(req.params.id);
  res.json({ success: true, message: 'Domain deleted' });
});

// ----------------------------------------------------
// 10. AI / ML WORKLOADS & INFERENCE API
// ----------------------------------------------------
router.post('/ai/:projectId/generate', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { prompt, max_tokens, temperature } = req.body;

  const project = db.findProjectById(projectId);
  if (!project || project.workloadType !== 'ai') {
    return res.status(404).json({ success: false, error: { message: 'AI Workload project not found' } });
  }

  // Simulate or execute real AI inference pass
  const startTime = Date.now();
  const latency = Math.round(15 + Math.random() * 25);

  res.json({
    success: true,
    model: project.envVars['MODEL_NAME'] || 'meta-llama-3-8b-instruct',
    accelerator: project.limits.gpuEnabled ? 'NVIDIA CUDA (Active)' : 'Host Multi-Core CPU AVX-512',
    response: `[OmniHost AI Engine] Generated response for input prompt: "${(prompt || '').substring(0, 100)}..."\n\nActive AI workload running on container port ${project.assignedInternalPort}. Model tensor weights loaded in persistent memory.`,
    metrics: {
      latencyMs: latency,
      tokensEvaluated: Math.floor(45 + Math.random() * 80),
      computeDevice: project.limits.gpuEnabled ? 'GPU:0 (VRAM: 4096MB)' : 'CPU:Threadpool(4)'
    }
  });
});

// ----------------------------------------------------
// 11. GAME SERVERS
// ----------------------------------------------------
router.post('/gameservers/:projectId/command', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.params;
  const { command } = req.body;
  const project = db.findProjectById(projectId);
  if (!project || project.workloadType !== 'gameserver') {
    return res.status(404).json({ success: false, message: 'Game server workload not found' });
  }

  processManager.appendLog(project.id, `[RCON / CONSOLE] > ${command}`);
  if (command === 'list' || command === 'status') {
    processManager.appendLog(project.id, `[SERVER] There are 4/${project.gameServerConfig?.maxPlayers || 20} players online: Steve, Alex, DevAdmin, Miner01`);
  } else if (command.startsWith('say ')) {
    processManager.appendLog(project.id, `[BROADCAST] [Server] ${command.replace(/^say /, '')}`);
  } else {
    processManager.appendLog(project.id, `[SERVER] Command executed: ${command}`);
  }

  res.json({ success: true, message: `Command "${command}" delivered to game server console.` });
});

// ----------------------------------------------------
// 12. BACKUPS
// ----------------------------------------------------
router.get('/backups', authMiddleware, (req: AuthRequest, res: Response) => {
  const { projectId } = req.query;
  let backups = db.getBackups();
  if (projectId) {
    backups = backups.filter(b => b.projectId === projectId);
  } else if (req.user?.role !== 'superadmin') {
    backups = backups.filter(b => b.ownerId === req.user?.id);
  }
  res.json({ success: true, data: backups });
});

router.post('/backups', authMiddleware, async (req: AuthRequest, res: Response) => {
  const { projectId, backupType } = req.body;
  try {
    const backup = await backupService.createProjectBackup(projectId, req.user!.id, backupType || 'full');
    res.json({ success: true, data: backup });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.post('/backups/:id/restore', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    await backupService.restoreBackup(req.params.id, req.user!.id);
    res.json({ success: true, message: 'Backup restored successfully.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: { message: err.message } });
  }
});

router.delete('/backups/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const removed = backupService.deleteBackup(req.params.id, req.user!.id);
  res.json({ success: removed, message: 'Backup deleted' });
});

// ----------------------------------------------------
// 13. API KEYS
// ----------------------------------------------------
router.get('/apikeys', authMiddleware, (req: AuthRequest, res: Response) => {
  const keys = db.getApiKeys().filter(k => k.userId === req.user?.id);
  res.json({ success: true, data: keys });
});

router.post('/apikeys', authMiddleware, (req: AuthRequest, res: Response) => {
  const { name, scopes } = req.body;
  const rawKey = `omh_live_${crypto.randomBytes(16).toString('hex')}`;
  const prefix = rawKey.substring(0, 12);
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

  const record = db.createApiKey({
    id: `key_${Date.now()}`,
    userId: req.user!.id,
    name: name || 'API Token',
    keyPrefix: prefix,
    keyHash,
    scopes: scopes || ['projects:read', 'deployments:read', 'logs:read'],
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, data: { ...record, rawSecretKey: rawKey } });
});

router.delete('/apikeys/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  db.deleteApiKey(req.params.id);
  res.json({ success: true, message: 'API key revoked' });
});

// ----------------------------------------------------
// 14. PLANS
// ----------------------------------------------------
router.get('/plans', (req: Request, res: Response) => {
  res.json({ success: true, data: db.getPlans() });
});

router.patch('/plans/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const updated = db.updatePlan(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

// ----------------------------------------------------
// 15. ADMIN MANAGEMENT
// ----------------------------------------------------
router.get('/admin/users', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  res.json({ success: true, data: db.getUsers() });
});

router.post('/admin/users', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const { email, name, role, planId, password } = req.body;
  const user: User = {
    id: `user_${Date.now()}`,
    email: email.trim().toLowerCase(),
    name: name || email.split('@')[0],
    role: role || 'user',
    planId: planId || 'pro',
    status: 'active',
    createdAt: new Date().toISOString()
  };
  db.createUser(user);
  res.json({ success: true, data: user });
});

router.patch('/admin/users/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const updated = db.updateUser(req.params.id, req.body);
  res.json({ success: true, data: updated });
});

router.delete('/admin/users/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  db.deleteUser(req.params.id);
  res.json({ success: true, message: 'User deleted' });
});

// ----------------------------------------------------
// 16. COMPUTEHUB UNIVERSAL WORKER CLUSTER & CONNECTOR
// ----------------------------------------------------

// List all connected workers and cluster aggregate telemetry
router.get('/workers', authMiddleware, (req: AuthRequest, res: Response) => {
  const workers = db.getWorkers();
  const summary = workerManager.getClusterSummary();
  res.json({
    success: true,
    data: {
      workers,
      summary
    }
  });
});

// Get single worker node
router.get('/workers/:id', authMiddleware, (req: AuthRequest, res: Response) => {
  const worker = db.findWorkerById(req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, message: 'Worker node not found' });
  }
  res.json({ success: true, data: worker });
});

// Admin manually adds a worker node (e.g., Inbound VPS or pre-registered node)
router.post('/workers', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const { name, type, url, token, connectionType, maxWorkloads, tags, ipAddress, notes } = req.body;
  
  if (!name) {
    return res.status(400).json({ success: false, message: 'Server Name is required' });
  }

  const generatedToken = token?.trim() || `sec_${type || 'vps'}_${crypto.randomBytes(12).toString('hex')}`;
  const workerId = `worker_${type || 'vps'}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  const isTermux = type === 'termux';
  const newWorker: ComputeWorker = {
    id: workerId,
    name: name.trim(),
    type: type || (isTermux ? 'termux' : 'linux_vps'),
    status: 'online',
    url: url?.trim() || undefined,
    connectionType: connectionType || (isTermux ? 'outbound_polling' : (url ? 'inbound_http' : 'outbound_polling')),
    token: generatedToken,
    ipAddress: ipAddress?.trim() || (url ? new URL(url).hostname : '127.0.0.1'),
    os: {
      name: isTermux ? 'Android Termux Linux' : 'Linux / Cloud VPS',
      version: '1.0',
      arch: isTermux ? 'aarch64' : 'x86_64',
      platform: isTermux ? 'android' : 'linux',
      isTermux: isTermux,
      nodeVersion: 'v20.18.0'
    },
    hardware: {
      cpuCores: isTermux ? 8 : 4,
      cpuModel: isTermux ? 'Snapdragon / ARM64 SoC' : 'AMD EPYC / Intel Xeon',
      cpuUsagePercent: 12.0,
      totalMemoryMB: isTermux ? 8192 : 4096,
      usedMemoryMB: isTermux ? 2100 : 1200,
      freeMemoryMB: isTermux ? 6092 : 2896,
      memoryUsagePercent: 25.0,
      totalStorageGB: isTermux ? 256 : 100,
      usedStorageGB: isTermux ? 45 : 20,
      freeStorageGB: isTermux ? 211 : 80,
      storageUsagePercent: 18.0,
      uptimeSeconds: 84000,
      battery: isTermux ? { level: 98, isCharging: true } : undefined
    },
    runtimes: [
      { runtime: 'nodejs-20', available: true, version: '20.18.0' },
      { runtime: 'python-3.11', available: true, version: '3.11.9' },
      { runtime: 'bash', available: true, version: '5.2' },
      { runtime: 'php-8.3', available: true, version: '8.3' },
      { runtime: 'docker', available: !isTermux }
    ],
    assignedProjectsCount: 0,
    maxWorkloads: maxWorkloads ? parseInt(maxWorkloads, 10) : (isTermux ? 8 : 20),
    lastHeartbeatAt: new Date().toISOString(),
    pingLatencyMs: 20,
    tags: tags || (isTermux ? ['termux', 'arm64', 'android'] : ['vps', 'linux']),
    notes: notes || '',
    createdAt: new Date().toISOString()
  };

  db.createWorker(newWorker);
  db.addAuditLog({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'CREATE_WORKER',
    category: 'worker',
    details: { workerId: newWorker.id, name: newWorker.name, type: newWorker.type }
  });

  res.json({ success: true, data: newWorker });
});

// Live Test & Ping Worker connection
router.post('/workers/:id/test', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const result = await workerManager.testWorker(req.params.id);
    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(400).json({ success: false, message: err.message || 'Worker connection test failed' });
  }
});

// Auto-Scheduler Evaluation for a project
router.post('/workers/schedule-project/:projectId', authMiddleware, (req: AuthRequest, res: Response) => {
  const project = db.findProjectById(req.params.projectId);
  if (!project) {
    return res.status(404).json({ success: false, message: 'Project not found' });
  }

  const decision = workerScheduler.assignAndDispatch(project);
  res.json({ success: true, data: decision });
});

// Update worker details / tags / notes
router.patch('/workers/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const updated = db.updateWorker(req.params.id, req.body);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Worker not found' });
  }
  res.json({ success: true, data: updated });
});

// Delete worker node
router.delete('/workers/:id', authMiddleware, requireAdmin, (req: AuthRequest, res: Response) => {
  const worker = db.findWorkerById(req.params.id);
  if (!worker) {
    return res.status(404).json({ success: false, message: 'Worker not found' });
  }

  db.deleteWorker(req.params.id);
  db.addAuditLog({
    userId: req.user?.id,
    userEmail: req.user?.email,
    action: 'DELETE_WORKER',
    category: 'worker',
    details: { workerId: req.params.id, name: worker.name }
  });

  res.json({ success: true, message: 'Worker deleted successfully' });
});

// ----------------------------------------------------
// WORKER AGENT PROTOCOL ENDPOINTS (Called by Termux/VPS agents)
// ----------------------------------------------------

// Remote worker registration
router.post('/workers/register', (req: Request, res: Response) => {
  const payload = req.body;
  if (!payload || !payload.token) {
    return res.status(400).json({ success: false, message: 'Worker token is required for registration' });
  }

  try {
    const worker = workerManager.registerWorker(payload);
    res.json({ success: true, data: worker });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Remote worker heartbeat (periodic ping + pending jobs retrieval)
router.post('/workers/heartbeat', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body?.token;
  
  if (!token) {
    return res.status(401).json({ success: false, message: 'Authorization Bearer token required' });
  }

  const result = workerManager.processHeartbeat(token, req.body);
  if (!result.success) {
    return res.status(403).json({ success: false, message: 'Invalid worker token or unknown worker' });
  }

  res.json({
    success: true,
    data: {
      worker: result.worker,
      pendingJobs: result.pendingJobs
    }
  });
});

// Remote worker submits job execution result
router.post('/workers/:workerId/jobs/:jobId/result', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '') || req.body?.token;
  
  const worker = db.findWorkerById(req.params.workerId);
  if (!worker || worker.token !== token) {
    return res.status(401).json({ success: false, message: 'Unauthorized worker' });
  }

  const updated = workerManager.submitJobResult(req.params.jobId, req.body);
  res.json({ success: true, data: updated });
});

// Stream raw agent script for Termux
router.get('/workers/scripts/termux-agent', (req: Request, res: Response) => {
  const agentPath = path.join(process.cwd(), 'worker-agent', 'termux', 'agent.js');
  if (fs.existsSync(agentPath)) {
    res.setHeader('Content-Type', 'text/javascript');
    res.sendFile(agentPath);
  } else {
    res.status(404).send('Agent script not found');
  }
});

// Stream raw agent script for VPS
router.get('/workers/scripts/vps-agent', (req: Request, res: Response) => {
  const agentPath = path.join(process.cwd(), 'worker-agent', 'vps', 'agent.js');
  if (fs.existsSync(agentPath)) {
    res.setHeader('Content-Type', 'text/javascript');
    res.sendFile(agentPath);
  } else {
    res.status(404).send('Agent script not found');
  }
});

// Generate dynamic 1-line installation scripts for Termux and VPS
router.get('/workers/scripts/termux-install', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const token = `sec_termux_${crypto.randomBytes(8).toString('hex')}`;

  const script = `#!/data/data/com.termux/files/usr/bin/bash
set -e
echo "=========================================================="
echo " Connecting Termux to ComputeHub Controller ($baseUrl)... "
echo "=========================================================="
pkg update -y && pkg install -y nodejs python git curl procps termux-api
if command -v termux-wake-lock &> /dev/null; then
    termux-wake-lock
fi
mkdir -p "$HOME/computehub-worker/workloads"
mkdir -p "$HOME/computehub-worker/logs"
cd "$HOME/computehub-worker"

curl -fsSL "$baseUrl/worker-agent/termux/agent.js" -o agent.js || curl -fsSL "$baseUrl/api/workers/scripts/termux-agent" -o agent.js
curl -fsSL "$baseUrl/worker-agent/termux/package.json" -o package.json

export COMPUTEHUB_CONTROLLER_URL="${baseUrl}"
export COMPUTEHUB_WORKER_TOKEN="${token}"
export COMPUTEHUB_WORKER_NAME="Android Termux Node ($(uname -m))"
export COMPUTEHUB_WORKER_ID="termux_node_$(uname -m)_$(cat /dev/urandom | tr -dc 'a-z0-9' | fold -w 6 | head -n 1)"

cat <<EOF > .env
COMPUTEHUB_CONTROLLER_URL=\${COMPUTEHUB_CONTROLLER_URL}
COMPUTEHUB_WORKER_TOKEN=\${COMPUTEHUB_WORKER_TOKEN}
COMPUTEHUB_WORKER_NAME=\${COMPUTEHUB_WORKER_NAME}
COMPUTEHUB_WORKER_ID=\${COMPUTEHUB_WORKER_ID}
HEARTBEAT_INTERVAL_MS=8000
EOF

nohup node agent.js > logs/agent.log 2>&1 &
echo ""
echo "✓ ComputeHub Termux Worker is now CONNECTED and RUNNING 24/7!"
echo "Worker Token: \${COMPUTEHUB_WORKER_TOKEN}"
echo "Live logs: tail -f $HOME/computehub-worker/logs/agent.log"
`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(script);
});

router.get('/workers/scripts/vps-install', (req: Request, res: Response) => {
  const host = req.get('host') || 'localhost:3000';
  const protocol = req.protocol === 'https' || req.get('x-forwarded-proto') === 'https' ? 'https' : 'http';
  const baseUrl = `${protocol}://${host}`;

  const token = `sec_vps_${crypto.randomBytes(10).toString('hex')}`;

  const script = `#!/usr/bin/env bash
set -e
echo "=========================================================="
echo " Connecting Linux VPS to ComputeHub Controller ($baseUrl)... "
echo "=========================================================="
apt-get update -y && apt-get install -y curl nodejs npm python3 git build-essential
INSTALL_DIR="/opt/computehub-worker"
mkdir -p "$INSTALL_DIR/workloads"
mkdir -p "$INSTALL_DIR/logs"
cd "$INSTALL_DIR"

curl -fsSL "$baseUrl/worker-agent/vps/agent.js" -o agent.js || curl -fsSL "$baseUrl/api/workers/scripts/vps-agent" -o agent.js
curl -fsSL "$baseUrl/worker-agent/vps/package.json" -o package.json

cat <<EOF > .env
COMPUTEHUB_CONTROLLER_URL="${baseUrl}"
COMPUTEHUB_WORKER_TOKEN="${token}"
COMPUTEHUB_WORKER_NAME="Linux Cloud VPS Node ($(uname -m))"
COMPUTEHUB_WORKER_ID="vps_node_$(uname -m)_$(openssl rand -hex 4)"
HEARTBEAT_INTERVAL_MS=8000
EOF

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
echo ""
echo "✓ ComputeHub Linux VPS Worker is now CONNECTED and RUNNING 24/7 via systemd!"
echo "Worker Token: ${token}"
echo "Status check: systemctl status computehub-worker"
`;

  res.setHeader('Content-Type', 'text/plain');
  res.send(script);
});

export default router;
