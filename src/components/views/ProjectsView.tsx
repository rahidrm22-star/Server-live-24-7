import React, { useState } from 'react';
import {
  Box, Play, Square, RotateCw, Plus, ExternalLink, Trash2,
  Settings, Terminal, FolderTree, Cpu, Activity, HardDrive,
  Shield, Check, Search, Filter, RefreshCw, Radio, Server, Smartphone, Zap
} from 'lucide-react';
import { Project, RuntimeId, WorkloadType } from '../../types';

interface ProjectsViewProps {
  projects: Project[];
  onSelectProject: (proj: Project) => void;
  onCreateProject: (payload: Partial<Project>) => void;
  onDeleteProject: (id: string) => void;
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
  onOpenTerminalForProject: (proj: Project) => void;
  onOpenFilesForProject: (proj: Project) => void;
}

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  projects,
  onSelectProject,
  onCreateProject,
  onDeleteProject,
  onStartProject,
  onStopProject,
  onRestartProject,
  onOpenTerminalForProject,
  onOpenFilesForProject
}) => {
  const [filterType, setFilterType] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New project form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [workloadType, setWorkloadType] = useState<WorkloadType>('web');
  const [runtime, setRuntime] = useState<RuntimeId>('nodejs-20');
  const [buildCommand, setBuildCommand] = useState('npm install && npm run build');
  const [startCommand, setStartCommand] = useState('npm start');
  const [cpuCores, setCpuCores] = useState(2.0);
  const [memoryMB, setMemoryMB] = useState(2048);
  const [storageMB, setStorageMB] = useState(10240);
  const [gpuEnabled, setGpuEnabled] = useState(false);
  const [envVarsText, setEnvVarsText] = useState('NODE_ENV=production\nPORT=3000');

  // Game server custom state
  const [gameType, setGameType] = useState<'minecraft' | 'valheim' | 'palworld' | 'terraria' | 'cs2'>('minecraft');
  const [maxPlayers, setMaxPlayers] = useState(20);

  const handleRuntimeChange = (rt: RuntimeId) => {
    setRuntime(rt);
    if (rt.startsWith('nodejs')) {
      setBuildCommand('npm install && npm run build');
      setStartCommand('npm start');
    } else if (rt === 'python-3.11') {
      setBuildCommand('pip install -r requirements.txt');
      setStartCommand('python main.py');
    } else if (rt === 'python-ai-pytorch') {
      setBuildCommand('pip install -r requirements.txt torch fastapi uvicorn');
      setStartCommand('uvicorn main:app --host 0.0.0.0 --port 8000');
      setWorkloadType('ai');
      setGpuEnabled(true);
      setMemoryMB(8192);
    } else if (rt === 'go-1.22') {
      setBuildCommand('go build -o server .');
      setStartCommand('./server');
    } else if (rt === 'rust-1.78') {
      setBuildCommand('cargo build --release');
      setStartCommand('./target/release/server');
    } else if (rt === 'java-21') {
      setBuildCommand('mvn clean package || ./gradlew build');
      setStartCommand('java -jar target/app.jar');
    } else if (rt === 'static') {
      setBuildCommand('');
      setStartCommand('');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Parse env vars
    const envVars: Record<string, string> = {};
    envVarsText.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2 && parts[0].trim()) {
        envVars[parts[0].trim()] = parts.slice(1).join('=').trim();
      }
    });

    onCreateProject({
      name,
      description,
      workloadType,
      runtime,
      buildCommand,
      startCommand,
      envVars,
      limits: {
        cpuCores: Number(cpuCores),
        memoryMB: Number(memoryMB),
        storageMB: Number(storageMB),
        processLimit: 10,
        gpuEnabled
      },
      gameServerConfig: workloadType === 'gameserver' ? {
        gameType,
        maxPlayers: Number(maxPlayers),
        worldName: `${name.toLowerCase().replace(/\s+/g, '-')}-world`
      } : undefined,
      aiConfig: workloadType === 'ai' ? {
        modelType: 'PyTorch-Transformer',
        accelerator: gpuEnabled ? 'cuda' : 'cpu',
        apiEndpointPath: '/api/v1/predict'
      } : undefined
    });

    setIsCreateModalOpen(false);
    // Reset defaults
    setName('');
    setDescription('');
  };

  const filteredProjects = projects.filter(p => {
    const matchesFilter = filterType === 'all' || p.workloadType === filterType;
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.runtime.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Managed Workloads & Services
          </h1>
          <p className="text-xs text-zinc-400">
            Isolated cloud processes, microservices, AI inference models, and game servers.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Workload</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center space-x-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'web', 'api', 'ai', 'gameserver', 'database', 'worker'].map(t => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono capitalize transition-colors shrink-0 ${
                filterType === t
                  ? 'bg-zinc-800 text-cyan-400 font-semibold border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              {t === 'gameserver' ? 'Game Servers' : t}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search workloads..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <Box className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">No matching workloads found</p>
            <p className="text-xs text-zinc-500">Create a new project or adjust your filters.</p>
          </div>
        ) : (
          filteredProjects.map((project) => (
            <div
              key={project.id}
              className="p-5 rounded-xl bg-zinc-900/70 hover:bg-zinc-900 border border-zinc-800 hover:border-zinc-700 transition-all flex flex-col justify-between space-y-4 group shadow-md"
            >
              {/* Header */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className={`w-2.5 h-2.5 rounded-full ${
                      project.status === 'running' ? 'bg-emerald-400 shadow-sm shadow-emerald-400 animate-pulse' : 'bg-zinc-600'
                    }`} />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-zinc-400">
                      {project.workloadType}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    project.status === 'running' 
                      ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/80' 
                      : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
                  }`}>
                    {project.status.toUpperCase()}
                  </span>
                </div>

                <div>
                  <h3 
                    onClick={() => onSelectProject(project)}
                    className="text-base font-bold text-white group-hover:text-cyan-400 cursor-pointer transition-colors"
                  >
                    {project.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-2 mt-1">{project.description}</p>
                </div>
              </div>

              {/* Resource & Metadata Specs */}
              <div className="p-3 rounded-lg bg-zinc-950/80 border border-zinc-850 space-y-2 text-xs font-mono">
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Runtime</span>
                  <span className="text-zinc-200 font-semibold">{project.runtime}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Assigned Port</span>
                  <span className="text-cyan-400 font-semibold">:{project.assignedInternalPort}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-400">
                  <span>Allocated Limits</span>
                  <span className="text-zinc-300">
                    {project.limits.cpuCores} vCPU / {project.limits.memoryMB} MB
                  </span>
                </div>
                {/* Distributed Worker Assignment */}
                <div className="flex items-center justify-between text-zinc-400 pt-1 border-t border-zinc-800/50">
                  <span className="flex items-center gap-1">
                    <Server className="w-3 h-3 text-cyan-400" />
                    Compute Node
                  </span>
                  <span className="text-cyan-300 font-semibold truncate max-w-[150px]">
                    {project.workerId ? (
                      project.workerId.includes('termux') ? 'Android Termux Node' :
                      project.workerId.includes('vps') ? 'Linux Cloud VPS' :
                      'Local Runner'
                    ) : 'Auto-Scheduled'}
                  </span>
                </div>
                {project.limits.gpuEnabled && (
                  <div className="flex items-center justify-between text-purple-400">
                    <span>Hardware Accelerator</span>
                    <span className="font-semibold">NVIDIA CUDA</span>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
                <div className="flex items-center space-x-1.5">
                  {project.status === 'running' ? (
                    <button
                      onClick={() => onStopProject(project.id)}
                      title="Stop Process"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-red-950/80 hover:text-red-400 text-zinc-400 border border-zinc-700 transition-colors"
                    >
                      <Square className="w-3.5 h-3.5" />
                    </button>
                  ) : (
                    <button
                      onClick={() => onStartProject(project.id)}
                      title="Start Process"
                      className="p-2 rounded-lg bg-zinc-800 hover:bg-emerald-950/80 hover:text-emerald-400 text-zinc-400 border border-zinc-700 transition-colors"
                    >
                      <Play className="w-3.5 h-3.5" />
                    </button>
                  )}

                  <button
                    onClick={() => onRestartProject(project.id)}
                    title="Restart Process"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 transition-colors"
                  >
                    <RotateCw className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenTerminalForProject(project)}
                    title="Open Shell Terminal"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-cyan-950 hover:text-cyan-400 text-zinc-400 border border-zinc-700 transition-colors"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => onOpenFilesForProject(project)}
                    title="Open File Explorer"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-amber-950 hover:text-amber-400 text-zinc-400 border border-zinc-700 transition-colors"
                  >
                    <FolderTree className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="flex items-center space-x-1.5">
                  {project.publicUrl && (
                    <a
                      href={project.publicUrl}
                      target="_blank"
                      rel="noreferrer"
                      title="Open Live URL"
                      className="p-2 rounded-lg bg-cyan-950 hover:bg-cyan-900 text-cyan-400 border border-cyan-800 transition-colors"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}

                  <button
                    onClick={() => onDeleteProject(project.id)}
                    title="Destroy Workload"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-red-950/80 hover:text-red-400 text-zinc-400 border border-zinc-700 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* CREATE WORKLOAD MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl p-6 relative shadow-2xl my-8">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div className="flex items-center space-x-2">
                <Box className="w-5 h-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-white font-display">Provision 24/7 Compute Workload</h2>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              {/* Name & Workload Type */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Workload Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. FastAPI Inference Server"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Workload Type</label>
                  <select
                    value={workloadType}
                    onChange={(e) => setWorkloadType(e.target.value as WorkloadType)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="web">Web Application (HTTP/Frontend)</option>
                    <option value="api">Backend REST / GraphQL API</option>
                    <option value="ai">AI / Machine Learning Inference</option>
                    <option value="gameserver">Game Server (TCP/UDP Dedicated)</option>
                    <option value="worker">Background Queue Worker / Cron</option>
                    <option value="database">Custom Micro-Database</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Description</label>
                <input
                  type="text"
                  placeholder="Primary enterprise compute service"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Runtime Environment Selector */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Runtime Environment</label>
                <select
                  value={runtime}
                  onChange={(e) => handleRuntimeChange(e.target.value as RuntimeId)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                >
                  <option value="nodejs-20">Node.js 20 LTS (V8 / Express / Next.js)</option>
                  <option value="nodejs-22">Node.js 22 Current</option>
                  <option value="python-3.11">Python 3.11 (Standard API / Flask / Django)</option>
                  <option value="python-ai-pytorch">Python 3.11 + PyTorch + CUDA (AI/ML)</option>
                  <option value="go-1.22">Golang 1.22 (High-Throughput Microservice)</option>
                  <option value="rust-1.78">Rust 1.78 (Zero-Cost Async Service)</option>
                  <option value="java-21">Java 21 LTS (Spring Boot / OpenJDK)</option>
                  <option value="php-8.3">PHP 8.3 (Laravel / Nginx FPM)</option>
                  <option value="cpp-gcc">C/C++ (GCC Native Binary)</option>
                  <option value="static">Static HTML5 / CSS / SPA Files</option>
                </select>
              </div>

              {/* Game Server Details if Selected */}
              {workloadType === 'gameserver' && (
                <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-800 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-300 font-mono uppercase">Game Server Configuration</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-mono text-zinc-300 mb-1">Game Engine</label>
                      <select
                        value={gameType}
                        onChange={(e) => setGameType(e.target.value as any)}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                      >
                        <option value="minecraft">Minecraft (Paper / Spigot 1.20.4)</option>
                        <option value="valheim">Valheim Dedicated Server</option>
                        <option value="palworld">Palworld Dedicated Server</option>
                        <option value="terraria">Terraria TShock Server</option>
                        <option value="cs2">Counter-Strike 2 Dedicated</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-mono text-zinc-300 mb-1">Max Player Slots</label>
                      <input
                        type="number"
                        value={maxPlayers}
                        onChange={(e) => setMaxPlayers(Number(e.target.value))}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Build & Start Command */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Build Command</label>
                  <input
                    type="text"
                    value={buildCommand}
                    onChange={(e) => setBuildCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Start Command</label>
                  <input
                    type="text"
                    value={startCommand}
                    onChange={(e) => setStartCommand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Resource Limit Quotas */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <h4 className="text-xs font-bold text-zinc-300 font-mono uppercase">Assigned Host Resource Quotas</h4>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">CPU Cores</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0.5"
                      max="32"
                      value={cpuCores}
                      onChange={(e) => setCpuCores(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">RAM (MB)</label>
                    <input
                      type="number"
                      step="512"
                      min="256"
                      value={memoryMB}
                      onChange={(e) => setMemoryMB(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-mono text-zinc-400 mb-1">Disk (MB)</label>
                    <input
                      type="number"
                      step="1024"
                      value={storageMB}
                      onChange={(e) => setStorageMB(Number(e.target.value))}
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono"
                    />
                  </div>
                </div>

                {/* GPU Checkbox */}
                <label className="flex items-center space-x-2 pt-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={gpuEnabled}
                    onChange={(e) => setGpuEnabled(e.target.checked)}
                    className="rounded bg-zinc-900 border-zinc-700 text-cyan-500 focus:ring-0"
                  />
                  <span className="text-xs font-mono text-purple-300">
                    Enable Hardware GPU Acceleration (NVIDIA CUDA / TensorRT if present)
                  </span>
                </label>
              </div>

              {/* Environment Variables */}
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Environment Variables (KEY=VALUE per line)</label>
                <textarea
                  rows={3}
                  value={envVarsText}
                  onChange={(e) => setEnvVarsText(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold shadow-lg shadow-cyan-900/30 transition-all"
                >
                  Provision & Launch Workload
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
