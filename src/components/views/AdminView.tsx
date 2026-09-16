import React, { useState, useEffect } from 'react';
import {
  ShieldAlert, UserPlus, Trash2, Edit3, CheckCircle2, Lock,
  RefreshCw, Shield, AlertTriangle, UserCheck
} from 'lucide-react';
import { User, UserRole } from '../../types';
import { api } from '../../services/api';

interface AdminViewProps {
  currentUser: User | null;
}

export const AdminView: React.FC<AdminViewProps> = ({ currentUser }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // New user form state
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('admin123456');
  const [role, setRole] = useState<UserRole>('user');
  const [planId, setPlanId] = useState('pro');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await api.getAdminUsers();
      setUsers(res || []);
    } catch (err) {
      console.error('Failed to load admin users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createAdminUser({
        email,
        name,
        role,
        planId
      });
      setIsCreateModalOpen(false);
      setEmail('');
      setName('');
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    }
  };

  const handleToggleStatus = async (user: User) => {
    const nextStatus = user.status === 'active' ? 'suspended' : 'active';
    try {
      await api.updateAdminUser(user.id, { status: nextStatus });
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'Status update failed');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user and all associated workloads?')) return;
    try {
      await api.deleteAdminUser(userId);
      fetchUsers();
    } catch (err: any) {
      alert(err.message || 'User deletion failed');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-zinc-950 border border-amber-900/50 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              Super Admin & User Governance Center
            </h1>
          </div>
          <p className="text-xs text-zinc-400">
            Provision user accounts, assign cluster resource quotas, enforce security policies, and manage global processes.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center space-x-2 shadow-lg shadow-amber-950/50 transition-all"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create User Account</span>
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="p-5 rounded-2xl bg-zinc-900/80 border border-zinc-800 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-bold font-mono text-zinc-300 uppercase tracking-wider">
            All Registered Platform Accounts ({users.length})
          </h2>
          <button onClick={fetchUsers} className="text-zinc-400 hover:text-white p-1">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-[11px]">
                <th className="pb-3 font-semibold">USER</th>
                <th className="pb-3 font-semibold">ROLE</th>
                <th className="pb-3 font-semibold">PLAN</th>
                <th className="pb-3 font-semibold">STATUS</th>
                <th className="pb-3 font-semibold">CREATED</th>
                <th className="pb-3 font-semibold text-right">ACTIONS</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-850">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-zinc-850/50 transition-colors">
                  <td className="py-3">
                    <div className="font-bold text-white">{u.name}</div>
                    <div className="text-[11px] text-zinc-400">{u.email}</div>
                  </td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'superadmin' ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-zinc-800 text-zinc-300'
                    }`}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-cyan-400 font-semibold uppercase">{u.planId}</td>
                  <td className="py-3">
                    <span className={`px-2 py-0.5 rounded text-[10px] ${
                      u.status === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-red-950 text-red-300'
                    }`}>
                      {u.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-3 text-zinc-500 text-[11px]">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleToggleStatus(u)}
                        className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-[11px]"
                      >
                        {u.status === 'active' ? 'Suspend' : 'Activate'}
                      </button>
                      {u.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(u.id)}
                          className="p-1 text-zinc-500 hover:text-red-400"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE USER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-base font-bold text-white font-display">Create Platform User Account</h2>
            <form onSubmit={handleCreateUser} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="Dev Engineer"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">Email Address *</label>
                <input
                  type="email"
                  required
                  placeholder="engineer@omnihost.cloud"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  >
                    <option value="user">Standard User</option>
                    <option value="admin">Cluster Admin</option>
                    <option value="superadmin">Super Admin (Root)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Compute Plan</label>
                  <select
                    value={planId}
                    onChange={(e) => setPlanId(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white font-mono"
                  >
                    <option value="free">Free Community</option>
                    <option value="pro">Pro Developer</option>
                    <option value="business">Enterprise Dedicated</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 bg-zinc-800 rounded-lg text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-600 rounded-lg text-xs font-semibold text-white"
                >
                  Create User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
