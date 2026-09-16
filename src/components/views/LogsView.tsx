import React, { useState, useEffect } from 'react';
import {
  ScrollText, Search, RefreshCw, Trash2, Download, Filter,
  ShieldCheck, AlertTriangle, Info, Terminal
} from 'lucide-react';
import { Project, AuditLog } from '../../types';
import { api } from '../../services/api';

interface LogsViewProps {
  projects: Project[];
}

export const LogsView: React.FC<LogsViewProps> = ({ projects }) => {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [logs, setLogs] = useState<string[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [logType, setLogType] = useState<'app' | 'audit'>('app');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      if (logType === 'app') {
        const pId = selectedProjectId === 'all' ? undefined : selectedProjectId;
        const res = await api.getLogs(pId);
        setLogs(Array.isArray(res) ? (res as string[]) : []);
      } else {
        const res = await api.getLogs(undefined, 150);
        // If audit type returned
        setAuditLogs(Array.isArray(res) ? (res as any) : []);
      }
    } catch (err) {
      console.error('Failed to load logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, [selectedProjectId, logType]);

  const filteredLogs = logs.filter(l => l.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div className="space-y-4 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div>
          <h1 className="text-base font-bold text-white font-display">
            Real-Time Node Logs & Security Audit Trail
          </h1>
          <p className="text-xs text-zinc-400 font-mono">
            Direct standard output and security audit stream across all workloads.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <div className="flex rounded-lg bg-zinc-950 p-1 border border-zinc-800">
            <button
              onClick={() => setLogType('app')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                logType === 'app' ? 'bg-zinc-800 text-cyan-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              App Logs
            </button>
            <button
              onClick={() => setLogType('audit')}
              className={`px-3 py-1 rounded text-xs font-mono transition-colors ${
                logType === 'audit' ? 'bg-zinc-800 text-purple-400 font-bold' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Security Audit
            </button>
          </div>

          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-xl bg-zinc-900/60 border border-zinc-800">
        <div className="flex items-center space-x-2 w-full sm:w-auto">
          {logType === 'app' && (
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
            >
              <option value="all">All Managed Workloads</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-zinc-500" />
          <input
            type="text"
            placeholder="Search log output stream..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-cyan-500 font-mono"
          />
        </div>
      </div>

      {/* Log Console Box */}
      <div className="h-[520px] p-4 bg-zinc-950 rounded-2xl border border-zinc-800 font-mono text-xs text-zinc-200 overflow-y-auto space-y-1 shadow-2xl">
        {logType === 'app' ? (
          filteredLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 italic">No log entries found.</div>
          ) : (
            filteredLogs.map((log, idx) => (
              <div key={idx} className="leading-relaxed whitespace-pre-wrap hover:bg-zinc-900/60 px-2 py-0.5 rounded">
                {log}
              </div>
            ))
          )
        ) : (
          auditLogs.length === 0 ? (
            <div className="p-8 text-center text-zinc-600 italic">No audit records logged.</div>
          ) : (
            auditLogs.map((audit) => (
              <div key={audit.id} className="p-2 rounded bg-zinc-900/60 border border-zinc-850 flex items-center justify-between text-xs">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2">
                    <span className="font-bold text-cyan-400">{audit.action}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-zinc-800 text-zinc-400 uppercase">
                      {audit.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400">
                    User: {audit.userEmail || 'system'} {audit.ipAddress && `| IP: ${audit.ipAddress}`}
                  </p>
                </div>
                <span className="text-[10px] text-zinc-500">
                  {new Date(audit.createdAt).toLocaleTimeString()}
                </span>
              </div>
            ))
          )
        )}
      </div>
    </div>
  );
};
