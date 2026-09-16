import React from 'react';
import {
  Radio, Globe, Shield, ExternalLink, Activity, Server
} from 'lucide-react';
import { Project } from '../../types';

interface PortsViewProps {
  projects: Project[];
}

export const PortsView: React.FC<PortsViewProps> = ({ projects }) => {
  return (
    <div className="space-y-6 pb-12">
      <div>
        <h1 className="text-xl font-bold text-white tracking-tight font-display">
          Network Ports & Reverse Proxy Map
        </h1>
        <p className="text-xs text-zinc-400">
          Internal container port allocations, TCP/UDP sockets, and public reverse proxy routing.
        </p>
      </div>

      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
            Active Workload Network Bindings
          </h2>
          <span className="text-xs font-mono text-zinc-400">{projects.length} Total Ports Allocated</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                <th className="pb-3 font-semibold">WORKLOAD</th>
                <th className="pb-3 font-semibold">TYPE</th>
                <th className="pb-3 font-semibold">INTERNAL PORT</th>
                <th className="pb-3 font-semibold">PROTOCOL</th>
                <th className="pb-3 font-semibold">REVERSE PROXY INGRESS</th>
                <th className="pb-3 font-semibold">STATUS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {projects.map((p) => (
                <tr key={p.id} className="hover:bg-zinc-850/50 transition-colors">
                  <td className="py-3 font-bold text-white">{p.name}</td>
                  <td className="py-3 uppercase text-zinc-400 text-[11px]">{p.workloadType}</td>
                  <td className="py-3 text-cyan-400 font-bold">:{p.assignedInternalPort}</td>
                  <td className="py-3 text-zinc-300">
                    {p.workloadType === 'gameserver' ? 'TCP / UDP' : 'HTTP / WebSocket'}
                  </td>
                  <td className="py-3">
                    <a
                      href={p.publicUrl || `/proxy/${p.subdomain}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                    >
                      <span>/proxy/{p.subdomain}</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                      p.status === 'running' ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {p.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
