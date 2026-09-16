import React, { useState } from 'react';
import {
  Database, Plus, Copy, Check, Trash2, ExternalLink,
  ShieldCheck, RefreshCw, HardDrive
} from 'lucide-react';
import { ManagedDatabase, Project } from '../../types';
import { api } from '../../services/api';

interface DatabasesViewProps {
  databases: ManagedDatabase[];
  projects: Project[];
  onRefreshDatabases: () => void;
  onCreateDatabase: (payload: { projectId: string; name: string; type: string }) => Promise<void>;
  onDeleteDatabase: (id: string) => Promise<void>;
}

export const DatabasesView: React.FC<DatabasesViewProps> = ({
  databases,
  projects,
  onRefreshDatabases,
  onCreateDatabase,
  onDeleteDatabase
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [name, setName] = useState('');
  const [dbType, setDbType] = useState<'postgresql' | 'mysql' | 'redis' | 'sqlite'>('postgresql');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      await onCreateDatabase({
        projectId: projectId || projects[0]?.id || 'proj_global',
        name,
        type: dbType
      });
      setIsModalOpen(false);
      setName('');
    } catch (err: any) {
      alert(err.message || 'Database creation failed');
    }
  };

  const handleCopyUri = (uri: string, id: string) => {
    navigator.clipboard.writeText(uri);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Managed Databases & Cache Stores
          </h1>
          <p className="text-xs text-zinc-400">
            Dedicated PostgreSQL 16, MySQL 8, Redis 7, and SQLite engines with automated credential generation.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Provision Database</span>
        </button>
      </div>

      {/* Database Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {databases.length === 0 ? (
          <div className="col-span-full p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
            <Database className="w-10 h-10 text-zinc-600 mx-auto" />
            <p className="text-xs text-zinc-400">No managed databases provisioned.</p>
          </div>
        ) : (
          databases.map((db) => (
            <div
              key={db.id}
              className="p-5 rounded-xl bg-zinc-900/70 border border-zinc-800 space-y-4 hover:border-zinc-700 transition-all flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400">
                      {db.type}
                    </span>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-emerald-950 text-emerald-300 border border-emerald-800">
                    {db.status.toUpperCase()}
                  </span>
                </div>

                <h3 className="text-base font-bold text-white font-mono">{db.name}</h3>
                <p className="text-xs text-zinc-400 font-mono">DB: {db.databaseName} (User: {db.username})</p>
              </div>

              {/* Connection URI Box */}
              <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-850 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-mono text-zinc-400">
                  <span>Connection URI:</span>
                  <button
                    onClick={() => handleCopyUri(db.connectionUri, db.id)}
                    className="text-cyan-400 hover:text-cyan-300 flex items-center space-x-1"
                  >
                    {copiedId === db.id ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <code className="block text-[10px] font-mono text-zinc-300 break-all bg-zinc-900 p-2 rounded">
                  {db.connectionUri}
                </code>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs font-mono text-zinc-500">
                <span>Port: :{db.port}</span>
                <button
                  onClick={() => onDeleteDatabase(db.id)}
                  className="text-zinc-500 hover:text-red-400 p-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Provision Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-white font-display">Provision Managed Database</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Database Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. production_pg_db"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Engine Type</label>
                <select
                  value={dbType}
                  onChange={(e) => setDbType(e.target.value as any)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                >
                  <option value="postgresql">PostgreSQL 16 (Relational ACID)</option>
                  <option value="mysql">MySQL 8.0</option>
                  <option value="redis">Redis 7 (In-Memory Key/Value)</option>
                  <option value="sqlite">SQLite 3 (Embedded File)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Bind to Workload</label>
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-cyan-600 rounded-lg text-xs font-semibold text-white"
                >
                  Provision Database
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
