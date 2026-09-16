import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { AuthModal } from './components/AuthModal';
import { DashboardView } from './components/views/DashboardView';
import { ServersView } from './components/views/ServersView';
import { ProjectsView } from './components/views/ProjectsView';
import { AiComputeView } from './components/views/AiComputeView';
import { GameServersView } from './components/views/GameServersView';
import { DeploymentsView } from './components/views/DeploymentsView';
import { TerminalView } from './components/views/TerminalView';
import { FileManagerView } from './components/views/FileManagerView';
import { DatabasesView } from './components/views/DatabasesView';
import { DomainsView } from './components/views/DomainsView';
import { PortsView } from './components/views/PortsView';
import { LogsView } from './components/views/LogsView';
import { BackupsView } from './components/views/BackupsView';
import { ApiKeysView } from './components/views/ApiKeysView';
import { PlansView } from './components/views/PlansView';
import { AdminView } from './components/views/AdminView';
import { DiagnosticsView } from './components/views/DiagnosticsView';

import { api } from './services/api';
import {
  User, Project, Deployment, ManagedDomain, ManagedDatabase,
  ApiKey, HostingPlan, SystemMetricSnapshot, HostCapabilityReport,
  BackupRecord
} from './types';

export function App() {
  const [user, setUser] = useState<User | null>(null);
  const [currentView, setCurrentView] = useState<string>('dashboard');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false);

  // Core Data Collections
  const [metrics, setMetrics] = useState<SystemMetricSnapshot | null>(null);
  const [capabilities, setCapabilities] = useState<HostCapabilityReport | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [deployments, setDeployments] = useState<Deployment[]>([]);
  const [databases, setDatabases] = useState<ManagedDatabase[]>([]);
  const [domains, setDomains] = useState<ManagedDomain[]>([]);
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([]);
  const [plans, setPlans] = useState<HostingPlan[]>([]);

  // Selected project context
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // 1. Initial Session Load
  useEffect(() => {
    const initSession = async () => {
      try {
        const token = api.getToken();
        if (token) {
          const res = await api.getMe();
          setUser(res.user);
        } else {
          // Auto-authenticate as default Super Admin for instant experience
          try {
            const res = await api.login({ email: 'admin@omnihost.cloud', password: 'admin123456' });
            api.setToken(res.token);
            setUser(res.user);
          } catch {
            // Ignore if custom token needed
          }
        }
      } catch (err) {
        console.error('Session check failed:', err);
      }
    };
    initSession();
  }, []);

  // 2. Fetch System Metrics & Telemetry (Periodic Polling)
  const refreshMetrics = useCallback(async () => {
    try {
      const snap = await api.getSystemStatus();
      setMetrics(snap);
    } catch (err) {
      console.error('Failed to poll system metrics:', err);
    }
  }, []);

  const refreshCapabilities = useCallback(async () => {
    try {
      const caps = await api.getSystemCapabilities();
      setCapabilities(caps);
    } catch (err) {
      console.error('Failed to poll capabilities:', err);
    }
  }, []);

  const refreshProjects = useCallback(async () => {
    try {
      const projs = await api.getProjects();
      setProjects(projs || []);
      if (!activeProject && projs && projs.length > 0) {
        setActiveProject(projs[0]);
      }
    } catch (err) {
      console.error('Failed to load projects:', err);
    }
  }, [activeProject]);

  const refreshDeployments = useCallback(async () => {
    try {
      const deps = await api.getDeployments();
      setDeployments(deps || []);
    } catch (err) {
      console.error('Failed to load deployments:', err);
    }
  }, []);

  const refreshDatabases = useCallback(async () => {
    try {
      const dbs = await api.getDatabases();
      setDatabases(dbs || []);
    } catch (err) {
      console.error('Failed to load databases:', err);
    }
  }, []);

  const refreshDomains = useCallback(async () => {
    try {
      const doms = await api.getDomains();
      setDomains(doms || []);
    } catch (err) {
      console.error('Failed to load domains:', err);
    }
  }, []);

  const refreshBackups = useCallback(async () => {
    try {
      const bks = await api.getBackups();
      setBackups(bks || []);
    } catch (err) {
      console.error('Failed to load backups:', err);
    }
  }, []);

  const refreshApiKeys = useCallback(async () => {
    try {
      const keys = await api.getApiKeys();
      setApiKeys(keys || []);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    }
  }, []);

  const refreshPlans = useCallback(async () => {
    try {
      const pl = await api.getPlans();
      setPlans(pl || []);
    } catch (err) {
      console.error('Failed to load plans:', err);
    }
  }, []);

  const refreshAllData = useCallback(() => {
    refreshMetrics();
    refreshCapabilities();
    refreshProjects();
    refreshDeployments();
    refreshDatabases();
    refreshDomains();
    refreshBackups();
    refreshApiKeys();
    refreshPlans();
  }, [
    refreshMetrics, refreshCapabilities, refreshProjects, refreshDeployments,
    refreshDatabases, refreshDomains, refreshBackups, refreshApiKeys, refreshPlans
  ]);

  useEffect(() => {
    refreshAllData();
    const interval = setInterval(refreshMetrics, 3000);
    return () => clearInterval(interval);
  }, [refreshAllData, refreshMetrics]);

  // Project Actions Handlers
  const handleStartProject = async (id: string) => {
    try {
      await api.startProject(id);
      refreshProjects();
      refreshMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to start workload');
    }
  };

  const handleStopProject = async (id: string) => {
    try {
      await api.stopProject(id);
      refreshProjects();
      refreshMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to stop workload');
    }
  };

  const handleRestartProject = async (id: string) => {
    try {
      await api.restartProject(id);
      refreshProjects();
      refreshMetrics();
    } catch (err: any) {
      alert(err.message || 'Failed to restart workload');
    }
  };

  const handleCreateProject = async (payload: Partial<Project>) => {
    try {
      const created = await api.createProject(payload);
      setActiveProject(created);
      refreshProjects();
      refreshDeployments();
    } catch (err: any) {
      alert(err.message || 'Failed to create workload');
    }
  };

  const handleDeleteProject = async (id: string) => {
    if (!confirm('Are you sure you want to permanently terminate and remove this workload?')) return;
    try {
      await api.deleteProject(id);
      if (activeProject?.id === id) {
        setActiveProject(null);
      }
      refreshProjects();
    } catch (err: any) {
      alert(err.message || 'Failed to delete project');
    }
  };

  const handleDeployZip = async (projectId: string, file: File, message?: string) => {
    await api.deployZip(projectId, file, message);
    refreshDeployments();
    refreshProjects();
  };

  const handleDeployGit = async (payload: any) => {
    await api.deployGit(payload);
    refreshDeployments();
    refreshProjects();
  };

  const handleLogout = () => {
    api.setToken(null);
    setUser(null);
    setIsAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Top Global Navbar */}
      <Navbar
        user={user}
        metrics={metrics}
        onRefreshMetrics={refreshMetrics}
        onOpenAuth={() => setIsAuthModalOpen(true)}
        onLogout={handleLogout}
        onSelectView={setCurrentView}
      />

      {/* Body Layout: Sidebar + Main Dynamic View Canvas */}
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          currentView={currentView}
          onSelectView={setCurrentView}
          user={user}
          runningCount={projects.filter(p => p.status === 'running').length}
        />

        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
          {currentView === 'dashboard' && (
            <DashboardView
              metrics={metrics}
              projects={projects}
              deployments={deployments}
              onSelectProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('projects');
              }}
              onOpenCreateProject={() => setCurrentView('projects')}
              onSelectView={setCurrentView}
              onStartProject={handleStartProject}
              onStopProject={handleStopProject}
              onRestartProject={handleRestartProject}
            />
          )}

          {currentView === 'servers' && (
            <ServersView
              currentUser={user}
              onRefresh={refreshAllData}
            />
          )}

          {currentView === 'projects' && (
            <ProjectsView
              projects={projects}
              onSelectProject={(proj) => setActiveProject(proj)}
              onCreateProject={handleCreateProject}
              onDeleteProject={handleDeleteProject}
              onStartProject={handleStartProject}
              onStopProject={handleStopProject}
              onRestartProject={handleRestartProject}
              onOpenTerminalForProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('terminal');
              }}
              onOpenFilesForProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('files');
              }}
            />
          )}

          {currentView === 'ai' && (
            <AiComputeView
              projects={projects}
              metrics={metrics}
              onRefreshMetrics={refreshMetrics}
              onOpenTerminalForProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('terminal');
              }}
            />
          )}

          {currentView === 'gameservers' && (
            <GameServersView
              projects={projects}
              onStartProject={handleStartProject}
              onStopProject={handleStopProject}
              onRestartProject={handleRestartProject}
              onOpenTerminalForProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('terminal');
              }}
              onOpenFilesForProject={(proj) => {
                setActiveProject(proj);
                setCurrentView('files');
              }}
            />
          )}

          {currentView === 'deployments' && (
            <DeploymentsView
              deployments={deployments}
              projects={projects}
              onRefreshDeployments={refreshDeployments}
              onDeployZip={handleDeployZip}
              onDeployGit={handleDeployGit}
            />
          )}

          {currentView === 'terminal' && (
            <TerminalView
              projects={projects}
              activeProject={activeProject}
              onSelectProject={(proj) => setActiveProject(proj)}
            />
          )}

          {currentView === 'files' && (
            <FileManagerView
              projects={projects}
              activeProject={activeProject}
              onSelectProject={(proj) => setActiveProject(proj)}
            />
          )}

          {currentView === 'databases' && (
            <DatabasesView
              databases={databases}
              projects={projects}
              onRefreshDatabases={refreshDatabases}
              onCreateDatabase={async (pl) => {
                await api.createDatabase(pl);
                refreshDatabases();
              }}
              onDeleteDatabase={async (id) => {
                await api.deleteDatabase(id);
                refreshDatabases();
              }}
            />
          )}

          {currentView === 'domains' && (
            <DomainsView
              domains={domains}
              projects={projects}
              onRefreshDomains={refreshDomains}
              onCreateDomain={async (pl) => {
                await api.createDomain(pl);
                refreshDomains();
              }}
              onDeleteDomain={async (id) => {
                await api.deleteDomain(id);
                refreshDomains();
              }}
            />
          )}

          {currentView === 'ports' && (
            <PortsView projects={projects} />
          )}

          {currentView === 'logs' && (
            <LogsView projects={projects} />
          )}

          {currentView === 'backups' && (
            <BackupsView
              backups={backups}
              projects={projects}
              onRefreshBackups={refreshBackups}
              onCreateBackup={async (pId, type) => {
                await api.createBackup(pId, type);
                refreshBackups();
              }}
              onRestoreBackup={async (bId) => {
                await api.restoreBackup(bId);
                refreshBackups();
                refreshProjects();
              }}
              onDeleteBackup={async (bId) => {
                await api.deleteBackup(bId);
                refreshBackups();
              }}
            />
          )}

          {currentView === 'apikeys' && (
            <ApiKeysView
              apiKeys={apiKeys}
              onRefreshApiKeys={refreshApiKeys}
              onCreateApiKey={async (pl) => {
                const res = await api.createApiKey(pl);
                refreshApiKeys();
                return res;
              }}
              onRevokeApiKey={async (id) => {
                await api.revokeApiKey(id);
                refreshApiKeys();
              }}
            />
          )}

          {currentView === 'plans' && (
            <PlansView
              plans={plans}
              metrics={metrics}
              projects={projects}
            />
          )}

          {currentView === 'admin' && (
            <AdminView currentUser={user} />
          )}

          {currentView === 'diagnostics' && (
            <DiagnosticsView
              capabilities={capabilities}
              metrics={metrics}
              onRefreshCapabilities={refreshCapabilities}
            />
          )}
        </main>
      </div>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        onSuccess={(authProfile, token) => {
          setUser(authProfile);
          refreshAllData();
        }}
      />
    </div>
  );
}

export default App;
