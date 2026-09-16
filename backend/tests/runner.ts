import { db, hashPassword, generateToken, verifyToken } from '../db/index.ts';
import { fileManager } from '../services/fileManager.ts';
import { terminalService } from '../services/terminalService.ts';
import { processManager } from '../services/processManager.ts';
import { systemMonitor } from '../services/systemMonitor.ts';
import { domainRouter } from '../services/domainRouter.ts';
import { Project } from '../types/index.ts';
import path from 'path';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log(`  ✓ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ [FAIL] ${testName}`);
    failed++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('       OMNIHOST PLATFORM TEST SUITE RUNNER           ');
  console.log('======================================================\n');

  // 1. AUTH & CRYPTOGRAPHY
  console.log('--- Suite 1: Authentication & Security Tokens ---');
  const hash1 = hashPassword('secretPassword123');
  const hash2 = hashPassword('secretPassword123');
  assert(hash1 === hash2, 'PBKDF2 Password hashing produces deterministic hashes');

  const token = generateToken({ userId: 'user_test_01', email: 'test@host.com' });
  const verified = verifyToken(token);
  assert(verified.valid && verified.payload.userId === 'user_test_01', 'JWT token generation & verification succeeds');

  const badToken = verifyToken(token + 'tampered');
  assert(!badToken.valid, 'Tampered JWT token fails verification');

  // 2. HARDWARE TELEMETRY
  console.log('\n--- Suite 2: System Monitor & Hardware Telemetry ---');
  const metrics = systemMonitor.getMetricsSnapshot();
  assert(metrics.cpu.cores > 0, `Detected CPU cores: ${metrics.cpu.cores}`);
  assert(metrics.memory.totalMB > 0, `Detected Total Memory: ${metrics.memory.totalMB} MB`);
  assert(metrics.disk.totalGB > 0, `Detected Disk Capacity: ${metrics.disk.totalGB} GB`);

  const caps = systemMonitor.detectCapabilities();
  assert(caps.availableRuntimes.length >= 8, `Runtimes catalog populated (${caps.availableRuntimes.length} targets)`);

  // 3. FILE MANAGER JAIL & SECURITY
  console.log('\n--- Suite 3: File Manager & Path Traversal Jail ---');
  const testStorage = path.join(process.cwd(), 'storage', 'test_sandbox');
  fileManager.writeFile(testStorage, 'test.txt', 'Hello OmniHost');
  const readBack = fileManager.readFile(testStorage, 'test.txt');
  assert(readBack.content === 'Hello OmniHost', 'File write and read succeeds inside sandbox');

  let pathTraversalCaught = false;
  try {
    fileManager.readFile(testStorage, '../../../../etc/passwd');
  } catch (e: any) {
    if (e.message.includes('Path traversal attempt')) {
      pathTraversalCaught = true;
    }
  }
  assert(pathTraversalCaught, 'Path traversal attack correctly trapped and blocked');

  // Clean test file
  fileManager.deleteEntry(testStorage, 'test.txt');

  // 4. TERMINAL SERVICE RESTRICTIONS
  console.log('\n--- Suite 4: Terminal Execution & Sandbox Rules ---');
  const mockProject: Project = {
    id: 'proj_mock_test',
    ownerId: 'user_test',
    name: 'Test Project',
    slug: 'test-project',
    description: 'test',
    workloadType: 'web',
    runtime: 'nodejs-20',
    status: 'running',
    assignedInternalPort: 3199,
    storagePath: testStorage,
    ports: [],
    subdomain: 'test-proj',
    envVars: {},
    limits: { cpuCores: 1, memoryMB: 512, storageMB: 1024, processLimit: 2 },
    restartPolicy: 'always',
    restartCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const harmlessResult = await terminalService.executeCommand(mockProject, 'echo "SANDBOX_OK"');
  assert(harmlessResult.stdout.includes('SANDBOX_OK'), 'Harmless shell command executes within project directory');

  const forbiddenResult = await terminalService.executeCommand(mockProject, 'rm -rf /', '', false);
  assert(forbiddenResult.exitCode === 126 && forbiddenResult.stderr.includes('SECURITY AUDIT'), 'Dangerous destructive host command forbidden');

  // 5. PROCESS SUPERVISOR
  console.log('\n--- Suite 5: Process Manager & Lifecycle ---');
  const startRes = await processManager.startProject(mockProject);
  assert(startRes.success, 'Workload supervisor starts project');

  const stats = processManager.getProcessStats(mockProject);
  assert(stats.status === 'running' && stats.pid !== undefined, 'Process stats returns active PID');

  const stopRes = await processManager.stopProject(mockProject);
  assert(stopRes.success, 'Workload supervisor terminates project');

  // 6. DOMAIN ROUTING
  console.log('\n--- Suite 6: Domain Router & Port Allocation ---');
  const port = domainRouter.allocateInternalPort();
  assert(port >= 3100 && port < 9000, `Internal port allocated: ${port}`);

  console.log('\n======================================================');
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('======================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
