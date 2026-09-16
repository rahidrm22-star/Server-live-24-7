import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import { Project } from '../types/index.ts';

// Restricted commands that cannot be executed by non-superadmin in project terminal
const FORBIDDEN_PATTERNS = [
  /rm\s+-rf\s+\//,
  /mkfs/,
  /dd\s+if=/,
  /:(){ :\|:& };:/, // fork bomb
  /chmod\s+(-R\s+)?777\s+\//,
  /chown\s+(-R\s+)?root/,
  /sudo\s+/,
  /su\s+/,
  /reboot/,
  /shutdown/,
  /init\s+0/,
  /passwd/,
  /useradd/,
  /userdel/,
  /iptables/
];

export interface TerminalExecutionResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
  currentDir: string;
}

class TerminalService {
  public async executeCommand(
    project: Project, 
    command: string, 
    currentSubDir: string = '', 
    isSuperAdmin: boolean = false
  ): Promise<TerminalExecutionResult> {
    const startTime = Date.now();
    const trimmed = command.trim();

    if (!trimmed) {
      return {
        stdout: '',
        stderr: '',
        exitCode: 0,
        durationMs: 0,
        currentDir: currentSubDir || '/'
      };
    }

    // Security Check: prevent host destruction
    if (!isSuperAdmin) {
      for (const pattern of FORBIDDEN_PATTERNS) {
        if (pattern.test(trimmed)) {
          return {
            stdout: '',
            stderr: `[SECURITY AUDIT]: Command rejected. Elevated root and dangerous system operations are restricted inside project container jail.`,
            exitCode: 126,
            durationMs: Date.now() - startTime,
            currentDir: currentSubDir || '/'
          };
        }
      }
    }

    // Determine target directory
    const projectRoot = path.resolve(project.storagePath);
    if (!fs.existsSync(projectRoot)) {
      fs.mkdirSync(projectRoot, { recursive: true });
    }

    let workingDir = path.resolve(projectRoot, currentSubDir.replace(/^[/\\]+/, ''));
    if (!workingDir.startsWith(projectRoot)) {
      workingDir = projectRoot;
    }

    // Handle interactive 'cd' commands
    if (trimmed.startsWith('cd ') || trimmed === 'cd') {
      const targetArg = trimmed.replace(/^cd\s*/, '').trim();
      let newDir = projectRoot;
      if (targetArg && targetArg !== '~' && targetArg !== '/') {
        newDir = path.resolve(workingDir, targetArg);
      }

      if (newDir.startsWith(projectRoot) && fs.existsSync(newDir)) {
        const rel = path.relative(projectRoot, newDir).replace(/\\/g, '/');
        return {
          stdout: ``,
          stderr: '',
          exitCode: 0,
          durationMs: Date.now() - startTime,
          currentDir: rel ? `/${rel}` : '/'
        };
      } else {
        return {
          stdout: '',
          stderr: `cd: no such file or directory: ${targetArg}`,
          exitCode: 1,
          durationMs: Date.now() - startTime,
          currentDir: currentSubDir || '/'
        };
      }
    }

    // Execute in project sandbox
    return new Promise((resolve) => {
      const env = {
        ...process.env,
        ...project.envVars,
        PORT: String(project.assignedInternalPort),
        PROJECT_ID: project.id,
        PROJECT_NAME: project.name,
        HOME: projectRoot,
        PWD: workingDir
      };

      exec(trimmed, {
        cwd: workingDir,
        env,
        timeout: 20000, // 20s max execution for single command
        maxBuffer: 1024 * 1024 * 2 // 2MB output buffer
      }, (error, stdout, stderr) => {
        const durationMs = Date.now() - startTime;
        const rel = path.relative(projectRoot, workingDir).replace(/\\/g, '/');

        if (error) {
          resolve({
            stdout: stdout || '',
            stderr: stderr || error.message,
            exitCode: error.code || 1,
            durationMs,
            currentDir: rel ? `/${rel}` : '/'
          });
        } else {
          resolve({
            stdout: stdout || '',
            stderr: stderr || '',
            exitCode: 0,
            durationMs,
            currentDir: rel ? `/${rel}` : '/'
          });
        }
      });
    });
  }
}

export const terminalService = new TerminalService();
