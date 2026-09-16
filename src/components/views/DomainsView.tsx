import React, { useState } from 'react';
import {
  Globe, Plus, ShieldCheck, CheckCircle2, Clock, AlertCircle,
  ExternalLink, Trash2, RefreshCw, Lock
} from 'lucide-react';
import { ManagedDomain, Project } from '../../types';
import { api } from '../../services/api';

interface DomainsViewProps {
  domains: ManagedDomain[];
  projects: Project[];
  onRefreshDomains: () => void;
  onCreateDomain: (payload: { projectId: string; domainName: string; isCustom: boolean }) => Promise<void>;
  onDeleteDomain: (id: string) => Promise<void>;
}

export const DomainsView: React.FC<DomainsViewProps> = ({
  domains,
  projects,
  onRefreshDomains,
  onCreateDomain,
  onDeleteDomain
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [domainName, setDomainName] = useState('');
  const [projectId, setProjectId] = useState(projects[0]?.id || '');
  const [isCustom, setIsCustom] = useState(true);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!domainName.trim()) return;

    try {
      await onCreateDomain({
        projectId: projectId || projects[0]?.id || 'proj_global',
        domainName: domainName.trim(),
        isCustom
      });
      setIsModalOpen(false);
      setDomainName('');
    } catch (err: any) {
      alert(err.message || 'Domain registration failed');
    }
  };

  const handleVerify = async (id: string) => {
    try {
      await api.verifyDomain(id);
      onRefreshDomains();
    } catch (err: any) {
      alert(err.message || 'Verification failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Domains, SSL Certificates & Ingress Routing
          </h1>
          <p className="text-xs text-zinc-400">
            Automated Let's Encrypt SSL provisioning, reverse proxy host mapping, and custom CNAME routing.
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Custom Domain</span>
        </button>
      </div>

      <div className="space-y-3">
        {domains.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <Globe className="w-8 h-8 text-zinc-600 mx-auto" />
            <p>No custom domains registered yet.</p>
          </div>
        ) : (
          domains.map((dom) => {
            const project = projects.find(p => p.id === dom.projectId);

            return (
              <div
                key={dom.id}
                className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-2">
                    <Globe className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white font-mono">{dom.domainName}</h3>
                    <span className="px-2 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {dom.isCustom ? 'CUSTOM CNAME' : 'NODE SUBDOMAIN'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 font-mono">
                    Routes to: <strong>{project ? project.name : dom.projectId}</strong> (Port :{project?.assignedInternalPort || 3000})
                  </p>
                  <p className="text-[11px] text-zinc-500 font-mono">
                    CNAME Target: <code className="text-cyan-400">{dom.dnsTarget}</code>
                  </p>
                </div>

                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-1.5 px-2.5 py-1 rounded-md bg-emerald-950/60 border border-emerald-800 text-xs font-mono text-emerald-300">
                    <Lock className="w-3.5 h-3.5" />
                    <span>SSL Active (Let's Encrypt)</span>
                  </div>

                  <button
                    onClick={() => handleVerify(dom.id)}
                    title="Verify DNS & Cert"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDeleteDomain(dom.id)}
                    title="Remove Domain"
                    className="p-2 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Domain Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-white font-display">Attach Domain to Workload</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Domain Name *</label>
                <input
                  type="text"
                  required
                  placeholder="app.mycompany.com"
                  value={domainName}
                  onChange={(e) => setDomainName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Target Workload</label>
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

              <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-850 text-xs font-mono text-zinc-400 space-y-1">
                <span className="text-zinc-300 font-bold block">DNS Setup Instruction:</span>
                <p>Create a <code>CNAME</code> record pointing to <code>node1.omnihost.cloud</code>.</p>
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
                  Save & Request SSL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
