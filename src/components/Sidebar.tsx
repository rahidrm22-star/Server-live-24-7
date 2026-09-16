import React from 'react';
import {
  LayoutDashboard,
  Box,
  Server,
  Cpu,
  Gamepad2,
  Rocket,
  Terminal,
  FolderTree,
  Database,
  Globe,
  Radio,
  ScrollText,
  Archive,
  Key,
  Layers,
  ShieldAlert,
  ServerCog,
  ChevronRight
} from 'lucide-react';
import { User } from '../types';

interface SidebarProps {
  currentView: string;
  onSelectView: (view: string) => void;
  user: User | null;
  runningCount: number;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onSelectView,
  user,
  runningCount
}) => {
  const isSuperAdmin = user?.role === 'superadmin' || user?.role === 'admin';

  const menuSections = [
    {
      title: 'PLATFORM COMPUTE',
      items: [
        { id: 'dashboard', label: 'Overview & Metrics', icon: LayoutDashboard },
        { id: 'servers', label: 'Servers & Workers', icon: Server, accent: 'text-cyan-400' },
        { id: 'projects', label: 'Workloads & Services', icon: Box, badge: runningCount > 0 ? `${runningCount} active` : undefined },
        { id: 'ai', label: 'AI & Compute Lab', icon: Cpu, accent: 'text-purple-400' },
        { id: 'gameservers', label: 'Game Servers', icon: Gamepad2, accent: 'text-emerald-400' },
        { id: 'deployments', label: 'Deployment Pipeline', icon: Rocket }
      ]
    },
    {
      title: 'OPERATIONS & TOOLS',
      items: [
        { id: 'terminal', label: 'Web Terminal', icon: Terminal },
        { id: 'files', label: 'File Manager & IDE', icon: FolderTree },
        { id: 'databases', label: 'Managed Databases', icon: Database },
        { id: 'domains', label: 'Domains & Routing', icon: Globe },
        { id: 'ports', label: 'Ports & Network Map', icon: Radio },
        { id: 'logs', label: 'Logs & Audit Trail', icon: ScrollText },
        { id: 'backups', label: 'Backups & Snapshots', icon: Archive }
      ]
    },
    {
      title: 'ACCESS & GOVERNANCE',
      items: [
        { id: 'apikeys', label: 'API Keys & Tokens', icon: Key },
        { id: 'plans', label: 'Plans & Resource Quotas', icon: Layers },
        { id: 'diagnostics', label: 'Node Hardware & Guide', icon: ServerCog }
      ]
    }
  ];

  if (isSuperAdmin) {
    menuSections.push({
      title: 'ADMINISTRATION',
      items: [
        { id: 'admin', label: 'Admin Control Center', icon: ShieldAlert, accent: 'text-amber-400' }
      ]
    });
  }

  return (
    <aside className="w-64 bg-zinc-950 border-r border-zinc-850 flex flex-col justify-between overflow-y-auto shrink-0 select-none">
      <div className="py-4 px-3 space-y-6">
        {menuSections.map((section, idx) => (
          <div key={idx} className="space-y-1">
            <h3 className="px-3 text-[10px] font-mono font-bold tracking-wider text-zinc-400 uppercase">
              {section.title}
            </h3>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = currentView === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onSelectView(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-zinc-800 text-white shadow-sm border border-zinc-700/80 font-semibold'
                        : 'text-zinc-300 hover:text-zinc-100 hover:bg-zinc-900/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center space-x-2.5 truncate">
                      <Icon className={`w-4 h-4 shrink-0 ${item.accent || (isActive ? 'text-cyan-400' : 'text-zinc-400')}`} />
                      <span className="truncate">{item.label}</span>
                    </div>

                    {item.badge && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/60">
                        {item.badge}
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Host Node Footer Badge */}
      <div className="p-3 border-t border-zinc-900 bg-zinc-950/80">
        <div className="p-2.5 rounded-lg bg-zinc-900/60 border border-zinc-800 text-[11px] font-mono space-y-1">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="text-zinc-400">HOST STATUS</span>
            <span className="flex items-center text-emerald-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping inline-block mr-1.5" />
              ONLINE 24/7
            </span>
          </div>
          <div className="flex items-center justify-between text-[10px] text-zinc-400">
            <span>Linux Node</span>
            <span>v1.0.0-prod</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
