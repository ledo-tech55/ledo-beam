/**
 * =============================================================================
 * LEDO-Beam — ReceiverView Component (Redesigned)
 * =============================================================================
 * 
 * Premium receiver experience with glassmorphism, animated state transitions,
 * and clear user feedback at every step.
 * 
 * BROWSER COMPATIBILITY:
 * - Chromium (Chrome, Edge, Brave): Uses FileSystemWritableFileStream
 *   for direct-to-disk streaming. Can handle 50GB+ files.
 * - Firefox/Safari: Falls back to Blob assembly in RAM. Shows a warning
 *   for files >2GB.
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { importKey } from '../hooks/useCrypto';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import ProgressBar from './ProgressBar';

/**
 * Formats bytes into a human-readable string.
 * @param {number} bytes
 * @returns {string}
 */
function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i];
}

/**
 * Detects whether the File System Access API is available.
 * @returns {boolean}
 */
function hasFileSystemAccess() {
  return 'showSaveFilePicker' in window;
}

/**
 * @param {Object} props
 * @param {string} props.roomId - Room ID extracted from URL hash
 * @param {string} props.keyBase64 - Base64-encoded AES key from URL hash
 * @param {string} props.nonceBase64 - Base64-encoded nonce from URL hash
 */
export default function ReceiverView({ roomId, keyBase64, nonceBase64 }) {
  /* State ================================================================== */
  const [connectionStatus, setConnectionStatus] = useState('connecting');
  const [errorMessage, setErrorMessage] = useState('');

  const initializedRef = useRef(false);
  const isChromium = hasFileSystemAccess();

  /* Signaling callbacks ==================================================== */
  const onPeerJoined = useCallback(() => {
    console.log('[Receiver] Peer joined (sender reconnected)');
  }, []);

  const onReceiveSignal = useCallback((connectionId, signal) => {
    webrtcRef.current?.handleSignal(signal);
  }, []);

  const onPeerDisconnected = useCallback(() => {
    console.log('[Receiver] Sender disconnected');
    if (webrtcRef.current?.status !== 'complete') {
      setConnectionStatus('error');
      setErrorMessage('The sender disconnected before the transfer completed.');
    }
  }, []);

  const onConnectionStateChange = useCallback((state) => {
    console.log('[Receiver] SignalR state:', state);
    if (state === 'failed') {
      setConnectionStatus('error');
      setErrorMessage('Failed to connect to the signaling server. Please check your connection.');
    }
  }, []);

  /* Hooks ================================================================== */
  const signaling = useSignaling({
    onPeerJoined,
    onReceiveSignal,
    onPeerDisconnected,
    onConnectionStateChange,
  });

  const webrtc = useWebRTC({
    sendSignal: signaling.sendSignal,
    roomId,
  });

  const webrtcRef = useRef(webrtc);
  webrtcRef.current = webrtc;

  /* Sync WebRTC status → UI ================================================ */
  useEffect(() => {
    if (webrtc.status === 'connected') setConnectionStatus('connected');
    if (webrtc.status === 'confirm_receive') setConnectionStatus('confirm_receive');
    if (webrtc.status === 'declined') setConnectionStatus('declined');
    if (webrtc.status === 'transferring') setConnectionStatus('transferring');
    if (webrtc.status === 'complete') setConnectionStatus('complete');
    if (webrtc.status === 'error') {
      setConnectionStatus('error');
      setErrorMessage('WebRTC connection failed. You may be behind a symmetric NAT (corporate firewall). Try a different network.');
    }
  }, [webrtc.status]);

  /* Initialize ============================================================= */
  useEffect(() => {
    if (initializedRef.current) return;
    initializedRef.current = true;

    async function init() {
      try {
        console.log('[Receiver] Importing AES key from URL fragment...');
        const cryptoKey = await importKey(keyBase64);
        webrtc.setCryptoKey(cryptoKey);

        console.log('[Receiver] Connecting to signaling server...');
        await signaling.connect();

        await signaling.joinRoom(roomId);
        setConnectionStatus('waiting');

        console.log('[Receiver] Joined room:', roomId, '— waiting for sender\'s offer');
      } catch (error) {
        console.error('[Receiver] Initialization failed:', error);
        setConnectionStatus('error');
        setErrorMessage(error.message || 'Failed to initialize. The link may be invalid.');
      }
    }

    init();
  }, []); // One-time init on mount

  /* Render ================================================================= */
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-8 py-8 px-4">

      {/* Hero ─────────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-extrabold tracking-tight">
          <span className="text-ledo-text">Receive Files</span>
        </h2>
        <p className="text-ledo-muted text-base max-w-md mx-auto leading-relaxed">
          Receiving end-to-end encrypted files directly from the sender's browser.
        </p>
      </div>

      {/* Browser warning ──────────────────────────────────────────────────── */}
      {!isChromium && (
        <div className="w-full rounded-xl bg-amber-500/5 border border-amber-500/20 backdrop-blur-sm p-4 flex items-start gap-3 animate-fade-in">
          <div className="shrink-0 w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center mt-0.5">
            <svg className="w-5 h-5 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-amber-400">Browser Limitation</p>
            <p className="text-xs text-amber-300/60 mt-1 leading-relaxed">
              For files larger than 2 GB, use Chrome, Edge, or Brave.
              Firefox and Safari must hold the entire file in memory.
            </p>
          </div>
        </div>
      )}

      {/* Status card ──────────────────────────────────────────────────────── */}
      <div className="w-full rounded-2xl bg-ledo-surface/70 border border-ledo-border/40 backdrop-blur-md shadow-xl shadow-black/20 overflow-hidden">

        {/* Connecting */}
        {connectionStatus === 'connecting' && (
          <div className="flex flex-col items-center gap-5 py-14 px-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-[3px] border-ledo-primary/20 border-t-ledo-primary animate-spin" />
              <div className="absolute inset-0 rounded-full border-[3px] border-ledo-secondary/10 border-b-ledo-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-ledo-text">Connecting to server…</p>
              <p className="text-sm text-ledo-muted mt-1.5">Establishing secure signaling channel</p>
            </div>
          </div>
        )}

        {/* Waiting for sender */}
        {connectionStatus === 'waiting' && (
          <div className="flex flex-col items-center gap-5 py-14 px-6">
            <div className="relative w-16 h-16">
              <div className="absolute inset-0 rounded-full border-2 border-ledo-secondary/25 animate-pulse" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg className="w-8 h-8 text-ledo-secondary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M12 2L12 22" />
                  <path d="M17 17L12 22L7 17" />
                  <circle cx="12" cy="8" r="2" fill="currentColor" />
                </svg>
              </div>
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-ledo-text">Waiting for sender…</p>
              <p className="text-sm text-ledo-muted mt-1.5">Connected to room. Transfer will start automatically.</p>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-ledo-primary/5 border border-ledo-primary/15">
              <svg className="w-3.5 h-3.5 text-ledo-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
              <span className="text-xs text-ledo-primary font-medium">AES-256-GCM encryption active</span>
            </div>
          </div>
        )}

        {/* Peer connected — negotiating */}
        {connectionStatus === 'connected' && (
          <div className="flex flex-col items-center gap-5 py-14 px-6">
            <div className="w-16 h-16 rounded-full bg-ledo-secondary/10 border border-ledo-secondary/20 flex items-center justify-center">
              <div className="w-4 h-4 rounded-full bg-ledo-secondary animate-pulse shadow-lg shadow-ledo-secondary/40" />
            </div>
            <div className="text-center">
              <p className="text-base font-semibold text-ledo-text">Peer connected!</p>
              <p className="text-sm text-ledo-muted mt-1.5">Establishing encrypted data channel…</p>
            </div>
          </div>
        )}

        {/* Confirm receive */}
        {connectionStatus === 'confirm_receive' && webrtc.incomingFile && (
          <div className="flex flex-col items-center gap-6 py-10 px-6 animate-fade-in">
            <div className="w-18 h-18 rounded-full bg-ledo-primary/15 border-2 border-ledo-primary/20 flex items-center justify-center p-4">
              <svg className="w-10 h-10 text-ledo-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>

            <div className="w-full max-w-sm rounded-xl bg-ledo-dark/60 border border-ledo-border/40 p-5 text-center space-y-2">
              <h3 className="text-lg font-bold text-ledo-text">Incoming Transfer</h3>
              <p className="text-sm text-ledo-primary font-semibold truncate">{webrtc.incomingFile.fileName}</p>
              <p className="text-xs text-ledo-muted">{formatFileSize(webrtc.incomingFile.fileSize)}</p>
            </div>

            <div className="flex gap-3 w-full max-w-sm">
              <button
                onClick={webrtc.declineTransfer}
                className="flex-1 py-3 rounded-xl bg-ledo-surface border border-ledo-border hover:border-red-500/40 hover:bg-red-500/5 text-ledo-text hover:text-red-400 font-semibold text-sm transition-all duration-300"
              >
                Decline
              </button>
              <button
                onClick={webrtc.acceptTransfer}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-ledo-primary to-ledo-secondary text-white font-bold text-sm transition-all duration-300 shadow-lg shadow-ledo-primary/20 hover:shadow-ledo-primary/40 hover:scale-[1.02] active:scale-[0.98]"
              >
                Accept & Download
              </button>
            </div>
          </div>
        )}

        {/* Declined */}
        {connectionStatus === 'declined' && (
          <div className="flex flex-col items-center gap-5 py-14 px-6 animate-fade-in">
            <div className="w-18 h-18 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center p-4">
              <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">Transfer Declined</p>
              <p className="text-sm text-ledo-muted mt-1">You declined the incoming files.</p>
            </div>
          </div>
        )}

        {/* Transferring */}
        {connectionStatus === 'transferring' && (
          <div className="w-full p-6 space-y-5">
            <ProgressBar
              progress={webrtc.progress}
              label={webrtc.isPaused ? 'Transfer Paused' : 'Receiving…'}
            />
            <div className="flex justify-center pt-1">
              {webrtc.isPaused ? (
                <button
                  onClick={webrtc.resumeTransfer}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500/20 hover:border-green-500/40 transition-all font-semibold text-sm"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                  Resume
                </button>
              ) : (
                <button
                  onClick={webrtc.pauseTransfer}
                  className="flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all font-semibold text-sm"
                >
                  <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                  Pause
                </button>
              )}
            </div>
          </div>
        )}

        {/* Complete */}
        {connectionStatus === 'complete' && (
          <div className="flex flex-col items-center gap-5 py-12 px-6">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <div className="absolute inset-0 rounded-full border-2 border-green-400/20 animate-ping" />
            </div>

            <div className="text-center">
              <h3 className="text-xl font-bold text-green-400">Transfer Complete!</h3>
              {webrtc.incomingFile && (
                <p className="text-sm text-ledo-muted mt-2">
                  {webrtc.incomingFile.fileName} — {formatFileSize(webrtc.incomingFile.fileSize)}
                </p>
              )}
            </div>

            <ProgressBar
              progress={webrtc.progress}
              label="Received"
              isComplete={true}
            />

            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/5 border border-green-500/15">
              <svg className="w-3.5 h-3.5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              <span className="text-xs text-green-400 font-medium">Decrypted with AES-256-GCM • Zero server contact</span>
            </div>
          </div>
        )}

        {/* Error */}
        {connectionStatus === 'error' && (
          <div className="flex flex-col items-center gap-5 py-14 px-6">
            <div className="w-18 h-18 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center p-4">
              <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-400">Connection Error</p>
              <p className="text-sm text-ledo-muted mt-2 max-w-sm leading-relaxed">
                {errorMessage || 'Something went wrong. Please ask the sender for a new link.'}
              </p>
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 rounded-xl bg-ledo-surface border border-ledo-border hover:border-ledo-primary/50 text-ledo-text text-sm font-medium transition-all"
            >
              Try Again
            </button>
          </div>
        )}
      </div>

      {/* Security badges ──────────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        {[
          { icon: '🔐', label: 'End-to-End Encrypted' },
          { icon: '📡', label: 'Direct P2P Transfer' },
          { icon: '🧹', label: 'Nothing Stored on Server' },
        ].map(({ icon, label }) => (
          <div
            key={label}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ledo-surface/50 border border-ledo-border/30 backdrop-blur-sm text-xs text-ledo-muted"
          >
            <span>{icon}</span>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
