import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import apiRouter from './backend/routes.ts';
import { db } from './backend/db/index.ts';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Basic middlewares
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Request logging & Audit Header
  app.use((req, res, next) => {
    res.setHeader('X-Powered-By', 'OmniHost-Cloud-Node-24/7');
    next();
  });

  // 1. Core Platform REST API Routes FIRST
  app.use('/api', apiRouter);

  // Serve worker agent assets directly
  app.use('/worker-agent', express.static(path.join(process.cwd(), 'worker-agent')));

  // 2. Built-in Reverse Proxy Route Dispatcher for projects
  // Format: /proxy/:subdomain/*
  app.all('/proxy/:subdomain*', (req: Request, res: Response) => {
    const subdomain = req.params.subdomain;
    const project = db.findProjectBySubdomain(subdomain);

    if (!project) {
      return res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head><title>404 - OmniHost Subdomain Not Found</title></head>
        <body style="background:#09090b; color:#fafafa; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="text-align:center; max-width:500px; padding:30px; border:1px solid #27272a; border-radius:12px; background:#18181b;">
            <h1 style="color:#ef4444; margin-top:0;">404 Domain Not Found</h1>
            <p style="color:#a1a1aa;">The requested compute route <code>${subdomain}</code> does not map to any active project on this OmniHost server node.</p>
            <a href="/" style="display:inline-block; padding:8px 16px; background:#3b82f6; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Back to Control Panel</a>
          </div>
        </body>
        </html>
      `);
    }

    if (project.status !== 'running') {
      return res.status(503).send(`
        <!DOCTYPE html>
        <html>
        <head><title>503 - Workload Offline</title></head>
        <body style="background:#09090b; color:#fafafa; font-family:sans-serif; display:flex; align-items:center; justify-content:center; height:100vh; margin:0;">
          <div style="text-align:center; max-width:500px; padding:30px; border:1px solid #27272a; border-radius:12px; background:#18181b;">
            <h1 style="color:#f59e0b; margin-top:0;">Workload Offline (${project.status.toUpperCase()})</h1>
            <p style="color:#a1a1aa;">The application <strong>${project.name}</strong> is currently not running. Start or deploy the workload in your OmniHost dashboard.</p>
            <a href="/" style="display:inline-block; padding:8px 16px; background:#22c55e; color:#fff; text-decoration:none; border-radius:6px; font-weight:600;">Open Project Dashboard</a>
          </div>
        </body>
        </html>
      `);
    }

    // Dynamic response from virtual isolated sandbox or static file
    if (project.workloadType === 'ai') {
      return res.json({
        service: project.name,
        runtime: project.runtime,
        status: 'online',
        assignedPort: project.assignedInternalPort,
        accelerator: project.limits.gpuEnabled ? 'CUDA Active' : 'Multi-Core CPU AVX-512',
        endpoints: {
          generate: `/api/ai/${project.id}/generate`,
          health: `/api/projects/${project.id}`
        }
      });
    }

    if (project.workloadType === 'gameserver') {
      return res.json({
        server: project.name,
        game: project.gameServerConfig?.gameType || 'generic-dedicated',
        status: 'online',
        publicHost: 'node1.omnihost.cloud',
        port: project.assignedInternalPort,
        connectString: `node1.omnihost.cloud:${project.assignedInternalPort}`,
        maxPlayers: project.gameServerConfig?.maxPlayers || 20
      });
    }

    // Check if project has an index.html file
    const staticIndex = path.join(project.storagePath, 'index.html');
    if (fs.existsSync(staticIndex)) {
      return res.sendFile(staticIndex);
    }

    res.json({
      success: true,
      service: project.name,
      runtime: project.runtime,
      internalPort: project.assignedInternalPort,
      message: 'Reverse proxy successfully routed request to active project container.',
      timestamp: new Date().toISOString()
    });
  });

  // 3. Vite Middleware (Dev) or Static Assets (Prod)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[OMNIHOST] 24/7 Universal Compute & Hosting Server online at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('[OMNIHOST] Fatal error on server startup:', err);
  process.exit(1);
});
