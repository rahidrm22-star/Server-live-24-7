# OmniHost Cloud Compute Server - REST API Reference

All API requests accept and return standard JSON. Authenticated requests require either an `Authorization: Bearer <JWT_TOKEN>` header or an `x-api-key: <API_KEY>` header.

Base URL: `http://<SERVER_HOST>:3000/api`

---

## 1. System & Health

### `GET /health`
Returns high-level system diagnostics and service statuses.

### `GET /system/status`
Returns real-time hardware telemetry:
```json
{
  "success": true,
  "data": {
    "cpu": { "cores": 8, "usagePercent": 14.2, "loadAverage": [0.45, 0.32, 0.28] },
    "memory": { "totalMB": 16384, "usedMB": 4210, "freeMB": 12174, "usagePercent": 25 },
    "disk": { "totalGB": 250, "usedGB": 48.5, "freeGB": 201.5, "usagePercent": 19 },
    "gpu": { "available": true, "name": "NVIDIA RTX 4090", "utilizationPercent": 12 }
  }
}
```

### `GET /system/capabilities`
Returns host OS capabilities, Docker availability, and runtime detection.

---

## 2. Authentication

### `POST /auth/register`
**Body**: `{ "email": "user@example.com", "password": "securePassword", "name": "Dev User" }`

### `POST /auth/login`
**Body**: `{ "email": "user@example.com", "password": "securePassword" }`
**Response**: `{ "success": true, "data": { "user": { ... }, "token": "jwt..." } }`

### `GET /auth/me`
Returns the currently authenticated user session.

---

## 3. Projects & Workloads

### `GET /projects`
List all workloads for user (or all workloads for admin).

### `POST /projects`
Create a new workload:
```json
{
  "name": "FastAPI AI Engine",
  "workloadType": "ai",
  "runtime": "python-ai-pytorch",
  "buildCommand": "pip install -r requirements.txt",
  "startCommand": "uvicorn main:app --port 8000",
  "limits": {
    "cpuCores": 4.0,
    "memoryMB": 8192,
    "storageMB": 51200,
    "gpuEnabled": true
  }
}
```

### `POST /projects/:id/start` | `stop` | `restart`
Control active lifecycle state of a workload.

---

## 4. Deployments

### `POST /deployments/upload-zip`
Multipart form upload with `file` (ZIP archive) and `projectId`.

### `POST /deployments/git`
Deploy from remote Git repo with `projectId`, `gitRepoUrl`, and `gitBranch`.

### `POST /deployments/:id/rollback`
Rollback project to a specified deployment snapshot.

---

## 5. Terminal & File Manager

### `POST /terminal/execute`
Execute command in sandboxed project jail:
```json
{
  "projectId": "proj_123",
  "command": "ls -la",
  "currentDir": "/"
}
```

### `GET /files?projectId=proj_123&path=/`
List files with sizes, permissions, and directories.

### `GET /files/content?projectId=proj_123&filePath=index.js`
Read file content.

### `POST /files/save`
Save file content: `{ "projectId": "proj_123", "filePath": "index.js", "content": "..." }`

---

## 6. AI & Game Server APIs

### `POST /ai/:projectId/generate`
Execute AI model generation on active compute worker:
```json
{
  "prompt": "Summarize deployment logs",
  "max_tokens": 256
}
```

### `POST /gameservers/:projectId/command`
Send RCON/Console command to game server: `{ "command": "list" }`
