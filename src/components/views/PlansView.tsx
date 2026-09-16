import React from 'react';
import {
  Layers, Check, Zap, Cpu, HardDrive, ShieldCheck, Sparkles, Activity
} from 'lucide-react';
import { HostingPlan, SystemMetricSnapshot, Project } from '../../types';

interface PlansViewProps {
  plans: HostingPlan[];
  metrics: SystemMetricSnapshot | null;
  projects: Project[];
}

export const PlansView: React.FC<PlansViewProps> = ({ plans, metrics, projects }) => {
  const totalCoresUsed = projects.reduce((acc, p) => acc + (p.status === 'running' ? p.limits.cpuCores : 0), 0);
  const totalMemoryUsed = projects.reduce((acc, p) => acc + (p.status === 'running' ? p.limits.memoryMB : 0), 0);

  return (
    <div className="space-y-8 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight font-display">
          Host Resource Quotas & Compute Plans
        </h1>
        <p className="text-xs text-zinc-400">
          Enforce hardware boundaries, CPU cores, RAM limits, and workload allocations.
        </p>
      </div>

      {/* Live Quota Consumption Meter */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
          Active Node Resource Allocation vs Server Hardware
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Workloads Reserved CPU</span>
              <span className="text-cyan-400 font-bold">{totalCoresUsed.toFixed(1)} / {metrics?.cpu.cores || 8} vCPUs</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-cyan-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (totalCoresUsed / (metrics?.cpu.cores || 8)) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Workloads Reserved RAM</span>
              <span className="text-emerald-400 font-bold">{(totalMemoryUsed / 1024).toFixed(1)} / {((metrics?.memory.totalMB || 16384) / 1024).toFixed(1)} GB</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (totalMemoryUsed / (metrics?.memory.totalMB || 16384)) * 100)}%` }} 
              />
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
            <div className="flex justify-between text-xs font-mono text-zinc-400">
              <span>Active Containers / Jail Processes</span>
              <span className="text-amber-400 font-bold">{projects.filter(p => p.status === 'running').length} Active</span>
            </div>
            <div className="w-full bg-zinc-900 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-amber-500 h-full rounded-full" 
                style={{ width: `${Math.min(100, (projects.filter(p => p.status === 'running').length / 50) * 100)}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      {/* Plan Tier Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => {
          const isPopular = plan.id === 'pro';

          return (
            <div
              key={plan.id}
              className={`p-6 rounded-2xl border flex flex-col justify-between space-y-6 transition-all relative ${
                isPopular
                  ? 'bg-gradient-to-b from-zinc-900 to-zinc-950 border-cyan-500/80 shadow-2xl shadow-cyan-950/30'
                  : 'bg-zinc-900/60 border-zinc-800'
              }`}
            >
              {isPopular && (
                <span className="absolute -top-3 right-6 px-3 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-600 text-white uppercase tracking-wider">
                  Recommended Tier
                </span>
              )}

              <div className="space-y-3">
                <div>
                  <h3 className="text-lg font-bold text-white font-display">{plan.name}</h3>
                  <p className="text-xs text-zinc-400 mt-1">{plan.description}</p>
                </div>

                <div className="flex items-baseline space-x-1">
                  <span className="text-3xl font-bold font-mono text-white">${plan.priceMonthly}</span>
                  <span className="text-xs text-zinc-400 font-mono">/ month</span>
                </div>

                {/* Specs List */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2 text-xs font-mono">
                  <div className="flex justify-between text-zinc-300">
                    <span>Max Workloads</span>
                    <span className="font-bold text-white">{plan.maxProjects}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>CPU Cores</span>
                    <span className="font-bold text-white">{plan.maxCpuCores} vCPUs</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Memory (RAM)</span>
                    <span className="font-bold text-white">{(plan.maxMemoryMB / 1024).toFixed(0)} GB</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Persistent SSD</span>
                    <span className="font-bold text-white">{(plan.maxStorageMB / 1024).toFixed(0)} GB</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>Databases</span>
                    <span className="font-bold text-white">{plan.maxDatabases}</span>
                  </div>
                  <div className="flex justify-between text-zinc-300">
                    <span>AI & GPU Workloads</span>
                    <span className={plan.allowGpu ? 'text-purple-400 font-bold' : 'text-zinc-500'}>
                      {plan.allowGpu ? 'CUDA / Enabled' : 'CPU Only'}
                    </span>
                  </div>
                </div>

                {/* Feature Checklist */}
                <ul className="space-y-2 text-xs font-mono text-zinc-400 pt-2">
                  {plan.features.map((feat, idx) => (
                    <li key={idx} className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-cyan-400 shrink-0" />
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                className={`w-full py-2.5 rounded-xl font-semibold text-xs transition-all ${
                  isPopular
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-900/40'
                    : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-200'
                }`}
              >
                Assign Plan to Account
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
