/**
 * =============================================================================
 * LEDO-Beam — DropZone Component
 * =============================================================================
 * 
 * Drag-and-drop file selection area with visual feedback.
 * Supports both drag-and-drop and click-to-browse interactions.
 * 
 * Features:
 * - Animated border on drag hover
 * - File type icon and size display after selection
 * - Handles dragenter, dragover, dragleave, drop events
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

import React, { useState, useRef, useCallback } from 'react';

/**
 * Formats a byte count into a human-readable string (e.g., "2.5 GB").
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(i > 0 ? 2 : 0) + ' ' + units[i];
}

/**
 * Returns an appropriate icon/emoji for common file types.
 * @param {string} fileName
 * @returns {string}
 */
function getFileIcon(fileName) {
  const ext = fileName.split('.').pop()?.toLowerCase();
  const iconMap = {
    // Documents
    pdf: '📄', doc: '📝', docx: '📝', txt: '📃', rtf: '📃',
    // Images
    jpg: '🖼️', jpeg: '🖼️', png: '🖼️', gif: '🖼️', svg: '🖼️', webp: '🖼️',
    // Video
    mp4: '🎬', mkv: '🎬', avi: '🎬', mov: '🎬', webm: '🎬',
    // Audio
    mp3: '🎵', wav: '🎵', flac: '🎵', ogg: '🎵', aac: '🎵',
    // Archives
    zip: '📦', rar: '📦', '7z': '📦', tar: '📦', gz: '📦',
    // Code
    js: '💻', ts: '💻', py: '💻', java: '💻', cs: '💻', cpp: '💻',
    // Data
    json: '📊', csv: '📊', xml: '📊', sql: '📊',
    // Disk images / ISOs
    iso: '💿', img: '💿', dmg: '💿',
  };
  return iconMap[ext] || '📎';
}

/**
 * Recursively traverses dropped items to get all files within directories.
 * @param {FileSystemEntry} item 
 * @param {string} path 
 * @returns {Promise<File[]>}
 */
const traverseFileTree = async (item, path = '') => {
  if (item.isFile) {
    return new Promise((resolve) => {
      item.file((file) => {
        // Attach relative path for recreating folder structure
        Object.defineProperty(file, 'customPath', { value: path + file.name, writable: false });
        resolve([file]);
      });
    });
  } else if (item.isDirectory) {
    const dirReader = item.createReader();
    return new Promise((resolve) => {
      dirReader.readEntries(async (entries) => {
        const files = [];
        for (const entry of entries) {
          files.push(...await traverseFileTree(entry, path + item.name + '/'));
        }
        resolve(files);
      });
    });
  }
  return [];
};

/**
 * @param {Object} props
 * @param {Function} props.onFilesSelected - Callback with array of File objects
 * @param {File[]} props.selectedFiles - Currently selected files
 * @param {boolean} props.disabled - Whether the drop zone is interactive
 */
export default function DropZone({ onFilesSelected, selectedFiles = [], disabled = false }) {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);
  const folderInputRef = useRef(null);
  const dragCounterRef = useRef(0);

  // -------------------------------------------------------------------------
  // Drag event handlers
  // -------------------------------------------------------------------------
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounterRef.current = 0;

    if (disabled) return;

    const items = e.dataTransfer.items;
    const allFiles = [];

    if (items) {
      for (let i = 0; i < items.length; i++) {
        const item = items[i].webkitGetAsEntry();
        if (item) {
          allFiles.push(...await traverseFileTree(item));
        }
      }
    } else {
      // Fallback for older browsers
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        Object.defineProperty(file, 'customPath', { value: file.name, writable: false });
        allFiles.push(file);
      }
    }

    if (allFiles.length > 0) {
      onFilesSelected(allFiles);
    }
  }, [onFilesSelected, disabled]);

  // Click-to-browse handlers
  const handleFileClick = useCallback((e) => {
    e.stopPropagation();
    if (!disabled && fileInputRef.current) fileInputRef.current.click();
  }, [disabled]);

  const handleFolderClick = useCallback((e) => {
    e.stopPropagation();
    if (!disabled && folderInputRef.current) folderInputRef.current.click();
  }, [disabled]);

  const handleFileInput = useCallback((e) => {
    const files = Array.from(e.target.files);
    files.forEach(f => {
      // webkitRelativePath is set by the browser when picking folders
      const path = f.webkitRelativePath || f.name;
      Object.defineProperty(f, 'customPath', { value: path, writable: false });
    });
    if (files.length > 0) {
      onFilesSelected(files);
    }
    // Reset input so the same files can be selected again
    e.target.value = null;
  }, [onFilesSelected]);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={`
        relative group rounded-2xl border-2 border-dashed p-8 text-center
        transition-all duration-300 ease-out
        ${isDragging
          ? 'border-ledo-secondary bg-ledo-secondary/5 scale-[1.02] shadow-[0_0_40px_rgba(0,210,255,0.15)]'
          : selectedFiles.length > 0
            ? 'border-ledo-primary/50 bg-ledo-primary/5'
            : 'border-ledo-border hover:border-ledo-primary/40 hover:bg-ledo-surface/50'
        }
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
      `}
    >
      {/* Hidden file inputs */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />
      <input
        ref={folderInputRef}
        type="file"
        webkitdirectory="true"
        directory="true"
        multiple
        onChange={handleFileInput}
        className="hidden"
        disabled={disabled}
      />

      {/* Animated glow effect on drag */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl animate-pulse bg-gradient-to-r from-ledo-primary/10 to-ledo-secondary/10 pointer-events-none" />
      )}

      {selectedFiles.length > 0 ? (
        // ===================================================================
        // File selected state
        // ===================================================================
        <div className="relative flex flex-col items-center gap-3">
          <span className="text-5xl">
            {selectedFiles.length === 1 ? getFileIcon(selectedFiles[0].name) : '📦'}
          </span>
          <div>
            <p className="text-lg font-semibold text-ledo-text truncate max-w-xs">
              {selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} files selected`}
            </p>
            <p className="text-sm text-ledo-muted mt-1">
              {formatFileSize(selectedFiles.reduce((acc, f) => acc + f.size, 0))}
            </p>
          </div>
          {!disabled && (
            <div className="flex gap-2 mt-2">
              <button onClick={handleFileClick} className="text-xs px-3 py-1.5 rounded bg-ledo-dark/50 hover:bg-ledo-dark border border-ledo-border/50 text-ledo-muted hover:text-ledo-text transition-colors">
                Change Files
              </button>
              <button onClick={handleFolderClick} className="text-xs px-3 py-1.5 rounded bg-ledo-dark/50 hover:bg-ledo-dark border border-ledo-border/50 text-ledo-muted hover:text-ledo-text transition-colors">
                Change Folder
              </button>
            </div>
          )}
        </div>
      ) : (
        // ===================================================================
        // Empty state
        // ===================================================================
        <div className="relative flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-ledo-surface border border-ledo-border/50 flex items-center justify-center group-hover:border-ledo-primary/30 transition-colors duration-300">
              <svg
                className="w-8 h-8 text-ledo-muted group-hover:text-ledo-primary transition-colors duration-300"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
            </div>
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-ledo-primary/20 to-ledo-secondary/20 blur-lg opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          </div>

          <div>
            <p className="text-lg font-medium text-ledo-text">
              Drop files or folders here
            </p>
            <div className="flex items-center justify-center gap-3 mt-2">
              <button 
                onClick={handleFileClick}
                disabled={disabled}
                className="text-sm text-ledo-primary hover:text-ledo-secondary underline decoration-ledo-primary/30 hover:decoration-ledo-secondary/50 underline-offset-2 transition-colors"
              >
                Select Files
              </button>
              <span className="text-ledo-muted text-sm">or</span>
              <button 
                onClick={handleFolderClick}
                disabled={disabled}
                className="text-sm text-ledo-primary hover:text-ledo-secondary underline decoration-ledo-primary/30 hover:decoration-ledo-secondary/50 underline-offset-2 transition-colors"
              >
                Select Folder
              </button>
            </div>
          </div>

          <p className="text-xs text-ledo-muted/50 mt-1">
            Any file type • No size limit • End-to-end encrypted
          </p>
        </div>
      )}
    </div>
  );
}

// Re-export the utility for use in other components
export { formatFileSize };
