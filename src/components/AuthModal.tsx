import React, { useState } from 'react';
import { X, Lock, Mail, User as UserIcon, Shield, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: User, token: string) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const res = await api.register({ email, password, name });
        api.setToken(res.token);
        onSuccess(res.user, res.token);
        onClose();
      } else {
        const res = await api.login({ email, password });
        api.setToken(res.token);
        onSuccess(res.user, res.token);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.login({ email: demoEmail, password: 'admin123456' });
      api.setToken(res.token);
      onSuccess(res.user, res.token);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md p-6 relative shadow-2xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-cyan-900/50">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-display">
            {isRegister ? 'Create Cloud Account' : 'Authenticate to Server Node'}
          </h2>
          <p className="text-xs text-zinc-400 mt-1">
            Access your 24/7 compute environments, workloads, and terminal sessions.
          </p>
        </div>

        {/* Quick Demo Logins Banner */}
        <div className="mb-4 p-3 rounded-lg bg-zinc-950 border border-zinc-800 space-y-2">
          <span className="text-[11px] font-mono text-zinc-400 uppercase tracking-wider block font-semibold">
            One-Click Developer Credentials
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@omnihost.cloud')}
              className="px-2.5 py-1.5 rounded-md bg-purple-950/60 border border-purple-800 text-[11px] text-purple-200 hover:bg-purple-900/80 font-mono text-left transition-colors"
            >
              👑 <strong>Super Admin</strong>
              <div className="text-[9px] text-purple-400">admin@omnihost.cloud</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('developer@omnihost.cloud')}
              className="px-2.5 py-1.5 rounded-md bg-cyan-950/60 border border-cyan-800 text-[11px] text-cyan-200 hover:bg-cyan-900/80 font-mono text-left transition-colors"
            >
              💻 <strong>Developer</strong>
              <div className="text-[9px] text-cyan-400">developer@omnihost.cloud</div>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isRegister && (
            <div>
              <label className="block text-xs font-mono text-zinc-300 mb-1">Full Name</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Alex Mercer"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="developer@omnihost.cloud"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono text-zinc-300 mb-1">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-2.5 text-zinc-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••••••"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-9 pr-3 py-2 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-semibold text-sm transition-all shadow-lg shadow-cyan-900/30 disabled:opacity-50"
          >
            {loading ? 'Authenticating...' : isRegister ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <button
            type="button"
            onClick={() => setIsRegister(!isRegister)}
            className="text-xs text-zinc-400 hover:text-cyan-400 transition-colors"
          >
            {isRegister ? 'Already have an account? Sign in' : "Don't have an account? Register"}
          </button>
        </div>
      </div>
    </div>
  );
};
