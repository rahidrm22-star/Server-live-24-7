import React from 'react';
import { 
  Server, Cpu, HardDrive, ShieldCheck, Activity, 
  LogOut, User as UserIcon, RefreshCw, Terminal, Bell, ExternalLink
} from 'lucide-react';
import { User, SystemMetricSnapshot } from '../types';

interface NavbarProps {
  user: User | null;
  metrics: SystemMetricSnapshot | null;
  onRefreshMetrics: () => void;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSelectView: (view: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  metrics,
  onRefreshMetrics,
  onOpenAuth,
  onLogout,
  onSelectView
}) => {
  return (
    <header className="h-16 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md px-4 sm:px-6 flex items-center justify-between sticky top-0 z-30">
      {/* Brand & Node Identity */}
      <div className="flex items-center space-x-3">
        <div 
          onClick={() => onSelectView('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer group"
        >
          <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-950/50 group-hover:scale-105 transition-transform">
            <Server className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-zinc-100 font-display">ComputeHub</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                UNIVERSAL 24/7
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-mono hidden sm:block">Multi-Worker Distributed Server Platform</p>
          </div>
        </div>
      </div>

      {/* Live Hardware Telemetry Pills */}
      {metrics && (
        <div className="hidden lg:flex items-center space-x-2">
          {/* CPU Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-zinc-400">CPU</span>
            <span className="text-zinc-200 font-medium">{metrics.cpu.usagePercent}%</span>
          </div>

          {/* RAM Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
            <Activity className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-zinc-400">RAM</span>
            <span className="text-zinc-200 font-medium">
              {(metrics.memory.usedMB / 1024).toFixed(1)}/{(metrics.memory.totalMB / 1024).toFixed(1)} GB
            </span>
          </div>

          {/* Disk Pill */}
          <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs font-mono">
            <HardDrive className="w-3.5 h-3.5 text-amber-400" />
            <span className="text-zinc-400">SSD</span>
            <span className="text-zinc-200 font-medium">{metrics.disk.usagePercent}%</span>
          </div>

          {/* GPU Status Pill */}
          {metrics.gpu?.available && (
            <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-zinc-900/80 border border-zinc-800 text-xs font-mono text-purple-400">
              <span className="w-2 h-2 rounded-full bg-purple-500 animate-pulse" />
              <span>CUDA {metrics.gpu.utilizationPercent}%</span>
            </div>
          )}

          <button
            onClick={onRefreshMetrics}
            title="Refresh Real-time Metrics"
            className="p-1.5 text-zinc-400 hover:text-zinc-200 rounded-md hover:bg-zinc-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* User Actions & Profile */}
      <div className="flex items-center space-x-3">
        <button
          onClick={() => onSelectView('terminal')}
          className="hidden sm:flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 border border-zinc-700 text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors"
        >
          <Terminal className="w-3.5 h-3.5 text-cyan-400" />
          <span>Quick Terminal</span>
        </button>

        {user ? (
          <div className="flex items-center space-x-3">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-zinc-700 flex items-center justify-center text-xs font-bold text-zinc-200">
                {user.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="hidden md:block text-left">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-medium text-zinc-200 leading-tight">{user.name}</span>
                  {user.role === 'superadmin' && (
                    <span className="px-1 py-0.2 rounded text-[9px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
                      ROOT
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-zinc-400 font-mono">{user.email}</p>
              </div>
            </div>

            <button
              onClick={onLogout}
              title="Logout Session"
              className="p-2 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-900 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            onClick={onOpenAuth}
            className="flex items-center space-x-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-sm"
          >
            <UserIcon className="w-3.5 h-3.5" />
            <span>Sign In</span>
          </button>
        )}
      </div>
    </header>
  );
};
