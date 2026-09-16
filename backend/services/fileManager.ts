import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { ProjectFileEntry } from '../types/index.ts';

export class FileManagerService {
  /**
   * Validates and returns the safe normalized absolute path inside the project root jail.
   * Throws error if path escapes project root.
   */
  public getSafePath(projectStoragePath: string, relativePath: string = ''): string {
    const root = path.resolve(projectStoragePath);
    if (!fs.existsSync(root)) {
      fs.mkdirSync(root, { recursive: true });
    }

    const cleanedRel = (relativePath || '').replace(/^[/\\]+/, '');
    const target = path.resolve(root, cleanedRel);

    if (!target.startsWith(root)) {
      throw new Error('Security Violation: Path traversal attempt detected outside project root.');
    }

    return target;
  }

  public listFiles(projectStoragePath: string, relativeDir: string = ''): ProjectFileEntry[] {
    const safeDir = this.getSafePath(projectStoragePath, relativeDir);
    if (!fs.existsSync(safeDir)) {
      return [];
    }

    const entries = fs.readdirSync(safeDir, { withFileTypes: true });
    const result: ProjectFileEntry[] = [];

    for (const entry of entries) {
      const fullPath = path.join(safeDir, entry.name);
      try {
        const stat = fs.statSync(fullPath);
        const relPath = path.relative(projectStoragePath, fullPath).replace(/\\/g, '/');

        result.push({
          name: entry.name,
          path: relPath,
          isDirectory: entry.isDirectory(),
          size: entry.isDirectory() ? 0 : stat.size,
          modifiedAt: stat.mtime.toISOString(),
          permissions: (stat.mode & 0o777).toString(8)
        });
      } catch {
        // Skip unreadable files
      }
    }

    // Sort: directories first, then alphabetically
    return result.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  public readFile(projectStoragePath: string, relativeFilePath: string): { content: string; size: number } {
    const safePath = this.getSafePath(projectStoragePath, relativeFilePath);
    if (!fs.existsSync(safePath)) {
      throw new Error('File not found: ' + relativeFilePath);
    }
    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      throw new Error('Cannot read directory as file.');
    }
    const content = fs.readFileSync(safePath, 'utf-8');
    return { content, size: stat.size };
  }

  public writeFile(projectStoragePath: string, relativeFilePath: string, content: string): void {
    const safePath = this.getSafePath(projectStoragePath, relativeFilePath);
    const parentDir = path.dirname(safePath);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }
    fs.writeFileSync(safePath, content, 'utf-8');
  }

  public createDirectory(projectStoragePath: string, relativeDirPath: string): void {
    const safePath = this.getSafePath(projectStoragePath, relativeDirPath);
    if (!fs.existsSync(safePath)) {
      fs.mkdirSync(safePath, { recursive: true });
    }
  }

  public deleteEntry(projectStoragePath: string, relativePath: string): void {
    const safePath = this.getSafePath(projectStoragePath, relativePath);
    if (!fs.existsSync(safePath)) return;

    const stat = fs.statSync(safePath);
    if (stat.isDirectory()) {
      fs.rmSync(safePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(safePath);
    }
  }

  public renameEntry(projectStoragePath: string, oldRelativePath: string, newRelativePath: string): void {
    const safeOld = this.getSafePath(projectStoragePath, oldRelativePath);
    const safeNew = this.getSafePath(projectStoragePath, newRelativePath);

    if (!fs.existsSync(safeOld)) {
      throw new Error('Source file does not exist.');
    }

    const parentDir = path.dirname(safeNew);
    if (!fs.existsSync(parentDir)) {
      fs.mkdirSync(parentDir, { recursive: true });
    }

    fs.renameSync(safeOld, safeNew);
  }

  public extractZipBuffer(projectStoragePath: string, zipBuffer: Buffer, targetRelativeDir: string = ''): void {
    const safeTarget = this.getSafePath(projectStoragePath, targetRelativeDir);
    const zip = new AdmZip(zipBuffer);
    zip.extractAllTo(safeTarget, true);
  }

  public createZipArchive(projectStoragePath: string, relativeDir: string = ''): Buffer {
    const safeTarget = this.getSafePath(projectStoragePath, relativeDir);
    const zip = new AdmZip();
    zip.addLocalFolder(safeTarget);
    return zip.toBuffer();
  }

  public calculateStorageUsage(projectStoragePath: string): { totalBytes: number; totalMB: number; fileCount: number } {
    const safeRoot = this.getSafePath(projectStoragePath);
    let totalBytes = 0;
    let fileCount = 0;

    function walk(dir: string) {
      if (!fs.existsSync(dir)) return;
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const full = path.join(dir, entry.name);
        try {
          const stat = fs.statSync(full);
          if (entry.isDirectory()) {
            walk(full);
          } else {
            totalBytes += stat.size;
            fileCount += 1;
          }
        } catch {
          // ignore
        }
      }
    }

    walk(safeRoot);
    return {
      totalBytes,
      totalMB: Math.round((totalBytes / (1024 * 1024)) * 100) / 100,
      fileCount
    };
  }
}

export const fileManager = new FileManagerService();
