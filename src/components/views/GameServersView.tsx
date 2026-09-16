import React, { useState } from 'react';
import {
  Gamepad2, Play, Square, RotateCw, Terminal, Users, Radio,
  Send, ShieldCheck, RefreshCw, Archive, Settings2, Download
} from 'lucide-react';
import { Project } from '../../types';
import { api } from '../../services/api';

interface GameServersViewProps {
  projects: Project[];
  onStartProject: (id: string) => void;
  onStopProject: (id: string) => void;
  onRestartProject: (id: string) => void;
  onOpenTerminalForProject: (proj: Project) => void;
  onOpenFilesForProject: (proj: Project) => void;
}

export const GameServersView: React.FC<GameServersViewProps> = ({
  projects,
  onStartProject,
  onStopProject,
  onRestartProject,
  onOpenTerminalForProject,
  onOpenFilesForProject
}) => {
  const gameServers = projects.filter(p => p.workloadType === 'gameserver' || p.gameServerConfig !== undefined);
  const [selectedServer, setSelectedServer] = useState<Project | null>(gameServers[0] || null);

  const [rconCommand, setRconCommand] = useState('');
  const [rconLogs, setRconLogs] = useState<string[]>([
    '[Server] [INFO] Dedicated Game Engine initialized on TCP port 25565',
    '[Server] [INFO] Loading world "omnihost-world"...',
    '[Server] [INFO] 0/20 players connected. Ready for client connections.'
  ]);
  const [sendingRcon, setSendingRcon] = useState(false);

  const handleSendRcon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedServer || !rconCommand.trim()) return;

    const cmd = rconCommand.trim();
    setRconCommand('');
    setSendingRcon(true);

    setRconLogs(prev => [...prev, `> ${cmd}`]);

    try {
      const res = await api.sendGameServerCommand(selectedServer.id, cmd);
      setRconLogs(prev => [...prev, `[RCON Response] ${res.message}`]);
    } catch (err: any) {
      setRconLogs(prev => [...prev, `[RCON Error] ${err.message}`]);
    } finally {
      setSendingRcon(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-zinc-950 border border-emerald-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Gamepad2 className="w-5 h-5 text-emerald-400" />
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              Game Server Orchestration
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-950 text-emerald-300 border border-emerald-800">
              LOW-LATENCY DEDICATED HOSTING
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            24/7 dedicated servers for Minecraft (Paper/Spigot/Fabric), Valheim, Palworld, Terraria, and CS2 with automated TCP/UDP port mapping and live RCON console.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <span className="px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-mono text-emerald-400">
            {gameServers.length} Dedicated Instances
          </span>
        </div>
      </div>

      {gameServers.length === 0 ? (
        <div className="p-12 text-center rounded-xl bg-zinc-900/40 border border-zinc-800 space-y-3">
          <Gamepad2 className="w-10 h-10 text-zinc-600 mx-auto" />
          <h3 className="text-sm font-semibold text-zinc-200">No Dedicated Game Servers Provisioned</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            Navigate to the Workloads tab, click "New Workload", and select "Game Server" to spin up Minecraft, Valheim, or Palworld instances.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Server List */}
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-zinc-300 font-mono uppercase tracking-wider">
              Installed Game Instances
            </h2>

            {gameServers.map((server) => (
              <div
                key={server.id}
                onClick={() => setSelectedServer(server)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-3 ${
                  selectedServer?.id === server.id
                    ? 'bg-emerald-950/40 border-emerald-600 shadow-lg shadow-emerald-950/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-white">{server.name}</h3>
                    <span className="text-[10px] font-mono text-emerald-400 uppercase">
                      {server.gameServerConfig?.gameType || 'Dedicated Server'}
                    </span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-semibold ${
                    server.status === 'running' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {server.status.toUpperCase()}
                  </span>
                </div>

                <div className="p-2.5 rounded-lg bg-zinc-950 border border-zinc-850 text-xs font-mono space-y-1 text-zinc-400">
                  <div className="flex justify-between">
                    <span>Direct Host Connection:</span>
                    <span className="text-zinc-200 font-bold">:{server.assignedInternalPort}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Max Player Slots:</span>
                    <span className="text-zinc-200">{server.gameServerConfig?.maxPlayers || 20}</span>
                  </div>
                </div>

                {/* Quick Controls */}
                <div className="flex items-center justify-between pt-1">
                  <div className="flex items-center space-x-1.5">
                    {server.status === 'running' ? (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStopProject(server.id); }}
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-red-950 text-zinc-400 hover:text-red-400"
                      >
                        <Square className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => { e.stopPropagation(); onStartProject(server.id); }}
                        className="p-1.5 rounded-md bg-zinc-800 hover:bg-emerald-950 text-zinc-400 hover:text-emerald-400"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => { e.stopPropagation(); onRestartProject(server.id); }}
                      className="p-1.5 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-400"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center space-x-2 text-xs font-mono">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenFilesForProject(server); }}
                      className="text-amber-400 hover:text-amber-300"
                    >
                      World Files
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenTerminalForProject(server); }}
                      className="text-cyan-400 hover:text-cyan-300"
                    >
                      Terminal
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* RCON Console & Server Inspector */}
          <div className="lg:col-span-2 space-y-4">
            <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
                <div className="flex items-center space-x-2">
                  <Terminal className="w-4 h-4 text-emerald-400" />
                  <h3 className="text-sm font-bold text-white font-mono">
                    Live Dedicated Server RCON Console
                  </h3>
                </div>
                <span className="text-xs text-zinc-400 font-mono">
                  {selectedServer ? selectedServer.name : 'Select a server'}
                </span>
              </div>

              {/* RCON Terminal Log Output */}
              <div className="h-72 p-3 bg-zinc-950 rounded-lg border border-zinc-800 font-mono text-xs text-zinc-200 overflow-y-auto space-y-1.5">
                {rconLogs.map((log, i) => (
                  <div key={i} className={log.startsWith('>') ? 'text-cyan-400 font-bold' : log.includes('Error') ? 'text-red-400' : 'text-zinc-300'}>
                    {log}
                  </div>
                ))}
              </div>

              {/* Command Input */}
              <form onSubmit={handleSendRcon} className="flex items-center space-x-2">
                <input
                  type="text"
                  placeholder="Enter server command (e.g. list, op player, save-all, kick, ban)..."
                  value={rconCommand}
                  onChange={(e) => setRconCommand(e.target.value)}
                  disabled={!selectedServer || sendingRcon}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-emerald-500"
                />
                <button
                  type="submit"
                  disabled={!selectedServer || sendingRcon || !rconCommand.trim()}
                  className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Send</span>
                </button>
              </form>

              {/* Quick Server Action Shortcuts */}
              <div className="pt-3 border-t border-zinc-800 flex items-center space-x-2 text-xs font-mono">
                <span className="text-zinc-500">Quick Commands:</span>
                <button
                  type="button"
                  onClick={() => setRconCommand('list')}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  /list
                </button>
                <button
                  type="button"
                  onClick={() => setRconCommand('save-all')}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  /save-all
                </button>
                <button
                  type="button"
                  onClick={() => setRconCommand('tps')}
                  className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
                >
                  /tps
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
