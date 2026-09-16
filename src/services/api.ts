import {
  User, Project, Deployment, ManagedDomain, ManagedDatabase,
  ApiKey, HostingPlan, SystemMetricSnapshot, HostCapabilityReport,
  ProjectFileEntry, BackupRecord, AuditLog, ComputeWorker, WorkerClusterSummary
} from '../types';

const API_BASE = '/api';

class ApiService {
  private token: string | null = null;

  constructor() {
    this.token = localStorage.getItem('omnihost_token');
  }

  public setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('omnihost_token', token);
    } else {
      localStorage.removeItem('omnihost_token');
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      ...(options.headers as Record<string, string> || {})
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const res = await fetch(`${API_BASE}${endpoint}`, {
      ...options,
      headers
    });

    const data = await res.json();
    if (!res.ok || data.success === false) {
      const errMsg = data.error?.message || data.message || `API Error: ${res.statusText}`;
      throw new Error(errMsg);
    }

    return data.data !== undefined ? data.data : data;
  }

  // System & Health
  public getHealth(): Promise<any> {
    return this.request<any>('/health');
  }

  public getSystemStatus(): Promise<SystemMetricSnapshot> {
    return this.request<SystemMetricSnapshot>('/system/status');
  }

  public getSystemCapabilities(): Promise<HostCapabilityReport> {
    return this.request<HostCapabilityReport>('/system/capabilities');
  }

  public getSystemSettings(): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/system/settings');
  }

  public updateSystemSettings(settings: Record<string, unknown>): Promise<Record<string, unknown>> {
    return this.request<Record<string, unknown>>('/system/settings', {
      method: 'PATCH',
      body: JSON.stringify(settings)
    });
  }

  // Auth
  public login(credentials: { email: string; password: string }): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials)
    });
  }

  public register(payload: { email: string; password: string; name?: string }): Promise<{ user: User; token: string }> {
    return this.request<{ user: User; token: string }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public getMe(): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/me');
  }

  public updateProfile(data: { name: string }): Promise<{ user: User }> {
    return this.request<{ user: User }>('/auth/profile', {
      method: 'PATCH',
      body: JSON.stringify(data)
    });
  }

  // Projects & Workloads
  public getProjects(): Promise<Project[]> {
    return this.request<Project[]>('/projects');
  }

  public getProject(id: string): Promise<Project> {
    return this.request<Project>(`/projects/${id}`);
  }

  public createProject(payload: Partial<Project>): Promise<Project> {
    return this.request<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public updateProject(id: string, updates: Partial<Project>): Promise<Project> {
    return this.request<Project>(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  public deleteProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${id}`, {
      method: 'DELETE'
    });
  }

  public startProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${id}/start`, { method: 'POST' });
  }

  public stopProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${id}/stop`, { method: 'POST' });
  }

  public restartProject(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/projects/${id}/restart`, { method: 'POST' });
  }

  // Deployments
  public getDeployments(projectId?: string): Promise<Deployment[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.request<Deployment[]>(`/deployments${query}`);
  }

  public deployZip(projectId: string, file: File, commitMessage?: string): Promise<Deployment> {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('file', file);
    if (commitMessage) formData.append('commitMessage', commitMessage);

    return this.request<Deployment>('/deployments/upload-zip', {
      method: 'POST',
      body: formData
    });
  }

  public deployGit(payload: { projectId: string; gitRepoUrl: string; gitBranch?: string; commitMessage?: string }): Promise<Deployment> {
    return this.request<Deployment>('/deployments/git', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public rollbackDeployment(deploymentId: string, projectId: string): Promise<Deployment> {
    return this.request<Deployment>(`/deployments/${deploymentId}/rollback`, {
      method: 'POST',
      body: JSON.stringify({ projectId })
    });
  }

  // Terminal
  public executeTerminalCommand(payload: { projectId: string; command: string; currentDir?: string }): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    durationMs: number;
    currentDir: string;
  }> {
    return this.request<any>('/terminal/execute', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  // Files
  public getFiles(projectId: string, dirPath?: string): Promise<{ files: ProjectFileEntry[]; storageStats: { totalBytes: number; totalMB: number; fileCount: number } }> {
    const query = dirPath ? `?projectId=${projectId}&path=${encodeURIComponent(dirPath)}` : `?projectId=${projectId}`;
    return this.request<any>(`/files${query}`);
  }

  public getFileContent(projectId: string, filePath: string): Promise<{ content: string; size: number }> {
    return this.request<{ content: string; size: number }>(`/files/content?projectId=${projectId}&filePath=${encodeURIComponent(filePath)}`);
  }

  public saveFileContent(projectId: string, filePath: string, content: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/files/save', {
      method: 'POST',
      body: JSON.stringify({ projectId, filePath, content })
    });
  }

  public createDirectory(projectId: string, dirPath: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/files/create-dir', {
      method: 'POST',
      body: JSON.stringify({ projectId, dirPath })
    });
  }

  public deleteFileEntry(projectId: string, entryPath: string): Promise<{ message: string }> {
    return this.request<{ message: string }>('/files/delete', {
      method: 'DELETE',
      body: JSON.stringify({ projectId, path: entryPath })
    });
  }

  public uploadFile(projectId: string, file: File, targetDir: string = ''): Promise<{ message: string }> {
    const formData = new FormData();
    formData.append('projectId', projectId);
    formData.append('targetDir', targetDir);
    formData.append('file', file);
    return this.request<{ message: string }>('/files/upload', {
      method: 'POST',
      body: formData
    });
  }

  // Logs
  public getLogs(projectId?: string, limit: number = 100): Promise<string[] | AuditLog[]> {
    const query = projectId ? `?projectId=${projectId}&limit=${limit}` : `?limit=${limit}`;
    return this.request<any>(`/logs${query}`);
  }

  // AI & Game Servers
  public generateAiResponse(projectId: string, payload: { prompt: string; max_tokens?: number }): Promise<any> {
    return this.request<any>(`/ai/${projectId}/generate`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public sendGameServerCommand(projectId: string, command: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/gameservers/${projectId}/command`, {
      method: 'POST',
      body: JSON.stringify({ command })
    });
  }

  // Databases
  public getDatabases(): Promise<ManagedDatabase[]> {
    return this.request<ManagedDatabase[]>('/databases');
  }

  public createDatabase(payload: { projectId: string; name: string; type: string }): Promise<ManagedDatabase> {
    return this.request<ManagedDatabase>('/databases', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public deleteDatabase(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/databases/${id}`, { method: 'DELETE' });
  }

  // Domains
  public getDomains(): Promise<ManagedDomain[]> {
    return this.request<ManagedDomain[]>('/domains');
  }

  public createDomain(payload: { projectId: string; domainName: string; isCustom: boolean }): Promise<ManagedDomain> {
    return this.request<ManagedDomain>('/domains', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public verifyDomain(domainId: string): Promise<ManagedDomain> {
    return this.request<ManagedDomain>(`/domains/${domainId}/verify`, { method: 'POST' });
  }

  public deleteDomain(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/domains/${id}`, { method: 'DELETE' });
  }

  // Backups
  public getBackups(projectId?: string): Promise<BackupRecord[]> {
    const query = projectId ? `?projectId=${projectId}` : '';
    return this.request<BackupRecord[]>(`/backups${query}`);
  }

  public createBackup(projectId: string, backupType: string = 'full'): Promise<BackupRecord> {
    return this.request<BackupRecord>('/backups', {
      method: 'POST',
      body: JSON.stringify({ projectId, backupType })
    });
  }

  public restoreBackup(backupId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/backups/${backupId}/restore`, { method: 'POST' });
  }

  public deleteBackup(backupId: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/backups/${backupId}`, { method: 'DELETE' });
  }

  // API Keys
  public getApiKeys(): Promise<ApiKey[]> {
    return this.request<ApiKey[]>('/apikeys');
  }

  public createApiKey(payload: { name: string; scopes?: string[] }): Promise<ApiKey> {
    return this.request<ApiKey>('/apikeys', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public revokeApiKey(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/apikeys/${id}`, { method: 'DELETE' });
  }

  // Plans
  public getPlans(): Promise<HostingPlan[]> {
    return this.request<HostingPlan[]>('/plans');
  }

  public updatePlan(id: string, updates: Partial<HostingPlan>): Promise<HostingPlan> {
    return this.request<HostingPlan>(`/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  // Admin
  public getAdminUsers(): Promise<User[]> {
    return this.request<User[]>('/admin/users');
  }

  public createAdminUser(payload: Partial<User>): Promise<User> {
    return this.request<User>('/admin/users', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public updateAdminUser(id: string, updates: Partial<User>): Promise<User> {
    return this.request<User>(`/admin/users/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  public deleteAdminUser(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/admin/users/${id}`, { method: 'DELETE' });
  }

  // Workers & Distributed Compute Hub
  public getWorkers(): Promise<{ workers: ComputeWorker[]; summary: WorkerClusterSummary }> {
    return this.request<{ workers: ComputeWorker[]; summary: WorkerClusterSummary }>('/workers');
  }

  public getWorker(id: string): Promise<ComputeWorker> {
    return this.request<ComputeWorker>(`/workers/${id}`);
  }

  public createWorker(payload: Partial<ComputeWorker>): Promise<ComputeWorker> {
    return this.request<ComputeWorker>('/workers', {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  }

  public testWorkerConnection(id: string): Promise<{
    success: boolean;
    latencyMs: number;
    worker: ComputeWorker;
    message: string;
    diagnostics: {
      reachability: string;
      os: string;
      cores: number;
      ramMB: number;
      runtimesCount: number;
      batteryLevel?: number;
      lastHeartbeat: string;
    };
  }> {
    return this.request<any>(`/workers/${id}/test`, {
      method: 'POST'
    });
  }

  public updateWorker(id: string, updates: Partial<ComputeWorker>): Promise<ComputeWorker> {
    return this.request<ComputeWorker>(`/workers/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(updates)
    });
  }

  public deleteWorker(id: string): Promise<{ message: string }> {
    return this.request<{ message: string }>(`/workers/${id}`, {
      method: 'DELETE'
    });
  }

  public scheduleProject(projectId: string): Promise<any> {
    return this.request<any>(`/workers/schedule-project/${projectId}`, {
      method: 'POST'
    });
  }
}

export const api = new ApiService();
