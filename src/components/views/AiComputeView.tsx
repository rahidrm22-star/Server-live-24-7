import React, { useState } from 'react';
import {
  Cpu, Zap, Play, CheckCircle2, Sparkles, Terminal, Activity,
  Server, Shield, RefreshCw, Send, AlertTriangle
} from 'lucide-react';
import { Project, SystemMetricSnapshot } from '../../types';
import { api } from '../../services/api';

interface AiComputeViewProps {
  projects: Project[];
  metrics: SystemMetricSnapshot | null;
  onRefreshMetrics: () => void;
  onOpenTerminalForProject: (proj: Project) => void;
}

export const AiComputeView: React.FC<AiComputeViewProps> = ({
  projects,
  metrics,
  onRefreshMetrics,
  onOpenTerminalForProject
}) => {
  const aiProjects = projects.filter(p => p.workloadType === 'ai' || p.runtime === 'python-ai-pytorch');
  const [selectedAiProject, setSelectedAiProject] = useState<Project | null>(aiProjects[0] || null);

  const [prompt, setPrompt] = useState('Analyze system latency and optimize neural inference pipeline for 24/7 execution.');
  const [maxTokens, setMaxTokens] = useState(256);
  const [loading, setLoading] = useState(false);
  const [responseOutput, setResponseOutput] = useState<string | null>(null);
  const [executionStats, setExecutionStats] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleTestInference = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAiProject) return;

    setLoading(true);
    setError(null);
    setResponseOutput(null);

    try {
      const res = await api.generateAiResponse(selectedAiProject.id, {
        prompt,
        max_tokens: maxTokens
      });
      setResponseOutput(res.output);
      setExecutionStats(res.stats);
    } catch (err: any) {
      setError(err.message || 'Inference error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-purple-950/60 via-zinc-900 to-zinc-950 border border-purple-900/50 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl font-bold text-white tracking-tight font-display">
              AI & Machine Learning Compute Lab
            </h1>
            <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-purple-950 text-purple-300 border border-purple-800">
              PYTORCH & CUDA ACCELERATION
            </span>
          </div>
          <p className="text-xs text-zinc-400 max-w-2xl">
            Deploy deep learning models, FastAPI endpoints, HuggingFace transformers, and LLM inference engines on dedicated server resources.
          </p>
        </div>

        <button
          onClick={onRefreshMetrics}
          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-mono text-zinc-300 flex items-center space-x-1.5 self-start md:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Probe Accelerator</span>
        </button>
      </div>

      {/* GPU / Accelerator Telemetry */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>HARDWARE ACCELERATOR</span>
            <Cpu className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-lg font-bold text-white font-mono">
            {metrics?.gpu?.available ? metrics.gpu.name : 'AVX-512 High-Speed CPU Core Array'}
          </div>
          <p className="text-[11px] text-zinc-400">
            {metrics?.gpu?.available ? 'CUDA 12.4 Drivers Active' : 'Multi-threaded CPU parallel tensor execution'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>ACCELERATOR VRAM USAGE</span>
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline space-x-2">
            <span className="text-xl font-bold text-white font-mono">
              {metrics?.gpu?.available ? `${metrics.gpu.utilizationPercent}%` : '4.2 GB Shared'}
            </span>
          </div>
          <div className="w-full bg-zinc-800 h-1.5 rounded-full overflow-hidden">
            <div className="bg-purple-500 h-full rounded-full" style={{ width: metrics?.gpu?.available ? `${metrics.gpu.utilizationPercent}%` : '28%' }} />
          </div>
        </div>

        <div className="p-4 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-2">
          <div className="flex items-center justify-between text-zinc-400 text-xs font-mono">
            <span>ACTIVE AI WORKLOADS</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono">
            {aiProjects.length} Microservices
          </div>
          <p className="text-[11px] text-zinc-400">
            FastAPI / Torch serving active on internal ports
          </p>
        </div>
      </div>

      {/* Main Interactive Workbench */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: AI Workload Selector */}
        <div className="space-y-4">
          <h2 className="text-sm font-bold text-zinc-200 font-display uppercase tracking-wider">
            Active AI Microservices
          </h2>

          {aiProjects.length === 0 ? (
            <div className="p-6 rounded-xl bg-zinc-900/40 border border-zinc-800 text-center space-y-2">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto" />
              <p className="text-xs text-zinc-300 font-semibold">No AI Workloads Created</p>
              <p className="text-[11px] text-zinc-500">Create a workload with "Python AI (PyTorch)" runtime in Workloads tab.</p>
            </div>
          ) : (
            aiProjects.map((p) => (
              <div
                key={p.id}
                onClick={() => setSelectedAiProject(p)}
                className={`p-4 rounded-xl border cursor-pointer transition-all space-y-2 ${
                  selectedAiProject?.id === p.id
                    ? 'bg-purple-950/40 border-purple-600 shadow-lg shadow-purple-950/50'
                    : 'bg-zinc-900/60 border-zinc-800 hover:border-zinc-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-white">{p.name}</h3>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono ${
                    p.status === 'running' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' : 'bg-zinc-800 text-zinc-400'
                  }`}>
                    {p.status.toUpperCase()}
                  </span>
                </div>
                <div className="text-xs text-zinc-400 font-mono space-y-1">
                  <div>Endpoint: <code>:{p.assignedInternalPort}/generate</code></div>
                  <div>Limits: {p.limits.cpuCores} Cores / {p.limits.memoryMB} MB RAM</div>
                </div>
                <div className="flex justify-end pt-1">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenTerminalForProject(p);
                    }}
                    className="text-xs text-purple-400 hover:text-purple-300 flex items-center space-x-1"
                  >
                    <Terminal className="w-3.5 h-3.5" />
                    <span>Open Shell</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Right 2 cols: Inference Testing Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="p-5 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white font-mono">
                  Live REST API Inference Workbench
                </h3>
              </div>
              <span className="text-xs text-zinc-400 font-mono">
                Target: {selectedAiProject ? selectedAiProject.name : 'None selected'}
              </span>
            </div>

            {error && (
              <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200">
                {error}
              </div>
            )}

            <form onSubmit={handleTestInference} className="space-y-4">
              <div>
                <label className="block text-xs font-mono text-zinc-300 mb-1">
                  Inference Input Prompt / JSON Payload
                </label>
                <textarea
                  rows={4}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter prompt or model payload..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono text-zinc-300 mb-1">Max Tokens / Steps</label>
                  <input
                    type="number"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-zinc-100 font-mono"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={loading || !selectedAiProject}
                    className="w-full py-2 px-4 rounded-lg bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold text-xs flex items-center justify-center space-x-2 shadow-lg shadow-purple-950/50 transition-all disabled:opacity-50"
                  >
                    {loading ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Inferring on Host...</span>
                      </>
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Execute API Request</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>

            {/* Response Output Console */}
            {responseOutput && (
              <div className="mt-4 p-4 rounded-xl bg-zinc-950 border border-zinc-850 space-y-2">
                <div className="flex items-center justify-between text-xs font-mono text-purple-400">
                  <span>Model Output Stream:</span>
                  {executionStats && (
                    <span className="text-zinc-400">
                      {executionStats.tokensGenerated} tokens in {executionStats.latencyMs}ms ({executionStats.accelerator})
                    </span>
                  )}
                </div>
                <pre className="p-3 bg-zinc-900 rounded-lg text-xs font-mono text-zinc-100 whitespace-pre-wrap leading-relaxed overflow-x-auto border border-zinc-800">
                  {responseOutput}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
