import React from 'react';
import {
  Cpu, HardDrive, Activity, Radio, Play, Square, RotateCw,
  Plus, ExternalLink, ShieldCheck, Zap, Server, Terminal,
  Clock, AlertCircle, ArrowUpRight, CheckCircle2, ChevronRight, Rocket
} from 'lucide-react';
import { SystemMetricSnapshot, Project, Deployment } from '../../types';

interface DashboardViewProps {
  metrics: SystemMetricSnapshot | null;
  projects: Project[];
  deployments: Deployment[];
  onSelectProject: (proj: Project) => void;
  onOpenCreateProject: () => void;
  onSelectView: (view: string) => void;
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  metrics,
  projects,
  deployments,
  onSelectProject,
  onOpenCreateProject,
  onSelectView,
  onStartProject,
  onStopProject,
  onRestartProject
}) => {
  const activeCount = projects.filter(p => p.status === 'running').length;
  const recentDeployments = deployments.slice(0, 5);

  return (
    <div className="space-y-6 pb-12">
      {/* Node Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              ComputeHub Controller & Cluster Dashboard
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-950 text-cyan-400 border border-cyan-800">
              CLUSTER ACTIVE
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Distributed multi-worker compute cluster, hardware telemetry, process isolation, and 24/7 universal server orchestration.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => onSelectView('servers')}
            className="px-3.5 py-2 rounded-lg bg-zinc-800/90 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-cyan-300 flex items-center space-x-1.5 transition-colors"
          >
            <Server className="w-3.5 h-3.5 text-cyan-400" />
            <span>Server Nodes</span>
          </button>
          <button
            onClick={() => onSelectView('terminal')}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-mono text-zinc-200 flex items-center space-x-2 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5 text-zinc-400" />
            <span>Root Shell</span>
          </button>
          <button
            onClick={onOpenCreateProject}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Deploy Workload</span>
          </button>
        </div>
      </div>

      {/* Real Hardware Telemetry Grid */}
      {metrics && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* CPU Card */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono font-medium">CPU ALLOCATION</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">{metrics.cpu.usagePercent}%</span>
              <span className="text-xs text-zinc-400 font-mono">/ {metrics.cpu.cores} Cores</span>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.cpu.usagePercent}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-mono flex justify-between">
              <span>Load: {metrics.cpu.loadAverage.join(', ')}</span>
              <span>100% Host Capacity</span>
            </div>
          </div>

          {/* RAM Card */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono font-medium">MEMORY USAGE</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">
                {(metrics.memory.usedMB / 1024).toFixed(1)} GB
              </span>
              <span className="text-xs text-zinc-400 font-mono">
                / {(metrics.memory.totalMB / 1024).toFixed(1)} GB ({metrics.memory.usagePercent}%)
              </span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.memory.usagePercent}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-mono flex justify-between">
              <span>Free: {(metrics.memory.freeMB / 1024).toFixed(1)} GB</span>
              <span>DDR4/DDR5 ECC</span>
            </div>
          </div>

          {/* Disk NVMe Card */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono font-medium">PERSISTENT STORAGE</span>
              <HardDrive className="w-4 h-4 text-amber-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">{metrics.disk.usedGB} GB</span>
              <span className="text-xs text-zinc-400 font-mono">/ {metrics.disk.totalGB} GB ({metrics.disk.usagePercent}%)</span>
            </div>
            <div className="w-full bg-zinc-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full transition-all duration-500" 
                style={{ width: `${metrics.disk.usagePercent}%` }}
              />
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-mono flex justify-between">
              <span>Free: {metrics.disk.freeGB} GB</span>
              <span>NVMe Storage Array</span>
            </div>
          </div>

          {/* Network & GPU Status */}
          <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 relative overflow-hidden">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-mono font-medium">ACCELERATOR / I/O</span>
              <Radio className="w-4 h-4 text-purple-400" />
            </div>
            <div className="flex items-baseline space-x-2">
              <span className="text-2xl font-bold font-mono text-white">
                {metrics.gpu?.available ? 'CUDA ACTIVE' : 'CPU THREADS'}
              </span>
            </div>
            <div className="mt-3 flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">Network RX/TX:</span>
              <span className="text-zinc-200">
                {(metrics.network.bytesIn / (1024 * 1024)).toFixed(0)} / {(metrics.network.bytesOut / (1024 * 1024)).toFixed(0)} MB
              </span>
            </div>
            <div className="mt-2 text-[10px] text-zinc-400 font-mono flex justify-between">
              <span>{activeCount} Active Services</span>
              <span>Uptime: {Math.floor(metrics.uptimeSeconds / 3600)}h {Math.floor((metrics.uptimeSeconds % 3600) / 60)}m</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Grid: Active Workloads & Recent Deployments */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Workloads */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h2 className="text-sm font-bold text-white tracking-tight font-display uppercase">
                Active Managed Workloads ({projects.length})
              </h2>
            </div>
            <button
              onClick={() => onSelectView('projects')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
            >
              <span>View All Services</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {projects.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
                <p className="text-xs text-zinc-400">No active compute workloads running yet.</p>
                <button
                  onClick={onOpenCreateProject}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
                >
                  Deploy First Application
                </button>
              </div>
            ) : (
              projects.map((proj) => (
                <div
                  key={proj.id}
                  className="p-4 rounded-xl bg-zinc-900/60 hover:bg-zinc-900 border border-zinc-800 transition-all space-y-3 group"
                >
                  <div className="flex items-start justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2.5">
                        <span className={`w-2 h-2 rounded-full ${
                          proj.status === 'running' ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-zinc-600'
                        }`} />
                        <h3 
                          onClick={() => onSelectProject(proj)}
                          className="text-sm font-bold text-zinc-100 hover:text-cyan-400 cursor-pointer transition-colors"
                        >
                          {proj.name}
                        </h3>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {proj.runtime}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-zinc-800/80 text-zinc-400 uppercase">
                          {proj.workloadType}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-400 line-clamp-1">{proj.description}</p>
                    </div>

                    {/* Workload Actions */}
                    <div className="flex items-center space-x-1.5">
                      {proj.status === 'running' ? (
                        <button
                          onClick={() => onStopProject(proj.id)}
                          title="Stop Workload"
                          className="p-1.5 rounded-md bg-zinc-800 hover:bg-red-950/80 hover:text-red-400 text-zinc-400 border border-zinc-700 transition-colors"
                        >
                          <Square className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <button
                          onClick={() => onStartProject(proj.id)}
                          title="Start Workload"
                          className="p-1.5 rounded-md bg-zinc-800 hover:bg-emerald-950/80 hover:text-emerald-400 text-zinc-400 border border-zinc-700 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => onRestartProject(proj.id)}
                        title="Restart Workload"
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 transition-colors"
                      >
                        <RotateCw className="w-3.5 h-3.5" />
                      </button>

                      {proj.publicUrl && (
                        <a
                          href={proj.publicUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="Open Live Public Endpoint"
                          className="p-1.5 rounded-md bg-cyan-950/80 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Telemetry Footer */}
                  <div className="pt-2 border-t border-zinc-800/80 flex items-center justify-between text-[11px] font-mono text-zinc-400">
                    <div className="flex items-center space-x-4">
                      <span>PORT: <strong className="text-zinc-200">{proj.assignedInternalPort}</strong></span>
                      {proj.processStats && (
                        <>
                          <span>PID: <strong className="text-zinc-200">{proj.processStats.pid || 'N/A'}</strong></span>
                          <span>CPU: <strong className="text-zinc-200">{proj.processStats.cpuPercent}%</strong></span>
                          <span>RAM: <strong className="text-zinc-200">{proj.processStats.memoryMB} MB</strong></span>
                        </>
                      )}
                    </div>
                    <span className="text-emerald-400 font-semibold">{proj.status.toUpperCase()}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right Col: Deployment Activity & Server Quick Specs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Rocket className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-bold text-white tracking-tight font-display uppercase">
                Deployment Stream
              </h2>
            </div>
            <button
              onClick={() => onSelectView('deployments')}
              className="text-xs font-mono text-cyan-400 hover:text-cyan-300"
            >
              All Pipelines
            </button>
          </div>

          <div className="p-4 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-3">
            {recentDeployments.length === 0 ? (
              <p className="text-xs text-zinc-400 font-mono">No deployments registered.</p>
            ) : (
              recentDeployments.map((dep) => (
                <div key={dep.id} className="p-2.5 rounded-lg bg-zinc-950/60 border border-zinc-850 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-200 font-mono">v{dep.version} ({dep.sourceType})</span>
                    <span className={`px-1.5 py-0.2 text-[9px] font-mono rounded ${
                      dep.status === 'active' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {dep.status.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 font-mono line-clamp-1">{dep.commitMessage}</p>
                  <div className="text-[10px] text-zinc-400 flex items-center justify-between pt-1">
                    <span>{new Date(dep.startedAt).toLocaleTimeString()}</span>
                    <span>{dep.durationMs ? `${(dep.durationMs / 1000).toFixed(1)}s` : 'active'}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* 24/7 Production Node Specs Banner */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-950 border border-zinc-800 space-y-2.5">
            <h3 className="text-xs font-bold text-zinc-200 font-mono uppercase tracking-wider flex items-center space-x-1.5">
              <ShieldCheck className="w-4 h-4 text-cyan-400" />
              <span>Node Production Security</span>
            </h3>
            <ul className="text-[11px] font-mono text-zinc-400 space-y-1.5">
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Isolated container/process jail execution</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Reverse proxy auto-routing & SSL termination</span>
              </li>
              <li className="flex items-center space-x-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Crash loop detection & auto-restart supervisor</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};
