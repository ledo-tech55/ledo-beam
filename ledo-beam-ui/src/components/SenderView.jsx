/**
 * =============================================================================
 * LEDO-Beam — SenderView Component (Redesigned)
 * =============================================================================
 * 
 * Premium sender experience with glassmorphism design, smooth animated
 * state transitions, and a clear step-by-step flow.
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech)
 * =============================================================================
 */

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { generateKey } from '../hooks/useCrypto';
import { useSignaling } from '../hooks/useSignaling';
import { useWebRTC } from '../hooks/useWebRTC';
import DropZone, { formatFileSize } from './DropZone';
import ProgressBar from './ProgressBar';

/* ========================================================================== */
/* Helpers                                                                     */
/* ========================================================================== */

const ROOM_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function generateRoomId() {
  const array = new Uint8Array(6);
  window.crypto.getRandomValues(array);
  return Array.from(array, (byte) => ROOM_CHARS[byte % ROOM_CHARS.length]).join('');
}

/* Step definitions for the progress tracker */
const STEPS = [
  { key: 'select', label: 'Select', icon: '📁' },
  { key: 'share', label: 'Share', icon: '🔗' },
  { key: 'connect', label: 'Connect', icon: '🤝' },
  { key: 'transfer', label: 'Transfer', icon: '⚡' },
  { key: 'done', label: 'Done', icon: '✅' },
];

function getActiveStep(status) {
  switch (status) {
    case 'idle':
    case 'preparing':
      return 0;
    case 'waiting':
      return 1;
    case 'connected':
    case 'waiting_for_consent':
      return 2;
    case 'transferring':
      return 3;
    case 'complete':
      return 4;
    default:
      return 0;
  }
}

/* Framer Motion variants */
const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.97 },
  visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease: [0.22, 1, 0.36, 1] } },
  exit: { opacity: 0, y: -16, scale: 0.97, transition: { duration: 0.25 } },
};

/* ========================================================================== */
/* Component                                                                   */
/* ========================================================================== */

export default function SenderView() {
  /* State ------------------------------------------------------------------ */
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('idle');

  /* Refs ------------------------------------------------------------------- */
  const roomIdRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const cryptoNonceRef = useRef(null);
  const filesRef = useRef([]);
  const hasInitiatedOffer = useRef(false);
  const webrtcRef = useRef(null);

  /* Signaling callbacks ---------------------------------------------------- */
  const onPeerJoined = useCallback(() => {
    console.log('[Sender] Peer joined! Creating WebRTC offer...');
    setConnectionStatus('connected');
    setTimeout(() => {
      if (!hasInitiatedOffer.current && webrtcRef.current) {
        hasInitiatedOffer.current = true;
        webrtcRef.current.createOffer();
      }
    }, 300);
  }, []);

  const onReceiveSignal = useCallback((connectionId, signal) => {
    webrtcRef.current?.handleSignal(signal);
  }, []);

  const onPeerDisconnected = useCallback(() => {
    console.log('[Sender] Peer disconnected');
    setConnectionStatus('error');
  }, []);

  const onConnectionStateChange = useCallback((state) => {
    console.log('[Sender] SignalR state:', state);
  }, []);

  /* Hooks ------------------------------------------------------------------ */
  const signaling = useSignaling({
    onPeerJoined,
    onReceiveSignal,
    onPeerDisconnected,
    onConnectionStateChange,
  });

  const webrtc = useWebRTC({
    sendSignal: signaling.sendSignal,
    roomId: roomIdRef.current || '',
  });
  webrtcRef.current = webrtc;

  /* Sync WebRTC status → UI status ----------------------------------------- */
  useEffect(() => {
    const map = {
      waiting_for_consent: 'waiting_for_consent',
      declined: 'declined',
      transferring: 'transferring',
      complete: 'complete',
      connected: (prev) => (prev === 'waiting' ? 'connected' : prev),
      error: 'error',
    };
    setConnectionStatus((prev) => {
      const next = map[webrtc.status];
      if (typeof next === 'function') return next(prev);
      return next || prev;
    });
  }, [webrtc.status]);

  /* Actions ---------------------------------------------------------------- */
  const handleFilesSelected = useCallback(
    async (files) => {
      setSelectedFiles(files);
      filesRef.current = files;
      setConnectionStatus('preparing');
      hasInitiatedOffer.current = false;

      try {
        const { cryptoKey, keyBase64, nonceBase64 } = await generateKey();
        cryptoKeyRef.current = cryptoKey;

        const raw = atob(nonceBase64.replace(/-/g, '+').replace(/_/g, '/'));
        cryptoNonceRef.current = new Uint8Array(raw.split('').map((c) => c.charCodeAt(0)));

        const roomId = generateRoomId();
        roomIdRef.current = roomId;

        const baseUrl = window.location.origin + window.location.pathname;
        setShareLink(`${baseUrl}#${roomId}#${keyBase64}#${nonceBase64}`);

        await signaling.connect();
        await signaling.joinRoom(roomId);
        setConnectionStatus('waiting');
      } catch (error) {
        console.error('[Sender] Setup failed:', error);
        setConnectionStatus('error');
      }
    },
    [signaling]
  );

  const handleStartSending = () => {
    if (filesRef.current.length && cryptoKeyRef.current) {
      setConnectionStatus('waiting_for_consent');
      webrtc.sendFiles(filesRef.current, cryptoKeyRef.current, cryptoNonceRef.current);
    }
  };

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    } catch {
      const ta = document.createElement('textarea');
      ta.value = shareLink;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    }
  }, [shareLink]);

  const activeStep = getActiveStep(connectionStatus);

  /* Render ================================================================= */
  return (
    <div className="w-full max-w-2xl mx-auto flex flex-col items-center gap-10 py-8 px-4">

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Hero heading                                                        */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="text-center space-y-3">
        <h2 className="text-4xl font-extrabold tracking-tight">
          <span className="text-ledo-text">Send Files,</span>{' '}
          <span className="bg-gradient-to-r from-ledo-primary to-ledo-secondary bg-clip-text text-transparent">
            Securely
          </span>
        </h2>
        <p className="text-ledo-muted text-base max-w-lg mx-auto leading-relaxed">
          Encrypted locally with AES-256-GCM, transferred peer‑to‑peer.
          No server ever touches your data.
        </p>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Step Progress Tracker                                                */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-between relative">
          {/* Connecting rail */}
          <div className="absolute top-4 left-[10%] right-[10%] h-[2px] bg-ledo-border/40" />
          {/* Active rail overlay */}
          <div
            className="absolute top-4 left-[10%] h-[2px] bg-gradient-to-r from-ledo-primary to-ledo-secondary transition-all duration-700 ease-out"
            style={{ width: `${Math.min(activeStep / (STEPS.length - 1), 1) * 80}%` }}
          />

          {STEPS.map((step, idx) => {
            const isPast = idx < activeStep;
            const isActive = idx === activeStep;

            return (
              <div key={step.key} className="relative z-10 flex flex-col items-center gap-1.5" style={{ width: '20%' }}>
                <div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold
                    transition-all duration-500 ease-out
                    ${isPast
                      ? 'bg-gradient-to-br from-green-400 to-emerald-500 text-white shadow-lg shadow-green-500/25'
                      : isActive
                        ? 'bg-gradient-to-br from-ledo-primary to-ledo-secondary text-white shadow-lg shadow-ledo-primary/30 ring-4 ring-ledo-primary/10'
                        : 'bg-ledo-surface border border-ledo-border text-ledo-muted'
                    }
                  `}
                >
                  {isPast ? (
                    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><polyline points="20 6 9 17 4 12" /></svg>
                  ) : (
                    idx + 1
                  )}
                </div>
                <span className={`text-[11px] font-medium ${isActive ? 'text-ledo-text' : isPast ? 'text-green-400/80' : 'text-ledo-muted/60'}`}>
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ──────────────────────────────────────────────────────────────────── */}
      {/* Dynamic Content Area                                                 */}
      {/* ──────────────────────────────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* ── Step 1: File Selection ─────────────────────────────────────── */}
        {connectionStatus === 'idle' && (
          <motion.div key="step-select" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="w-full space-y-5">
            <DropZone
              onFilesSelected={handleFilesSelected}
              selectedFiles={selectedFiles}
              disabled={connectionStatus !== 'idle'}
            />

            {/* Feature badges */}
            <div className="flex flex-wrap justify-center gap-3">
              {[
                { icon: '🔐', text: 'AES-256-GCM' },
                { icon: '🌐', text: 'Peer-to-Peer' },
                { icon: '🚫', text: 'Zero Server Storage' },
              ].map((b) => (
                <div key={b.text} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-ledo-surface/60 border border-ledo-border/40 text-xs text-ledo-muted backdrop-blur-sm">
                  <span>{b.icon}</span>
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* ── Steps 2–5: Post-file-selection states ──────────────────────── */}
        {(shareLink || connectionStatus === 'error') && (
          <motion.div key="step-post-select" variants={cardVariants} initial="hidden" animate="visible" exit="exit" className="w-full space-y-5">

            {/* Share Link Card */}
            {shareLink && (
            <div className="rounded-2xl bg-ledo-surface/70 border border-ledo-border/40 backdrop-blur-md p-5 shadow-xl shadow-black/20 space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-2.5 h-2.5 rounded-full bg-ledo-secondary animate-pulse shadow-lg shadow-ledo-secondary/40" />
                <span className="text-sm font-semibold text-ledo-text tracking-wide">Share Link</span>
              </div>

              <div className="flex items-stretch gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 min-w-0 bg-ledo-dark/60 border border-ledo-border/40 rounded-xl px-4 py-3 text-sm text-ledo-muted/80 font-mono truncate focus:outline-none focus:ring-2 focus:ring-ledo-primary/30 transition-shadow"
                />
                <button
                  onClick={copyLink}
                  className={`
                    shrink-0 px-5 py-3 rounded-xl text-sm font-bold transition-all duration-300
                    ${copied
                      ? 'bg-green-500/15 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/10'
                      : 'bg-gradient-to-r from-ledo-primary to-ledo-primary/80 hover:from-ledo-primary hover:to-ledo-secondary text-white shadow-lg shadow-ledo-primary/20 hover:shadow-ledo-primary/40'
                    }
                  `}
                >
                  {copied ? '✓ Copied!' : 'Copy Link'}
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-ledo-muted/50">
                <svg className="w-3.5 h-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0110 0v4" />
                </svg>
                <span>Encryption key stays in the URL fragment — never sent to any server</span>
              </div>
            </div>
            )}

            {/* Status Card */}
            <div className="rounded-2xl bg-ledo-surface/70 border border-ledo-border/40 backdrop-blur-md shadow-xl shadow-black/20 overflow-hidden">
              <AnimatePresence mode="wait">

                {/* Waiting */}
                {connectionStatus === 'waiting' && (
                  <motion.div key="s-waiting" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-12 px-6">
                    <div className="relative w-16 h-16">
                      <div className="absolute inset-0 rounded-full border-[3px] border-ledo-primary/20 border-t-ledo-primary animate-spin" />
                      <div className="absolute inset-0 rounded-full border-[3px] border-ledo-secondary/10 border-b-ledo-secondary animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 rounded-full bg-ledo-primary animate-pulse" />
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-base font-semibold text-ledo-text">Waiting for receiver…</p>
                      <p className="text-sm text-ledo-muted mt-1.5">Send the link above. Keep this page open.</p>
                    </div>
                  </motion.div>
                )}

                {/* Connected */}
                {connectionStatus === 'connected' && (
                  <motion.div key="s-connected" initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-6 py-12 px-6">
                    <div className="relative">
                      <div className="w-20 h-20 rounded-full bg-green-500/10 border-2 border-green-500/20 flex items-center justify-center">
                        <svg className="w-10 h-10 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                      </div>
                      <div className="absolute inset-0 rounded-full border-2 border-green-400/20 animate-ping" />
                    </div>
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-green-400">Receiver Connected!</h3>
                      <p className="text-sm text-ledo-muted mt-2 max-w-xs">
                        Secure P2P tunnel established. Ready to begin transfer.
                      </p>
                    </div>
                    <button
                      onClick={handleStartSending}
                      className="group relative px-8 py-3.5 rounded-xl bg-gradient-to-r from-ledo-primary to-ledo-secondary text-white font-bold tracking-wide transition-all duration-300 shadow-xl shadow-ledo-primary/25 hover:shadow-ledo-primary/50 hover:scale-[1.03] active:scale-[0.98]"
                    >
                      <span className="relative z-10 flex items-center gap-2">
                        <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 2L11 13" /><path d="M22 2L15 22L11 13L2 9L22 2Z" /></svg>
                        Start Transfer
                      </span>
                    </button>
                  </motion.div>
                )}

                {/* Waiting for Consent */}
                {connectionStatus === 'waiting_for_consent' && (
                  <motion.div key="s-consent" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-12 px-6">
                    <div className="w-14 h-14 rounded-full border-[3px] border-amber-400/20 border-t-amber-400 animate-spin" />
                    <div className="text-center">
                      <p className="text-lg font-semibold text-amber-400">Awaiting Approval…</p>
                      <p className="text-sm text-ledo-muted mt-1.5">The receiver must accept the transfer request.</p>
                    </div>
                  </motion.div>
                )}

                {/* Declined */}
                {connectionStatus === 'declined' && (
                  <motion.div key="s-declined" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-12 px-6">
                    <div className="w-18 h-18 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center p-4">
                      <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-400">Transfer Declined</p>
                      <p className="text-sm text-ledo-muted mt-1">The receiver rejected the file(s).</p>
                    </div>
                    <button onClick={() => window.location.reload()} className="px-5 py-2 rounded-lg bg-ledo-surface border border-ledo-border hover:border-ledo-primary/50 text-ledo-text text-sm font-medium transition-all">
                      Try Again
                    </button>
                  </motion.div>
                )}

                {/* Transferring / Complete */}
                {(connectionStatus === 'transferring' || connectionStatus === 'complete') && (
                  <motion.div key="s-transfer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="w-full p-6 space-y-5">
                    <ProgressBar
                      progress={webrtc.progress}
                      label={
                        webrtc.isPaused
                          ? `Paused — ${selectedFiles.length} file(s)`
                          : connectionStatus === 'complete'
                            ? 'Transfer Complete'
                            : `Sending ${selectedFiles.length} file(s)…`
                      }
                      isComplete={connectionStatus === 'complete'}
                    />

                    {/* Pause / Resume controls */}
                    {connectionStatus === 'transferring' && (
                      <div className="flex justify-center pt-2">
                        {webrtc.isPaused ? (
                          <button
                            onClick={webrtc.resumeTransfer}
                            className="group flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-green-500/10 text-green-400 border border-green-500/25 hover:bg-green-500/20 hover:border-green-500/40 transition-all font-semibold text-sm"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Resume
                          </button>
                        ) : (
                          <button
                            onClick={webrtc.pauseTransfer}
                            className="group flex items-center gap-2.5 px-6 py-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/25 hover:bg-amber-500/20 hover:border-amber-500/40 transition-all font-semibold text-sm"
                          >
                            <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24"><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></svg>
                            Pause
                          </button>
                        )}
                      </div>
                    )}

                    {/* Completion banner */}
                    {connectionStatus === 'complete' && (
                      <div className="flex flex-col items-center gap-4 pt-4 animate-fade-in">
                        <div className="flex items-center gap-2.5 px-5 py-2.5 rounded-full bg-green-500/10 border border-green-500/20">
                          <svg className="w-5 h-5 text-green-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                          <span className="text-green-400 font-bold text-sm">All files sent successfully!</span>
                        </div>
                        <p className="text-xs text-ledo-muted">
                          {formatFileSize(selectedFiles.reduce((a, f) => a + f.size, 0))} transferred via end-to-end encryption.
                        </p>
                        <button
                          onClick={() => window.location.reload()}
                          className="px-6 py-2.5 rounded-xl bg-ledo-surface border border-ledo-border hover:border-ledo-primary/50 text-ledo-text text-sm font-medium transition-all"
                        >
                          Send More Files
                        </button>
                      </div>
                    )}
                  </motion.div>
                )}

                {/* Error */}
                {connectionStatus === 'error' && (
                  <motion.div key="s-error" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex flex-col items-center gap-5 py-12 px-6">
                    <div className="w-18 h-18 rounded-full bg-red-500/10 border-2 border-red-500/20 flex items-center justify-center p-4">
                      <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                    </div>
                    <div className="text-center">
                      <p className="text-lg font-bold text-red-400">Connection Failed</p>
                      <p className="text-sm text-ledo-muted mt-2 max-w-sm leading-relaxed">
                        The peer may be behind a restrictive firewall (Symmetric NAT), or a browser privacy extension is blocking WebRTC. Try using <strong className="text-ledo-text">Chrome</strong> or <strong className="text-ledo-text">Edge</strong>.
                      </p>
                    </div>
                    <button onClick={() => window.location.reload()} className="px-5 py-2.5 rounded-xl bg-ledo-surface border border-ledo-border hover:border-ledo-primary/50 text-ledo-text text-sm font-medium transition-all">
                      Retry
                    </button>
                  </motion.div>
                )}

              </AnimatePresence>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}
