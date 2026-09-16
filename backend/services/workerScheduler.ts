import { db } from '../db/index.ts';
import { Project, ComputeWorker, RuntimeId } from '../types/index.ts';
import { workerManager } from './workerManager.ts';

export interface SchedulingDecision {
  selectedWorkerId: string;
  workerName: string;
  workerType: string;
  score: number;
  reason: string;
  alternativesEvaluated: number;
  runtimeSupported: boolean;
  warnings?: string[];
}

class WorkerSchedulerService {
  /**
   * Evaluates all connected worker nodes and selects the optimal compute host for a project.
   */
  public selectWorkerForProject(project: Project): SchedulingDecision {
    const workers = db.getWorkers();
    
    // 1. Check if user explicitly pinned a worker
    if (project.targetWorkerPreference && project.targetWorkerPreference !== 'auto') {
      const pinnedWorker = db.findWorkerById(project.targetWorkerPreference);
      if (pinnedWorker) {
        const isOnline = pinnedWorker.status === 'online' || pinnedWorker.status === 'busy';
        const runtimeCap = pinnedWorker.runtimes.find(r => r.runtime === project.runtime && r.available);
        
        const warnings: string[] = [];
        if (!isOnline) {
          warnings.push(`Pinned worker "${pinnedWorker.name}" is currently ${pinnedWorker.status.toUpperCase()}. Workload will wait for worker reconnect.`);
        }
        if (!runtimeCap) {
          warnings.push(`Pinned worker does not declare native support for runtime "${project.runtime}". It will execute in compatibility mode.`);
        }

        return {
          selectedWorkerId: pinnedWorker.id,
          workerName: pinnedWorker.name,
          workerType: pinnedWorker.type,
          score: 100,
          reason: `Manually pinned by administrator preference to "${pinnedWorker.name}".`,
          alternativesEvaluated: 1,
          runtimeSupported: Boolean(runtimeCap),
          warnings: warnings.length > 0 ? warnings : undefined
        };
      }
    }

    // 2. Filter candidates for Auto-Scheduling
    const candidateWorkers = workers.filter(w => {
      // Must be online or busy (not offline/maintenance)
      if (w.status !== 'online' && w.status !== 'busy') return false;
      return true;
    });

    if (candidateWorkers.length === 0) {
      // Fallback to local controller
      const local = workers.find(w => w.type === 'local_runner') || workers[0];
      return {
        selectedWorkerId: local ? local.id : 'worker_local_controller',
        workerName: local ? local.name : 'Local Controller Host',
        workerType: 'local_runner',
        score: 10,
        reason: 'No external distributed workers available. Falling back to Local Controller process isolation.',
        alternativesEvaluated: 0,
        runtimeSupported: true,
        warnings: ['Operating in standalone single-node fallback mode.']
      };
    }

    // 3. Score candidates
    const scoredCandidates = candidateWorkers.map(w => {
      let score = 50; // baseline

      // A. Runtime compatibility (+40 points if verified available)
      const runtimeMatch = w.runtimes.find(r => r.runtime === project.runtime && r.available);
      if (runtimeMatch) {
        score += 40;
      } else {
        score -= 30; // heavy penalty if runtime not listed
      }

      // B. Workload type affinity
      if (project.workloadType === 'ai') {
        // AI workload prefers high RAM & CUDA/x86_64 or high-core ARM
        if (w.hardware.totalMemoryMB >= 8192) score += 20;
        if (w.type === 'linux_vps' || w.type === 'cloud_vm') score += 15;
      } else if (project.workloadType === 'gameserver') {
        // Game server needs Java 21 & high clock CPU
        if (w.runtimes.some(r => r.runtime === 'java-21' && r.available)) score += 30;
        if (w.hardware.totalMemoryMB >= 6144) score += 15;
      } else if (project.workloadType === 'web' || project.workloadType === 'api') {
        // Standard web/API: low latency and low power nodes like Termux are great
        if (w.type === 'termux') score += 10;
      }

      // C. Available Resources (RAM & CPU headroom)
      const freeMem = w.hardware.freeMemoryMB || (w.hardware.totalMemoryMB - w.hardware.usedMemoryMB);
      const neededMem = project.limits.memoryMB || 512;
      if (freeMem >= neededMem) {
        score += Math.min(25, (freeMem / neededMem) * 10);
      } else {
        score -= 40; // memory crunch
      }

      // D. CPU Load (lower is better)
      const cpuLoad = w.hardware.cpuUsagePercent || 0;
      score += Math.max(0, (100 - cpuLoad) * 0.2);

      // E. Latency (lower is better)
      const latency = w.pingLatencyMs || 50;
      score += Math.max(0, (100 - latency) * 0.1);

      // F. Capacity slot check
      if (w.assignedProjectsCount >= w.maxWorkloads) {
        score -= 50;
      }

      return {
        worker: w,
        score: Math.round(score),
        runtimeSupported: Boolean(runtimeMatch)
      };
    });

    // Sort by highest score
    scoredCandidates.sort((a, b) => b.score - a.score);
    const best = scoredCandidates[0];

    const warnings: string[] = [];
    if (!best.runtimeSupported) {
      warnings.push(`Worker "${best.worker.name}" does not list explicit verified support for "${project.runtime}".`);
    }

    return {
      selectedWorkerId: best.worker.id,
      workerName: best.worker.name,
      workerType: best.worker.type,
      score: best.score,
      reason: `Auto-Scheduler selected optimal node (Score: ${best.score}/100) based on runtime match, ${best.worker.hardware.freeMemoryMB}MB free RAM, and ${best.worker.hardware.cpuUsagePercent}% CPU load.`,
      alternativesEvaluated: candidateWorkers.length,
      runtimeSupported: best.runtimeSupported,
      warnings: warnings.length > 0 ? warnings : undefined
    };
  }

  /**
   * Binds a project to a worker and dispatches the placement job.
   */
  public assignAndDispatch(project: Project): SchedulingDecision {
    const decision = this.selectWorkerForProject(project);
    
    // Update project with assigned worker
    db.updateProject(project.id, {
      workerId: decision.selectedWorkerId
    });

    // Dispatch deploy/start job to worker queue
    workerManager.dispatchJob(decision.selectedWorkerId, project.id, 'deploy', {
      projectName: project.name,
      slug: project.slug,
      runtime: project.runtime,
      port: project.assignedInternalPort,
      limits: project.limits,
      envVars: project.envVars,
      startCommand: project.startCommand,
      buildCommand: project.buildCommand
    });

    // Update worker project counter
    const worker = db.findWorkerById(decision.selectedWorkerId);
    if (worker) {
      const currentProjects = db.getProjects().filter(p => p.workerId === worker.id).length;
      db.updateWorker(worker.id, { assignedProjectsCount: currentProjects });
    }

    return decision;
  }
}

export const workerScheduler = new WorkerSchedulerService();
