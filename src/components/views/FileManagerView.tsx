import React, { useState, useEffect } from 'react';
import {
  FolderTree, File, Folder, Plus, Upload, Trash2, Save,
  FileCode, RefreshCw, ChevronRight, FileText, Download, Check
} from 'lucide-react';
import { Project, ProjectFileEntry } from '../../types';
import { api } from '../../services/api';

interface FileManagerViewProps {
  projects: Project[];
  activeProject: Project | null;
  onSelectProject: (proj: Project) => void;
}

export const FileManagerView: React.FC<FileManagerViewProps> = ({
  projects,
  activeProject,
  onSelectProject
}) => {
  const [selectedProj, setSelectedProj] = useState<Project | null>(activeProject || projects[0] || null);
  const [currentPath, setCurrentPath] = useState('/');
  const [files, setFiles] = useState<ProjectFileEntry[]>([]);
  const [storageStats, setStorageStats] = useState<{ totalBytes: number; totalMB: number; fileCount: number } | null>(null);
  const [loading, setLoading] = useState(false);

  // Editor state
  const [selectedFile, setSelectedFile] = useState<ProjectFileEntry | null>(null);
  const [fileContent, setFileContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Modals / inputs
  const [isNewFolderOpen, setIsNewFolderOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [isNewFileOpen, setIsNewFileOpen] = useState(false);
  const [newFileName, setNewFileName] = useState('');

  useEffect(() => {
    if (activeProject) {
      setSelectedProj(activeProject);
    }
  }, [activeProject]);

  const loadFiles = async () => {
    if (!selectedProj) return;
    setLoading(true);
    try {
      const res = await api.getFiles(selectedProj.id, currentPath);
      setFiles(res.files || []);
      setStorageStats(res.storageStats);
    } catch (err) {
      console.error('Failed to load project files:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [selectedProj, currentPath]);

  const handleOpenFile = async (file: ProjectFileEntry) => {
    if (file.isDirectory) {
      setCurrentPath(file.path);
      return;
    }

    setSelectedFile(file);
    try {
      const res = await api.getFileContent(selectedProj!.id, file.path);
      setFileContent(res.content);
    } catch (err: any) {
      alert(err.message || 'Failed to read file');
    }
  };

  const handleSaveFile = async () => {
    if (!selectedProj || !selectedFile) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      await api.saveFileContent(selectedProj.id, selectedFile.path, fileContent);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
      loadFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to save file');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj || !newFolderName.trim()) return;

    const folderPath = currentPath === '/' ? `/${newFolderName.trim()}` : `${currentPath}/${newFolderName.trim()}`;
    try {
      await api.createDirectory(selectedProj.id, folderPath);
      setIsNewFolderOpen(false);
      setNewFolderName('');
      loadFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to create folder');
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProj || !newFileName.trim()) return;

    const filePath = currentPath === '/' ? `/${newFileName.trim()}` : `${currentPath}/${newFileName.trim()}`;
    try {
      await api.saveFileContent(selectedProj.id, filePath, '// New File\n');
      setIsNewFileOpen(false);
      setNewFileName('');
      loadFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to create file');
    }
  };

  const handleDeleteEntry = async (entry: ProjectFileEntry) => {
    if (!confirm(`Are you sure you want to delete "${entry.name}"?`)) return;
    try {
      await api.deleteFileEntry(selectedProj!.id, entry.path);
      if (selectedFile?.path === entry.path) {
        setSelectedFile(null);
        setFileContent('');
      }
      loadFiles();
    } catch (err: any) {
      alert(err.message || 'Failed to delete');
    }
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProj) return;

    try {
      await api.uploadFile(selectedProj.id, file, currentPath);
      loadFiles();
    } catch (err: any) {
      alert(err.message || 'Upload failed');
    }
  };

  return (
    <div className="space-y-4 pb-12">
      {/* Top Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-zinc-900/80 border border-zinc-800">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-lg bg-amber-950 border border-amber-800 flex items-center justify-center text-amber-400">
            <FolderTree className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-base font-bold text-white font-display">
              Sandboxed File Manager & Web IDE
            </h1>
            <p className="text-xs text-zinc-400 font-mono">
              Direct access to workload filesystem with root isolation and live code editing.
            </p>
          </div>
        </div>

        {/* Project Selector */}
        <div className="flex items-center space-x-3">
          <select
            value={selectedProj?.id || ''}
            onChange={(e) => {
              const p = projects.find(proj => proj.id === e.target.value);
              if (p) {
                setSelectedProj(p);
                onSelectProject(p);
                setCurrentPath('/');
                setSelectedFile(null);
              }
            }}
            className="bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
          >
            {projects.map(p => (
              <option key={p.id} value={p.id}>{p.name} ({p.runtime})</option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Split-Pane Explorer and Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 h-[600px]">
        {/* Left 1 Col: File Directory Tree */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
          {/* File Manager Toolbar */}
          <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-1">
              <button
                onClick={() => setIsNewFileOpen(true)}
                title="Create New File"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsNewFolderOpen(true)}
                title="Create New Folder"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              >
                <Folder className="w-4 h-4" />
              </button>
              <label
                title="Upload File"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded cursor-pointer"
              >
                <Upload className="w-4 h-4" />
                <input type="file" onChange={handleUpload} className="hidden" />
              </label>
              <button
                onClick={loadFiles}
                title="Refresh Files"
                className="p-1.5 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 rounded"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {storageStats && (
              <span className="text-[10px] font-mono text-zinc-500">
                {storageStats.totalMB.toFixed(2)} MB / {storageStats.fileCount} files
              </span>
            )}
          </div>

          {/* Breadcrumb path navigation */}
          <div className="px-3 py-1.5 bg-zinc-900/50 border-b border-zinc-850 flex items-center space-x-1 text-xs font-mono text-zinc-400 overflow-x-auto">
            <span
              onClick={() => setCurrentPath('/')}
              className="cursor-pointer hover:text-amber-400"
            >
              /root
            </span>
            {currentPath !== '/' && (
              <span className="text-zinc-200">{currentPath}</span>
            )}
          </div>

          {/* File List Items */}
          <div className="flex-1 p-2 overflow-y-auto space-y-1">
            {currentPath !== '/' && (
              <div
                onClick={() => {
                  const parts = currentPath.split('/').filter(Boolean);
                  parts.pop();
                  setCurrentPath(parts.length > 0 ? `/${parts.join('/')}` : '/');
                }}
                className="flex items-center space-x-2 px-2.5 py-1.5 rounded-lg hover:bg-zinc-900 text-xs font-mono text-zinc-400 cursor-pointer"
              >
                <Folder className="w-4 h-4 text-amber-500" />
                <span>.. (Up Directory)</span>
              </div>
            )}

            {files.map((file) => (
              <div
                key={file.path}
                onClick={() => handleOpenFile(file)}
                className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition-colors group ${
                  selectedFile?.path === file.path
                    ? 'bg-amber-950/40 text-amber-300 border border-amber-800/80'
                    : 'text-zinc-300 hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center space-x-2 truncate">
                  {file.isDirectory ? (
                    <Folder className="w-4 h-4 text-amber-500 shrink-0" />
                  ) : (
                    <FileCode className="w-4 h-4 text-cyan-400 shrink-0" />
                  )}
                  <span className="truncate">{file.name}</span>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <span className="text-[10px] text-zinc-500">
                    {file.isDirectory ? 'dir' : `${(file.size / 1024).toFixed(1)} KB`}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteEntry(file);
                    }}
                    className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-red-400 p-0.5"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right 2 Cols: In-Browser Code Editor */}
        <div className="lg:col-span-2 bg-zinc-950 border border-zinc-800 rounded-xl flex flex-col overflow-hidden">
          {/* Editor Header */}
          <div className="p-3 bg-zinc-900 border-b border-zinc-800 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-semibold text-zinc-200">
                {selectedFile ? selectedFile.name : 'Select a file to edit'}
              </span>
              {selectedFile && (
                <span className="text-[10px] text-zinc-500 font-mono">
                  ({selectedFile.path})
                </span>
              )}
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-2">
                {saveSuccess && (
                  <span className="flex items-center space-x-1 text-xs font-mono text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    <span>Saved!</span>
                  </span>
                )}
                <button
                  onClick={handleSaveFile}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs flex items-center space-x-1.5 transition-colors disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isSaving ? 'Saving...' : 'Save File'}</span>
                </button>
              </div>
            )}
          </div>

          {/* Editor Text Area */}
          <div className="flex-1 p-0 relative">
            {selectedFile ? (
              <textarea
                value={fileContent}
                onChange={(e) => setFileContent(e.target.value)}
                className="w-full h-full bg-zinc-950 text-zinc-100 p-4 font-mono text-xs leading-relaxed resize-none focus:outline-none"
                spellCheck={false}
              />
            ) : (
              <div className="h-full flex items-center justify-center text-zinc-600 font-mono text-xs">
                Select a file from the explorer on the left to start editing.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* New Folder Modal */}
      {isNewFolderOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-bold text-white font-mono">Create Directory</h3>
            <form onSubmit={handleCreateFolder} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="folder_name"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded-md text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-600 rounded-md text-xs font-semibold text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* New File Modal */}
      {isNewFileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 w-full max-w-sm space-y-3">
            <h3 className="text-sm font-bold text-white font-mono">Create New File</h3>
            <form onSubmit={handleCreateFile} className="space-y-3">
              <input
                type="text"
                autoFocus
                placeholder="index.js, config.json, main.py"
                value={newFileName}
                onChange={(e) => setNewFileName(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs font-mono text-white"
              />
              <div className="flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsNewFileOpen(false)}
                  className="px-3 py-1.5 bg-zinc-800 rounded-md text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-cyan-600 rounded-md text-xs font-semibold text-white"
                >
                  Create
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
