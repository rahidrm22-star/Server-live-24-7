import React from 'react';
import {
  ServerCog, CheckCircle2, XCircle, Cpu, HardDrive, Terminal,
  Copy, Check, ExternalLink, ShieldCheck, Download, Zap
} from 'lucide-react';
import { HostCapabilityReport, SystemMetricSnapshot } from '../../types';

interface DiagnosticsViewProps {
  capabilities: HostCapabilityReport | null;
  metrics: SystemMetricSnapshot | null;
  onRefreshCapabilities: () => void;
}

export const DiagnosticsView: React.FC<DiagnosticsViewProps> = ({
  capabilities,
  metrics,
  onRefreshCapabilities
}) => {
  const [copiedInstall, setCopiedInstall] = React.useState(false);

  const installCommand = `chmod +x install.sh && sudo ./install.sh`;

  const handleCopy = () => {
    navigator.clipboard.writeText(installCommand);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Host Diagnostics & 24/7 Deployment Guide
          </h1>
          <p className="text-xs text-zinc-400">
            Hardware runtime validation, container engine readiness, and standalone server installation package.
          </p>
        </div>

        <button
          onClick={onRefreshCapabilities}
          className="px-3.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-mono flex items-center space-x-1.5 self-start sm:self-auto"
        >
          <span>Re-probe Host</span>
        </button>
      </div>

      {/* Production Deployment Instructions Card */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 space-y-4 shadow-xl">
        <div className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h2 className="text-base font-bold text-white font-display">
            How to Deploy on Any Standalone Linux VPS or Dedicated Server
          </h2>
        </div>

        <p className="text-xs text-zinc-300 leading-relaxed max-w-3xl">
          This platform is completely self-contained and packaged for immediate deployment to Ubuntu, Debian, CentOS, RHEL, or Alpine Linux servers. Run the automated installer to configure systemd 24/7 background supervision, firewall rules, and reverse proxy routing.
        </p>

        {/* Copy command box */}
        <div className="flex items-center space-x-2">
          <code className="flex-1 p-3 bg-zinc-950 rounded-xl border border-zinc-800 text-xs font-mono text-cyan-400">
            {installCommand}
          </code>
          <button
            onClick={handleCopy}
            className="px-4 py-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors shrink-0"
          >
            {copiedInstall ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            <span>{copiedInstall ? 'Copied' : 'Copy Script'}</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs font-mono text-zinc-400">
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850">
            <strong className="text-white block mb-1">1. Systemd 24/7 Service</strong>
            <span>`omnihost.service` auto-starts on host reboot with crash recovery.</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850">
            <strong className="text-white block mb-1">2. Sandboxed Jails</strong>
            <span>Restricted non-root execution per project storage directory.</span>
          </div>
          <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850">
            <strong className="text-white block mb-1">3. Reverse Proxy & SSL</strong>
            <span>Built-in dynamic HTTP ingress and Let's Encrypt automated TLS.</span>
          </div>
        </div>
      </div>

      {/* Host Specs & Detected Runtimes */}
      {capabilities && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Host OS & Engine Capabilities */}
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              Host Environment Profile
            </h3>

            <div className="space-y-2.5 text-xs font-mono">
              <div className="flex justify-between p-2 rounded bg-zinc-950 text-zinc-300">
                <span className="text-zinc-500">Operating System</span>
                <span className="font-bold text-white">{capabilities.hostOs}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-zinc-950 text-zinc-300">
                <span className="text-zinc-500">Kernel Version</span>
                <span className="text-zinc-300">{capabilities.kernel}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-zinc-950 text-zinc-300">
                <span className="text-zinc-500">Architecture</span>
                <span className="text-cyan-400 font-bold">{capabilities.arch}</span>
              </div>
              <div className="flex justify-between p-2 rounded bg-zinc-950 text-zinc-300">
                <span className="text-zinc-500">Node.js Engine</span>
                <span className="text-emerald-400 font-bold">{capabilities.nodeVersion}</span>
              </div>
            </div>

            {/* System Service Checklist */}
            <div className="pt-2 border-t border-zinc-800 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Docker Container Engine</span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Available</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">Linux Systemd Supervision</span>
                <span className="flex items-center space-x-1 text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Active</span>
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-zinc-400">NVIDIA CUDA GPU Accelerator</span>
                <span className="flex items-center space-x-1 text-purple-400">
                  {capabilities.hasGpu ? <CheckCircle2 className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                  <span>{capabilities.hasGpu ? 'CUDA Driver Ready' : 'High-Perf CPU Mode'}</span>
                </span>
              </div>
            </div>
          </div>

          {/* Supported Language Runtimes */}
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4">
            <h3 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              Installed Language Runtimes & Compilers
            </h3>

            <div className="space-y-2">
              {capabilities.availableRuntimes.map((rt) => (
                <div
                  key={rt.runtime}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs font-mono"
                >
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-white">{rt.runtime}</span>
                  </div>
                  <span className="text-zinc-400">{rt.version || 'installed'}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
