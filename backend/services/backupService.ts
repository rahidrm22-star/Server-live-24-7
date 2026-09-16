import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { db } from '../db/index.ts';
import { BackupRecord } from '../types/index.ts';

const BACKUPS_DIR = path.join(process.cwd(), 'storage', 'backups');

export class BackupService {
  constructor() {
    if (!fs.existsSync(BACKUPS_DIR)) {
      fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    }
  }

  public async createProjectBackup(projectId: string, requestedBy: string, backupType: 'full' | 'database_only' | 'files_only' = 'full'): Promise<BackupRecord> {
    const project = db.findProjectById(projectId);
    if (!project) throw new Error('Project not found');

    const backupId = `backup_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const zipName = `${project.slug}_${backupType}_${Date.now()}.zip`;
    const destPath = path.join(BACKUPS_DIR, zipName);

    const zip = new AdmZip();

    // 1. Add project metadata
    zip.addFile('omnihost-manifest.json', Buffer.from(JSON.stringify(project, null, 2), 'utf-8'));

    // 2. Add files
    if (backupType === 'full' || backupType === 'files_only') {
      if (fs.existsSync(project.storagePath)) {
        zip.addLocalFolder(project.storagePath, 'workspace');
      }
    }

    // 3. Add database dump simulation/export
    if (backupType === 'full' || backupType === 'database_only') {
      const dbs = db.getDatabases().filter(d => d.projectId === projectId);
      zip.addFile('databases.json', Buffer.from(JSON.stringify(dbs, null, 2), 'utf-8'));
    }

    zip.writeZip(destPath);
    const stat = fs.statSync(destPath);
    const sizeMB = Math.round((stat.size / (1024 * 1024)) * 100) / 100;

    const record: BackupRecord = {
      id: backupId,
      projectId: project.id,
      ownerId: project.ownerId,
      projectName: project.name,
      name: `${project.name} Snapshot (${backupType})`,
      sizeMB: sizeMB || 0.05,
      filePath: destPath,
      backupType,
      status: 'completed',
      createdAt: new Date().toISOString()
    };

    db.createBackup(record);
    db.addAuditLog({
      userId: requestedBy,
      action: 'BACKUP_CREATED',
      category: 'system',
      details: { backupId, projectId: project.id, sizeMB }
    });

    return record;
  }

  public async restoreBackup(backupId: string, requestedBy: string): Promise<boolean> {
    const backup = db.getBackups().find(b => b.id === backupId);
    if (!backup) throw new Error('Backup not found');

    const project = db.findProjectById(backup.projectId);
    if (!project) throw new Error('Target project does not exist');

    if (!fs.existsSync(backup.filePath)) {
      throw new Error('Backup archive file is missing on storage volume.');
    }

    const zip = new AdmZip(backup.filePath);
    const workspaceEntry = zip.getEntry('workspace/');
    if (workspaceEntry) {
      zip.extractEntryTo(workspaceEntry, project.storagePath, false, true);
    } else {
      zip.extractAllTo(project.storagePath, true);
    }

    db.addAuditLog({
      userId: requestedBy,
      action: 'BACKUP_RESTORED',
      category: 'system',
      details: { backupId, projectId: project.id }
    });

    return true;
  }

  public deleteBackup(backupId: string, requestedBy: string): boolean {
    const backup = db.getBackups().find(b => b.id === backupId);
    if (!backup) return false;

    if (fs.existsSync(backup.filePath)) {
      try {
        fs.unlinkSync(backup.filePath);
      } catch {
        // ignore
      }
    }

    const removed = db.deleteBackup(backupId);
    db.addAuditLog({
      userId: requestedBy,
      action: 'BACKUP_DELETED',
      category: 'system',
      details: { backupId }
    });

    return removed;
  }
}

export const backupService = new BackupService();
