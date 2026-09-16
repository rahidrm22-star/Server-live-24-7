import React, { useState } from 'react';
import {
  Key, Plus, Copy, Check, Trash2, Shield, Eye, EyeOff
} from 'lucide-react';
import { ApiKey } from '../../types';
import { api } from '../../services/api';

interface ApiKeysViewProps {
  apiKeys: ApiKey[];
  onRefreshApiKeys: () => void;
  onCreateApiKey: (payload: { name: string; scopes?: string[] }) => Promise<ApiKey>;
  onRevokeApiKey: (id: string) => Promise<void>;
}

export const ApiKeysView: React.FC<ApiKeysViewProps> = ({
  apiKeys,
  onRefreshApiKeys,
  onCreateApiKey,
  onRevokeApiKey
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<string[]>(['projects:read', 'projects:write', 'deployments:create', 'ai:generate']);
  const [newlyCreatedKey, setNewlyCreatedKey] = useState<ApiKey | null>(null);
  const [copiedKey, setCopiedKey] = useState(false);

  const availableScopes = [
    { id: 'projects:read', label: 'Read Workload Telemetry & Metadata' },
    { id: 'projects:write', label: 'Start / Stop / Modify Workloads' },
    { id: 'deployments:create', label: 'Trigger Automated Deployments' },
    { id: 'terminal:execute', label: 'Execute Shell Terminal Commands' },
    { id: 'ai:generate', label: 'Invoke AI / PyTorch Inference API' },
    { id: 'logs:read', label: 'Stream Standard Output & Audit Logs' }
  ];

  const handleToggleScope = (scopeId: string) => {
    setScopes(prev => 
      prev.includes(scopeId) ? prev.filter(s => s !== scopeId) : [...prev, scopeId]
    );
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      const created = await onCreateApiKey({ name, scopes });
      setNewlyCreatedKey(created);
      setName('');
    } catch (err: any) {
      alert(err.message || 'Key creation failed');
    }
  };

  const handleCopy = (secret: string) => {
    navigator.clipboard.writeText(secret);
    setCopiedKey(true);
    setTimeout(() => setCopiedKey(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-white tracking-tight font-display">
            Programmatic API Keys & Machine Access
          </h1>
          <p className="text-xs text-zinc-400">
            Secure SHA-256 hashed API tokens for CI/CD pipelines, automated deployments, and CLI access.
          </p>
        </div>

        <button
          onClick={() => { setIsModalOpen(true); setNewlyCreatedKey(null); }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-cyan-900/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Generate API Key</span>
        </button>
      </div>

      {/* Secret Key Modal Warning after generation */}
      {newlyCreatedKey && (
        <div className="p-4 rounded-xl bg-purple-950/60 border border-purple-800 space-y-3 shadow-lg">
          <div className="flex items-center space-x-2 text-purple-300 font-bold text-xs font-mono">
            <Shield className="w-4 h-4" />
            <span>SAVE YOUR API SECRET NOW — IT WILL NEVER BE SHOWN AGAIN</span>
          </div>
          <div className="flex items-center space-x-2">
            <code className="flex-1 p-2.5 rounded-lg bg-zinc-950 border border-purple-900 text-xs font-mono text-purple-200 break-all">
              {newlyCreatedKey.rawSecretKey}
            </code>
            <button
              onClick={() => handleCopy(newlyCreatedKey.rawSecretKey!)}
              className="px-3 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-semibold flex items-center space-x-1 shrink-0"
            >
              {copiedKey ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey ? 'Copied' : 'Copy Key'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Key Table */}
      <div className="space-y-3">
        {apiKeys.length === 0 ? (
          <div className="p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 text-xs text-zinc-400 space-y-2">
            <Key className="w-8 h-8 text-zinc-600 mx-auto" />
            <p>No API keys generated yet.</p>
          </div>
        ) : (
          apiKeys.map((k) => (
            <div
              key={k.id}
              className="p-4 rounded-xl bg-zinc-900/70 border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Key className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-bold text-white font-mono">{k.name}</h3>
                  <code className="text-xs px-2 py-0.2 rounded bg-zinc-950 text-zinc-400 border border-zinc-800">
                    {k.keyPrefix}••••••••
                  </code>
                </div>
                <div className="flex items-center flex-wrap gap-1 pt-1">
                  {k.scopes.map(s => (
                    <span key={s} className="px-1.5 py-0.2 text-[9px] font-mono bg-zinc-800 text-zinc-400 rounded">
                      {s}
                    </span>
                  ))}
                </div>
                <p className="text-[11px] text-zinc-500 font-mono">
                  Created: {new Date(k.createdAt).toLocaleDateString()} {k.lastUsedAt && `| Last used: ${new Date(k.lastUsedAt).toLocaleDateString()}`}
                </p>
              </div>

              <button
                onClick={() => onRevokeApiKey(k.id)}
                className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400 text-xs font-mono border border-zinc-700 transition-colors self-start sm:self-auto"
              >
                Revoke Key
              </button>
            </div>
          ))
        )}
      </div>

      {/* Generate Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-lg space-y-4">
            <h2 className="text-base font-bold text-white font-display">Generate New API Token</h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Token Name / Service Description</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. GitHub Actions CI Deploy Key"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-2">Assigned Permissions & Scopes</label>
                <div className="space-y-2">
                  {availableScopes.map(sc => (
                    <label key={sc.id} className="flex items-center space-x-2 text-xs font-mono text-zinc-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={scopes.includes(sc.id)}
                        onChange={() => handleToggleScope(sc.id)}
                        className="rounded bg-zinc-950 border-zinc-700 text-cyan-500"
                      />
                      <span><strong>{sc.id}</strong> — {sc.label}</span>
                    </label>
                  ))}
                </div>
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
                  Generate Token
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
