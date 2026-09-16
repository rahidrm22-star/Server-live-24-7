import React, { useState } from 'react';
import {
  Rocket, UploadCloud, GitBranch, RotateCcw, CheckCircle2,
  Clock, AlertCircle, RefreshCw, FileText, ChevronRight
} from 'lucide-react';
import { Deployment, Project } from '../../types';
import { api } from '../../services/api';

interface DeploymentsViewProps {
  deployments: Deployment[];
  projects: Project[];
  onRefreshDeployments: () => void;
  onDeployZip: (projectId: string, file: File, message?: string) => Promise<void>;
  onDeployGit: (payload: { projectId: string; gitRepoUrl: string; gitBranch?: string; commitMessage?: string }) => Promise<void>;
}

export const DeploymentsView: React.FC<DeploymentsViewProps> = ({
  deployments,
  projects,
  onRefreshDeployments,
  onDeployZip,
  onDeployGit
}) => {
  const [selectedDeployment, setSelectedDeployment] = useState<Deployment | null>(deployments[0] || null);

  // Deploy ZIP state
  const [isZipModalOpen, setIsZipModalOpen] = useState(false);
  const [zipProjectId, setZipProjectId] = useState(projects[0]?.id || '');
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipMessage, setZipMessage] = useState('Production deployment update');
  const [isUploading, setIsUploading] = useState(false);

  // Deploy Git state
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);
  const [gitProjectId, setGitProjectId] = useState(projects[0]?.id || '');
  const [gitRepoUrl, setGitRepoUrl] = useState('https://github.com/expressjs/express.git');
  const [gitBranch, setGitBranch] = useState('main');
  const [gitMessage, setGitMessage] = useState('Deploy latest commit from main');

  const handleZipSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!zipProjectId || !zipFile) return;

    setIsUploading(true);
    try {
      await onDeployZip(zipProjectId, zipFile, zipMessage);
      setIsZipModalOpen(false);
      setZipFile(null);
    } catch (err: any) {
      alert(err.message || 'ZIP deployment failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleGitSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gitProjectId || !gitRepoUrl) return;

    setIsUploading(true);
    try {
      await onDeployGit({
        projectId: gitProjectId,
        gitRepoUrl,
        gitBranch,
        commitMessage: gitMessage
      });
      setIsGitModalOpen(false);
    } catch (err: any) {
      alert(err.message || 'Git deployment failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleRollback = async (deployment: Deployment) => {
    if (!confirm(`Are you sure you want to rollback to deployment v${deployment.version}?`)) return;

    try {
      await api.rollbackDeployment(deployment.id, deployment.projectId);
      onRefreshDeployments();
    } catch (err: any) {
      alert(err.message || 'Rollback failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Deployment Pipelines & Releases
          </h1>
          <p className="text-xs text-zinc-400">
            Automated build stages, ZIP extractions, Git deployments, and instant version rollback.
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setIsZipModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center space-x-1.5 transition-colors border border-zinc-700"
          >
            <UploadCloud className="w-4 h-4 text-cyan-400" />
            <span>Upload ZIP</span>
          </button>
          <button
            onClick={() => setIsGitModalOpen(true)}
            className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-semibold flex items-center space-x-1.5 shadow-lg shadow-cyan-900/30 transition-all"
          >
            <GitBranch className="w-4 h-4" />
            <span>Deploy Git Repo</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Deployment List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              Deployment History ({deployments.length})
            </span>
            <button
              onClick={onRefreshDeployments}
              className="p-1 text-zinc-400 hover:text-zinc-200"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-2">
            {deployments.length === 0 ? (
              <div className="p-8 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-500">
                No deployments recorded yet.
              </div>
            ) : (
              deployments.map((dep) => {
                const project = projects.find(p => p.id === dep.projectId);
                const isSelected = selectedDeployment?.id === dep.id;

                return (
                  <div
                    key={dep.id}
                    onClick={() => setSelectedDeployment(dep)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all space-y-2 ${
                      isSelected
                        ? 'bg-zinc-800/90 border-cyan-500 shadow-md'
                        : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold font-mono text-white">v{dep.version}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                          {dep.sourceType.toUpperCase()}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                        dep.status === 'active' 
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' 
                          : dep.status === 'failed'
                          ? 'bg-red-950 text-red-300 border border-red-800'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {dep.status.toUpperCase()}
                      </span>
                    </div>

                    <div className="text-xs text-zinc-300 font-mono line-clamp-1">
                      {dep.commitMessage || 'Automated deployment'}
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-zinc-500 font-mono pt-1 border-t border-zinc-850">
                      <span>{project ? project.name : dep.projectId}</span>
                      <span>{new Date(dep.startedAt).toLocaleTimeString()}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right 2 cols: Live Deployment Log Viewer */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white font-mono flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span>
                    Build & Deployment Log Stream {selectedDeployment ? `(v${selectedDeployment.version})` : ''}
                  </span>
                </h3>
                <p className="text-xs text-zinc-500 font-mono mt-0.5">
                  ID: {selectedDeployment?.id || 'none'}
                </p>
              </div>

              {selectedDeployment && selectedDeployment.status !== 'active' && (
                <button
                  onClick={() => handleRollback(selectedDeployment)}
                  className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-200 border border-zinc-700 flex items-center space-x-1.5 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Rollback to v{selectedDeployment.version}</span>
                </button>
              )}
            </div>

            {/* Log terminal box */}
            <div className="h-96 p-4 bg-zinc-950 rounded-xl border border-zinc-850 font-mono text-xs text-zinc-200 overflow-y-auto space-y-1.5">
              {selectedDeployment && selectedDeployment.logs.length > 0 ? (
                selectedDeployment.logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed whitespace-pre-wrap">
                    {log}
                  </div>
                ))
              ) : (
                <div className="text-zinc-500 italic p-4 text-center">
                  Select a deployment from the left to inspect build pipeline logs.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ZIP UPLOAD MODAL */}
      {isZipModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white font-display flex items-center space-x-2">
                <UploadCloud className="w-5 h-5 text-cyan-400" />
                <span>Upload Project ZIP Archive</span>
              </h2>
              <button onClick={() => setIsZipModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleZipSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Target Workload *</label>
                <select
                  value={zipProjectId}
                  onChange={(e) => setZipProjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.runtime})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Select .ZIP Archive *</label>
                <input
                  type="file"
                  accept=".zip"
                  required
                  onChange={(e) => setZipFile(e.target.files?.[0] || null)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2 text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-600 file:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Release / Commit Note</label>
                <input
                  type="text"
                  value={zipMessage}
                  onChange={(e) => setZipMessage(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsZipModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  {isUploading ? 'Extracting & Deploying...' : 'Deploy to Node'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* GIT DEPLOY MODAL */}
      {isGitModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 relative shadow-2xl">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-base font-bold text-white font-display flex items-center space-x-2">
                <GitBranch className="w-5 h-5 text-cyan-400" />
                <span>Deploy from Git Repository</span>
              </h2>
              <button onClick={() => setIsGitModalOpen(false)} className="text-zinc-400 hover:text-white">✕</button>
            </div>

            <form onSubmit={handleGitSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Target Workload *</label>
                <select
                  value={gitProjectId}
                  onChange={(e) => setGitProjectId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                >
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.runtime})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Git Repository URL (HTTPS) *</label>
                <input
                  type="text"
                  required
                  value={gitRepoUrl}
                  onChange={(e) => setGitRepoUrl(e.target.value)}
                  placeholder="https://github.com/org/repo.git"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Branch</label>
                  <input
                    type="text"
                    value={gitBranch}
                    onChange={(e) => setGitBranch(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Commit Message</label>
                  <input
                    type="text"
                    value={gitMessage}
                    onChange={(e) => setGitMessage(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsGitModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-zinc-800 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploading}
                  className="px-5 py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
                >
                  {isUploading ? 'Cloning & Building...' : 'Trigger Git Pipeline'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
