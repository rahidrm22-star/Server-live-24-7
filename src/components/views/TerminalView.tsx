import React, { useState, useRef, useEffect } from 'react';
import {
  Terminal as TerminalIcon, Send, Trash2, ShieldAlert,
  Play, RotateCw, CornerDownLeft, Sparkles, Folder, Check
} from 'lucide-react';
import { Project } from '../../types';
import { api } from '../../services/api';

interface TerminalViewProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
}

interface TerminalHistoryEntry {
  command: string;
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  dir: string;
  timestamp: string;
}

export const TerminalView: React.FC<TerminalViewProps> = ({
  projects,
  activeProject,
  onSelectProject
}) => {
  const [selectedProj, setSelectedProj] = useState<Project | null>(activeProject || projects[0] || null);
  const [command, setCommand] = useState('');
  const [currentDir, setCurrentDir] = useState('/');
  const [isExecuting, setIsExecuting] = useState(false);
  const [history, setHistory] = useState<TerminalHistoryEntry[]>([
    {
      command: 'echo "OmniHost 24/7 Sandboxed Compute Terminal initialized."',
      stdout: 'OmniHost 24/7 Sandboxed Compute Terminal initialized.\nIsolated execution jail: Active\nHardware access: Bound to project limits.',
      stderr: '',
      exitCode: 0,
      durationMs: 4,
      dir: '/',
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeProject) {
      setSelectedProj(activeProject);
    }
  }, [activeProject]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history]);

  const handleExecute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!command.trim() || !selectedProj) return;

    const cmd = command.trim();
    setCommand('');
    setIsExecuting(true);

    try {
      const res = await api.executeTerminalCommand({
        projectId: selectedProj.id,
        command: cmd,
        currentDir
      });

      setCurrentDir(res.currentDir || currentDir);
      setHistory(prev => [
        ...prev,
        {
          command: cmd,
          stdout: res.stdout,
          stderr: res.stderr,
          exitCode: res.exitCode,
          durationMs: res.durationMs,
          dir: currentDir,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } catch (err: any) {
      setHistory(prev => [
        ...prev,
        {
          command: cmd,
          stdout: '',
          stderr: err.message || 'Execution failed',
          exitCode: 1,
          durationMs: 0,
          dir: currentDir,
          timestamp: new Date().toLocaleTimeString()
        }
      ]);
    } finally {
      setIsExecuting(false);
    }
  };

  const handleQuickCommand = (cmd: string) => {
    setCommand(cmd);
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Header & Project Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center text-cyan-400">
            <TerminalIcon className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display">
              Sandboxed Interactive Terminal
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Non-root jailed command runner with root path traversal defense.
            </p>
          </div>
        </div>

        {/* Project Target Dropdown */}
        <div className="flex items-center space-x-2">
          <span className="text-xs font-mono text-zinc-400">Workload:</span>
          <select
            value={selectedProj?.id || ''}
            onChange={(e) => {
              const p = projects.find(proj => proj.id === e.target.value);
              if (p) {
                setSelectedProj(p);
                onSelectProject(p);
              }
            }}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} (:{p.assignedInternalPort})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Terminal Main Window */}
      <div className="rounded-2xl bg-zinc-950 border border-zinc-800 overflow-hidden shadow-2xl flex flex-col h-[560px]">
        {/* Terminal Title Bar */}
        <div className="px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-3 h-3 rounded-full bg-red-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
            <span className="ml-2 text-xs font-mono text-zinc-400">
              user@omnihost:{selectedProj?.slug || 'sandbox'} [{currentDir}]
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setHistory([])}
              title="Clear Terminal Screen"
              className="p-1 text-zinc-400 hover:text-zinc-200"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Terminal Scrollable Logs */}
        <div className="flex-1 p-4 font-mono text-xs text-zinc-200 overflow-y-auto space-y-3">
          {history.map((item, idx) => (
            <div key={idx} className="space-y-1">
              <div className="flex items-center space-x-2 text-cyan-400 font-bold">
                <span>omnihost-shell$</span>
                <span className="text-zinc-100">{item.command}</span>
                <span className="text-[10px] text-zinc-500 font-normal">
                  ({item.durationMs}ms, exit {item.exitCode})
                </span>
              </div>

              {item.stdout && (
                <pre className="text-zinc-300 whitespace-pre-wrap leading-relaxed pl-2 border-l border-zinc-800">
                  {item.stdout}
                </pre>
              )}

              {item.stderr && (
                <pre className="text-red-400 whitespace-pre-wrap leading-relaxed pl-2 border-l border-red-800">
                  {item.stderr}
                </pre>
              )}
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Input Bar */}
        <form onSubmit={handleExecute} className="p-3 bg-zinc-900/90 border-t border-zinc-800 flex items-center space-x-2">
          <span className="text-xs font-mono text-cyan-400 font-bold shrink-0">
            {selectedProj?.slug || 'sandbox'}:{currentDir}$
          </span>
          <input
            type="text"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            disabled={isExecuting || !selectedProj}
            placeholder="Type bash command (e.g. ls -la, node -v, cat package.json, npm test)..."
            className="flex-1 bg-transparent text-xs font-mono text-white placeholder-zinc-600 focus:outline-none"
            autoFocus
          />
          <button
            type="submit"
            disabled={isExecuting || !command.trim() || !selectedProj}
            className="p-1.5 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-colors"
          >
            <CornerDownLeft className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Quick Development Action Shortcuts */}
      <div className="flex items-center flex-wrap gap-2 text-xs font-mono">
        <span className="text-zinc-500">Quick Shortcuts:</span>
        <button
          onClick={() => handleQuickCommand('ls -la')}
          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          ls -la
        </button>
        <button
          onClick={() => handleQuickCommand('cat package.json')}
          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          cat package.json
        </button>
        <button
          onClick={() => handleQuickCommand('npm run build')}
          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          npm run build
        </button>
        <button
          onClick={() => handleQuickCommand('df -h')}
          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          df -h
        </button>
        <button
          onClick={() => handleQuickCommand('node -v && npm -v')}
          className="px-2.5 py-1 rounded bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300"
        >
          node/npm version
        </button>
      </div>
    </div>
  );
};
