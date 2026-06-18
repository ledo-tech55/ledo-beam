/**
 * =============================================================================
 * LEDO-Beam — ProgressBar Component
 * =============================================================================
 * 
 * Real-time transfer progress indicator with:
 * - Animated gradient progress bar
 * - Transfer speed in MB/s
 * - ETA countdown
 * - Bytes transferred / total
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

import React from 'react';

/**
 * Formats bytes into human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * Formats seconds into a human-readable ETA string.
 * @param {number} seconds
 * @returns {string}
 */
function formatETA(seconds) {
  if (seconds <= 0 || !isFinite(seconds)) return '—';
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  }
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return `${h}h ${m}m`;
}

/**
 * @param {Object} props
 * @param {Object} props.progress - { bytesTransferred, totalBytes, percentage, speed, speedMBps, eta }
 * @param {string} props.label - Label text (e.g., "Sending" or "Receiving")
 * @param {boolean} props.isComplete - Whether the transfer is finished
 */
export default function ProgressBar({ progress, label = 'Transferring', isComplete = false }) {
  const { bytesTransferred, totalBytes, percentage, speedMBps, eta } = progress;

  return (
    <div className="w-full space-y-3">
      {/* Header row: label + percentage */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-ledo-text">
          {isComplete ? '✅ Transfer Complete' : label}
        </span>
        <span className={`text-sm font-mono font-bold ${isComplete ? 'text-green-400' : 'text-ledo-secondary'}`}>
          {percentage}%
        </span>
      </div>

      {/* Progress bar track */}
      <div className="relative h-3 rounded-full bg-ledo-surface border border-ledo-border/30 overflow-hidden">
        {/* Animated fill */}
        <div
          className={`
            absolute inset-y-0 left-0 rounded-full transition-all duration-300 ease-out
            ${isComplete
              ? 'bg-gradient-to-r from-green-500 to-emerald-400'
              : 'bg-gradient-to-r from-ledo-primary via-ledo-secondary to-ledo-primary bg-[length:200%_100%] animate-shimmer'
            }
          `}
          style={{ width: `${percentage}%` }}
        />

        {/* Glow effect at the leading edge */}
        {!isComplete && percentage > 0 && percentage < 100 && (
          <div
            className="absolute inset-y-0 w-8 rounded-full bg-white/20 blur-sm transition-all duration-300"
            style={{ left: `calc(${percentage}% - 16px)` }}
          />
        )}
      </div>

      {/* Stats row */}
      <div className="flex items-center justify-between text-xs text-ledo-muted">
        {/* Transferred / Total */}
        <span className="font-mono">
          {formatBytes(bytesTransferred)} / {formatBytes(totalBytes)}
        </span>

        {/* Speed and ETA */}
        {!isComplete && (
          <div className="flex items-center gap-3">
            {/* Speed indicator */}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3 text-ledo-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
              </svg>
              <span className="font-mono text-ledo-text">{speedMBps} MB/s</span>
            </span>

            {/* ETA */}
            <span className="flex items-center gap-1">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span className="font-mono">{formatETA(eta)}</span>
            </span>
          </div>
        )}

        {isComplete && (
          <span className="text-green-400 font-medium">
            Done — {formatBytes(totalBytes)} transferred
          </span>
        )}
      </div>
    </div>
  );
}
