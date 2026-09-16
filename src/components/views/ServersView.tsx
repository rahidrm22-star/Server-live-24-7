import React, { useState, useEffect } from 'react';
import { 
  Server, Smartphone, Cpu, HardDrive, Wifi, Plus, Trash2, 
  RefreshCw, CheckCircle2, AlertTriangle, XCircle, Zap, Shield, 
  Terminal, Copy, Check, BatteryCharging, Battery, ArrowRight,
  Activity, Globe, HelpCircle, Layers, Radio, Settings2, Info, Play
} from 'lucide-react';
import { api } from '../../services/api';
import { ComputeWorker, WorkerClusterSummary, User } from '../../types';

interface ServersViewProps {
  currentUser: User | null;
  onRefresh?: () => void;
}

export const ServersView: React.FC<ServersViewProps> = ({ currentUser }) => {
  const [workers, setWorkers] = useState<ComputeWorker[]>([]);
  const [summary, setSummary] = useState<WorkerClusterSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modals & Panels
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addTab, setAddTab] = useState<'termux' | 'vps' | 'manual'>('termux');
  const [selectedWorker, setSelectedWorker] = useState<ComputeWorker | null>(null);

  // Manual Add Form
  const [manualForm, setManualForm] = useState({
    name: '',
    type: 'linux_vps' as ComputeWorker['type'],
    url: '',
    token: '',
    maxWorkloads: 15,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Testing Worker Connection
  const [testingWorkerId, setTestingWorkerId] = useState<string | null>(null);
  const [testResult, setTestResult] = useState<{
    workerId: string;
    success: boolean;
    latencyMs: number;
    message: string;
    diagnostics: any;
  } | null>(null);

  // Copy Feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const fetchWorkers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      setError(null);
      const res = await api.getWorkers();
      setWorkers(res.workers || []);
      setSummary(res.summary || null);
    } catch (err: any) {
      setError(err.message || 'Failed to load compute workers');
    } finally {
      if (!silent) setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchWorkers();
    const interval = setInterval(() => {
      fetchWorkers(true);
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualForm.name) return;
    setIsSubmitting(true);
    try {
      await api.createWorker({
        name: manualForm.name,
        type: manualForm.type,
        url: manualForm.url || undefined,
        token: manualForm.token || undefined,
        maxWorkloads: Number(manualForm.maxWorkloads),
        notes: manualForm.notes
      });
      setIsAddModalOpen(false);
      setManualForm({
        name: '',
        type: 'linux_vps',
        url: '',
        token: '',
        maxWorkloads: 15,
        notes: ''
      });
      await fetchWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to add worker');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTestWorker = async (worker: ComputeWorker) => {
    setTestingWorkerId(worker.id);
    setTestResult(null);
    try {
      const res = await api.testWorkerConnection(worker.id);
      setTestResult({
        workerId: worker.id,
        success: true,
        latencyMs: res.latencyMs,
        message: res.message,
        diagnostics: res.diagnostics
      });
      await fetchWorkers(true);
    } catch (err: any) {
      setTestResult({
        workerId: worker.id,
        success: false,
        latencyMs: 0,
        message: err.message || 'Worker connection failed',
        diagnostics: null
      });
    } finally {
      setTestingWorkerId(null);
    }
  };

  const handleDeleteWorker = async (worker: ComputeWorker) => {
    if (!confirm(`Are you sure you want to remove worker "${worker.name}"? Any active workloads assigned to this node will fall back to local execution.`)) {
      return;
    }
    try {
      await api.deleteWorker(worker.id);
      if (selectedWorker?.id === worker.id) setSelectedWorker(null);
      await fetchWorkers();
    } catch (err: any) {
      alert(err.message || 'Failed to delete worker');
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';
  const termux1LineScript = `curl -fsSL ${baseUrl}/api/workers/scripts/termux-install | bash`;
  const vps1LineScript = `curl -fsSL ${baseUrl}/api/workers/scripts/vps-install | bash`;

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-zinc-900/60 p-6 rounded-2xl border border-zinc-800">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-zinc-100 flex items-center gap-2.5">
              <Server className="w-6 h-6 text-cyan-400" />
              Distributed Compute Workers
            </h1>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800/60">
              Universal Connector
            </span>
          </div>
          <p className="text-sm text-zinc-400 max-w-2xl">
            Connect Android Termux smartphones, Linux VPS, dedicated bare-metal servers, and cloud VMs into your unified ComputeHub cluster with automatic workload scheduling.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            id="refresh-workers-btn"
            onClick={() => {
              setRefreshing(true);
              fetchWorkers();
            }}
            disabled={refreshing}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-zinc-300 bg-zinc-800/80 hover:bg-zinc-800 hover:text-white border border-zinc-700/60 rounded-xl transition-all"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-cyan-400' : ''}`} />
            Sync Cluster
          </button>

          {currentUser?.role === 'admin' || currentUser?.role === 'superadmin' ? (
            <button
              id="connect-worker-btn"
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 text-xs font-bold text-zinc-950 bg-gradient-to-r from-cyan-400 to-teal-400 hover:from-cyan-300 hover:to-teal-300 rounded-xl shadow-lg shadow-cyan-500/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Connect Worker Node
            </button>
          ) : null}
        </div>
      </div>

      {/* Cluster Telemetry Stats */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Nodes Online</span>
              <Activity className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100 flex items-baseline gap-1.5">
              <span className="text-emerald-400">{summary.onlineWorkers}</span>
              <span className="text-xs font-normal text-zinc-500">/ {summary.totalWorkers} total</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Cluster Cores</span>
              <Cpu className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {summary.totalCpuCores} <span className="text-xs font-normal text-zinc-500">vCPUs</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Total RAM</span>
              <HardDrive className="w-4 h-4 text-purple-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {(summary.totalMemoryMB / 1024).toFixed(1)} <span className="text-xs font-normal text-zinc-500">GB</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Avg Cluster Ping</span>
              <Wifi className="w-4 h-4 text-teal-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {summary.avgPingLatencyMs} <span className="text-xs font-normal text-zinc-500">ms</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Termux Nodes</span>
              <Smartphone className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {summary.termuxCount} <span className="text-xs font-normal text-zinc-500">ARM64</span>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-4 rounded-xl border border-zinc-800">
            <div className="flex items-center justify-between text-zinc-400 mb-1.5">
              <span className="text-xs font-medium">Active Jobs</span>
              <Layers className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-xl font-bold text-zinc-100">
              {summary.activeWorkloads} <span className="text-xs font-normal text-zinc-500">workloads</span>
            </div>
          </div>
        </div>
      )}

      {/* Diagnostics Test Feedback Banner */}
      {testResult && (
        <div className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
          testResult.success 
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200' 
            : 'bg-red-950/40 border-red-800/80 text-red-200'
        }`}>
          <div className="flex items-start gap-3">
            {testResult.success ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="font-semibold text-sm">
                {testResult.success ? 'Worker Connection Verified' : 'Worker Test Failed'}
              </div>
              <p className="text-xs opacity-90 mt-0.5">{testResult.message}</p>
              {testResult.diagnostics && (
                <div className="flex flex-wrap gap-3 mt-2 text-xs font-mono bg-black/30 p-2.5 rounded-lg border border-white/5">
                  <div>Latency: <span className="text-emerald-400 font-bold">{testResult.latencyMs}ms</span></div>
                  <div>Protocol: {testResult.diagnostics.reachability}</div>
                  <div>OS: {testResult.diagnostics.os}</div>
                  <div>Hardware: {testResult.diagnostics.cores} Cores | {Math.round(testResult.diagnostics.ramMB / 1024)}GB RAM</div>
                  {testResult.diagnostics.batteryLevel !== undefined && (
                    <div>Battery: {testResult.diagnostics.batteryLevel}%</div>
                  )}
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={() => setTestResult(null)} 
            className="text-xs hover:opacity-100 opacity-60 p-1"
          >
            ✕
          </button>
        </div>
      )}

      {/* Workers Grid */}
      {loading ? (
        <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
          <RefreshCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-3" />
          <p className="text-sm text-zinc-400 font-medium">Scanning cluster nodes & polling heartbeats...</p>
        </div>
      ) : workers.length === 0 ? (
        <div className="p-12 text-center bg-zinc-900/30 rounded-2xl border border-zinc-800/60">
          <Server className="w-12 h-12 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-zinc-200">No External Workers Connected</h3>
          <p className="text-xs text-zinc-400 max-w-md mx-auto mt-1 mb-5">
            Connect an Android phone running Termux or a cloud Linux VPS to begin distributing project workloads.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 text-xs font-bold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl"
          >
            Connect First Worker Node
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-5">
          {workers.map((worker) => {
            const isOnline = worker.status === 'online';
            const isBusy = worker.status === 'busy';
            const isTermux = worker.type === 'termux';
            const isLocal = worker.type === 'local_runner';

            return (
              <div
                key={worker.id}
                id={`worker-card-${worker.id}`}
                className={`bg-zinc-900/80 rounded-2xl border p-5 transition-all flex flex-col justify-between ${
                  selectedWorker?.id === worker.id 
                    ? 'border-cyan-500/80 ring-1 ring-cyan-500/40 bg-zinc-900' 
                    : 'border-zinc-800/90 hover:border-zinc-700'
                }`}
              >
                <div>
                  {/* Top Row: Type, Status, Latency */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2.5 rounded-xl border ${
                        isTermux 
                          ? 'bg-amber-950/40 border-amber-800/60 text-amber-400' 
                          : isLocal 
                          ? 'bg-blue-950/40 border-blue-800/60 text-blue-400' 
                          : 'bg-cyan-950/40 border-cyan-800/60 text-cyan-400'
                      }`}>
                        {isTermux ? <Smartphone className="w-5 h-5" /> : <Server className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-zinc-100 flex items-center gap-2">
                          {worker.name}
                        </h3>
                        <div className="text-xs text-zinc-400 font-mono mt-0.5">
                          {worker.os.name} ({worker.os.arch})
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className={`px-2 py-0.5 text-xs font-semibold rounded-full flex items-center gap-1.5 ${
                        isOnline 
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-800/60' 
                          : isBusy 
                          ? 'bg-amber-950 text-amber-400 border border-amber-800/60' 
                          : 'bg-red-950 text-red-400 border border-red-800/60'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          isOnline ? 'bg-emerald-400 animate-pulse' : isBusy ? 'bg-amber-400' : 'bg-red-400'
                        }`} />
                        {worker.status.toUpperCase()}
                      </span>
                      <span className="text-[11px] font-mono text-zinc-500">
                        {worker.pingLatencyMs}ms ping
                      </span>
                    </div>
                  </div>

                  {/* Hardware Telemetry Bars */}
                  <div className="space-y-2.5 bg-black/30 p-3.5 rounded-xl border border-zinc-800/60 my-3.5">
                    {/* CPU */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                          CPU ({worker.hardware.cpuCores} Cores)
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold">
                          {worker.hardware.cpuUsagePercent}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            worker.hardware.cpuUsagePercent > 80 ? 'bg-red-500' : worker.hardware.cpuUsagePercent > 50 ? 'bg-amber-400' : 'bg-cyan-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, worker.hardware.cpuUsagePercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* RAM */}
                    <div>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-zinc-400 flex items-center gap-1.5">
                          <HardDrive className="w-3.5 h-3.5 text-purple-400" />
                          RAM ({Math.round(worker.hardware.usedMemoryMB / 1024 * 10) / 10} / {Math.round(worker.hardware.totalMemoryMB / 1024 * 10) / 10} GB)
                        </span>
                        <span className="font-mono text-zinc-200 font-semibold">
                          {worker.hardware.memoryUsagePercent}%
                        </span>
                      </div>
                      <div className="w-full bg-zinc-800 rounded-full h-1.5 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            worker.hardware.memoryUsagePercent > 85 ? 'bg-red-500' : worker.hardware.memoryUsagePercent > 60 ? 'bg-amber-400' : 'bg-purple-400'
                          }`}
                          style={{ width: `${Math.min(100, Math.max(3, worker.hardware.memoryUsagePercent))}%` }}
                        />
                      </div>
                    </div>

                    {/* Battery (if Termux) or Storage */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-zinc-800/40">
                      {worker.hardware.battery ? (
                        <div className="flex items-center gap-1.5 text-amber-300">
                          {worker.hardware.battery.isCharging ? (
                            <BatteryCharging className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Battery className="w-3.5 h-3.5 text-amber-400" />
                          )}
                          <span>Battery: {worker.hardware.battery.level}% {worker.hardware.battery.isCharging ? '(Charging)' : ''}</span>
                        </div>
                      ) : (
                        <div className="text-zinc-400">
                          Storage: {worker.hardware.usedStorageGB}GB / {worker.hardware.totalStorageGB}GB ({worker.hardware.storageUsagePercent}%)
                        </div>
                      )}

                      <div className="text-zinc-400">
                        Workloads: <span className="text-zinc-200 font-bold">{worker.assignedProjectsCount}</span> / {worker.maxWorkloads}
                      </div>
                    </div>
                  </div>

                  {/* Verified Runtimes */}
                  <div>
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Supported Runtimes
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {worker.runtimes.filter(r => r.available).map((r) => (
                        <span
                          key={r.runtime}
                          className="px-2 py-0.5 text-[11px] font-mono bg-zinc-800/80 text-zinc-300 rounded-md border border-zinc-700/50"
                        >
                          {r.runtime}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3.5 border-t border-zinc-800/80 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      id={`test-btn-${worker.id}`}
                      onClick={() => handleTestWorker(worker)}
                      disabled={testingWorkerId === worker.id}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-cyan-400 bg-cyan-950/40 hover:bg-cyan-950/80 border border-cyan-800/60 rounded-lg transition-all"
                    >
                      <Zap className={`w-3.5 h-3.5 ${testingWorkerId === worker.id ? 'animate-spin' : ''}`} />
                      {testingWorkerId === worker.id ? 'Pinging...' : 'Test Ping'}
                    </button>

                    <button
                      onClick={async () => {
                        try {
                          const testProj = await api.createProject({
                            name: `Python Test Workload (${worker.name})`,
                            description: 'Live 24/7 Python daemon process executing on remote compute node.',
                            workloadType: 'api',
                            runtime: 'python-3.11',
                            workerId: worker.id,
                            startCommand: 'python3 main.py'
                          });
                          await api.startProject(testProj.id);
                          alert(`✓ Real Python workload created and deployed to ${worker.name}! Check Workloads & Services tab.`);
                          await fetchWorkers(true);
                        } catch (err: any) {
                          alert(err.message || 'Failed to deploy test workload');
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-950/40 hover:bg-emerald-950/80 border border-emerald-800/60 rounded-lg transition-all"
                    >
                      <Play className="w-3 h-3" />
                      Deploy Test Python
                    </button>

                    <button
                      onClick={() => setSelectedWorker(selectedWorker?.id === worker.id ? null : worker)}
                      className="px-2.5 py-1.5 text-xs text-zinc-300 hover:text-white bg-zinc-800/60 hover:bg-zinc-800 rounded-lg border border-zinc-700/40 transition-all"
                    >
                      {selectedWorker?.id === worker.id ? 'Hide' : 'Details'}
                    </button>
                  </div>

                  {!isLocal && (currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
                    <button
                      onClick={() => handleDeleteWorker(worker)}
                      title="Remove worker node"
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Expanded Details Drawer */}
                {selectedWorker?.id === worker.id && (
                  <div className="mt-3.5 pt-3.5 border-t border-zinc-800 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Worker ID:</span>
                      <span className="font-mono text-zinc-300">{worker.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-400">Connection Mode:</span>
                      <span className="text-zinc-300 font-mono">{worker.connectionType}</span>
                    </div>
                    {worker.url && (
                      <div className="flex items-center justify-between">
                        <span className="text-zinc-400">Inbound Endpoint:</span>
                        <span className="text-zinc-300 font-mono truncate max-w-[180px]">{worker.url}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between bg-black/40 p-2 rounded border border-zinc-800">
                      <span className="text-zinc-400 font-mono">Auth Token:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-cyan-300 truncate max-w-[140px]">{worker.token}</span>
                        <button
                          onClick={() => copyToClipboard(worker.token, `token-${worker.id}`)}
                          className="text-zinc-400 hover:text-white p-1"
                        >
                          {copiedKey === `token-${worker.id}` ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Connect Worker Node Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-5 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-cyan-950 border border-cyan-800 text-cyan-400">
                  <Server className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-zinc-100">Connect New Compute Worker</h3>
                  <p className="text-xs text-zinc-400">Add an Android Termux phone, Cloud VPS, or manual remote host</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-zinc-400 hover:text-white text-lg p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-950/20 px-5 pt-2">
              <button
                onClick={() => setAddTab('termux')}
                className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  addTab === 'termux' 
                    ? 'border-amber-400 text-amber-300' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone className="w-4 h-4" />
                Android Termux (1-Click)
              </button>
              <button
                onClick={() => setAddTab('vps')}
                className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  addTab === 'vps' 
                    ? 'border-cyan-400 text-cyan-300' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Server className="w-4 h-4" />
                Linux VPS / Cloud VM (1-Click)
              </button>
              <button
                onClick={() => setAddTab('manual')}
                className={`pb-2.5 px-4 text-xs font-bold flex items-center gap-2 border-b-2 transition-all ${
                  addTab === 'manual' 
                    ? 'border-purple-400 text-purple-300' 
                    : 'border-transparent text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Settings2 className="w-4 h-4" />
                Manual Configuration
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {addTab === 'termux' && (
                <div className="space-y-4">
                  <div className="bg-amber-950/30 border border-amber-800/60 p-4 rounded-xl text-xs text-amber-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-amber-400">
                      <Smartphone className="w-4 h-4" />
                      Turn Any Android Device into a 24/7 Server Worker
                    </div>
                    <p>
                      Runs smoothly in the background using Termux. No root required. Automatically keeps a wake-lock to prevent battery sleep interruptions.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Run this single command inside Android Termux:
                    </label>
                    <div className="relative bg-black/60 p-3.5 rounded-xl border border-zinc-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
                      <span className="select-all break-all pr-8">{termux1LineScript}</span>
                      <button
                        onClick={() => copyToClipboard(termux1LineScript, 'termux-cmd')}
                        className="absolute right-2.5 p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
                      >
                        {copiedKey === 'termux-cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2 text-xs text-zinc-400">
                    <div className="font-semibold text-zinc-200">Quick Android Setup Steps:</div>
                    <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                      <li>Open F-Droid and install <strong>Termux</strong>.</li>
                      <li>Launch Termux and paste the 1-line command above.</li>
                      <li>The installer will configure Node.js, acquire a 24/7 wake-lock, and register with this Controller.</li>
                      <li>Your phone will appear in this list within seconds!</li>
                    </ol>
                  </div>
                </div>
              )}

              {addTab === 'vps' && (
                <div className="space-y-4">
                  <div className="bg-cyan-950/30 border border-cyan-800/60 p-4 rounded-xl text-xs text-cyan-200 space-y-1.5">
                    <div className="font-bold flex items-center gap-2 text-cyan-400">
                      <Server className="w-4 h-4" />
                      Connect Any Ubuntu / Debian / CentOS / Arch VPS
                    </div>
                    <p>
                      Installs a 24/7 `systemd` daemon that reports CPU, RAM, Docker, Python, Java, and runtimes to this Controller.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1.5">
                      Run this command on your VPS (as root):
                    </label>
                    <div className="relative bg-black/60 p-3.5 rounded-xl border border-zinc-800 font-mono text-xs text-cyan-300 flex items-center justify-between">
                      <span className="select-all break-all pr-8">{vps1LineScript}</span>
                      <button
                        onClick={() => copyToClipboard(vps1LineScript, 'vps-cmd')}
                        className="absolute right-2.5 p-1.5 text-zinc-400 hover:text-white bg-zinc-800 rounded-lg"
                      >
                        {copiedKey === 'vps-cmd' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {addTab === 'manual' && (
                <form onSubmit={handleManualAdd} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Server Name *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Hetzner Cloud Node 02"
                        value={manualForm.name}
                        onChange={(e) => setManualForm({ ...manualForm, name: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Worker Type
                      </label>
                      <select
                        value={manualForm.type}
                        onChange={(e) => setManualForm({ ...manualForm, type: e.target.value as any })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                      >
                        <option value="linux_vps">Linux VPS / Cloud VM</option>
                        <option value="termux">Android Termux</option>
                        <option value="dedicated">Dedicated Bare Metal</option>
                        <option value="cloud_vm">Cloud VM (AWS/GCP/Azure)</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Direct Inbound URL (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="https://node.mydomain.example:8443"
                        value={manualForm.url}
                        onChange={(e) => setManualForm({ ...manualForm, url: e.target.value })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-zinc-300 mb-1">
                        Max Parallel Workloads
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={manualForm.maxWorkloads}
                        onChange={(e) => setManualForm({ ...manualForm, maxWorkloads: parseInt(e.target.value, 10) || 10 })}
                        className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Custom Worker Auth Token (Optional - Leave blank to auto-generate)
                    </label>
                    <input
                      type="text"
                      placeholder="sec_custom_worker_token..."
                      value={manualForm.token}
                      onChange={(e) => setManualForm({ ...manualForm, token: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-zinc-300 mb-1">
                      Notes / Description
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. ARM64 8-core edge compute node"
                      value={manualForm.notes}
                      onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div className="flex justify-end gap-2.5 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsAddModalOpen(false)}
                      className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-800 rounded-xl"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="px-4 py-2 text-xs font-bold text-zinc-950 bg-cyan-400 hover:bg-cyan-300 rounded-xl"
                    >
                      {isSubmitting ? 'Registering...' : 'Register Worker'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
