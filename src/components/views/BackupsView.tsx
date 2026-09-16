import React, { useState } from 'react';
import {
  Archive, Plus, RotateCcw, Trash2, Download, CheckCircle2,
  HardDrive, RefreshCw
} from 'lucide-react';
import { BackupRecord, Project } from '../../types';
import { api } from '../../services/api';

interface BackupsViewProps {
  backups: BackupRecord[];
  projects: Project[];
  onRefreshBackups: () => void;
  onCreateBackup: (projectId: string, backupType: string) => Promise<void>;
  onRestoreBackup: (backupId: string) => Promise<void>;
  onDeleteBackup: (backupId: string) => Promise<void>;
}

export const BackupsView: React.FC<BackupsViewProps> = ({
  backups,
  projects,
  onRefreshBackups,
  onCreateBackup,
  onRestoreBackup,
  onDeleteBackup
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [backupType, setBackupType] = useState('full');
  const [isProcessing, setIsProcessing] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!projectId) return;

    setIsProcessing(true);
    try {
      await onCreateBackup(projectId, backupType);
      setIsModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Backup failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRestore = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to restore snapshot "${name}"? This will overwrite the current live filesystem.`)) return;

    try {
      await onRestoreBackup(id);
      alert('Snapshot restored successfully.');
    } catch (err: any) {
      alert(err.message || 'Restore failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Disaster Recovery & Persistent Snapshots
          </h1>
          <p className="text-xs text-zinc-400">
            Full tarball filesystem backups, database dumps, and one-click live node restoration.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Snapshot</span>
        </button>
      </div>

      <div className="space-y-3">
        {backups.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <Archive className="w-8 h-8 text-zinc-600 mx-auto" />
            <p>No backups generated yet.</p>
          </div>
        ) : (
          backups.map((b) => (
            <div
              key={b.id}
              className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Archive className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono">{b.name}</h3>
                  <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 uppercase">
                    {b.backupType}
                  </span>
                </div>
                <p className="text-xs text-zinc-400 font-mono">
                  Project: <strong>{b.projectName}</strong> | Size: {b.sizeMB.toFixed(2)} MB
                </p>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Created: {new Date(b.createdAt).toLocaleString()}
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => handleRestore(b.id, b.name)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700 flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Restore</span>
                </button>

                <button
                  onClick={() => onDeleteBackup(b.id)}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-white font-display">Generate Project Snapshot</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Target Workload *</label>
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

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Snapshot Type</label>
                <select
                  value={backupType}
                  onChange={(e) => setBackupType(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                >
                  <option value="full">Full Archive (Filesystem + Config + Code)</option>
                  <option value="database_only">Database Dump Only</option>
                  <option value="files_only">Static Storage Files Only</option>
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
                  disabled={isProcessing}
                  className="px-5 py-2 bg-cyan-600 rounded-lg text-xs font-semibold text-white"
                >
                  {isProcessing ? 'Creating Tarball...' : 'Create Snapshot'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
