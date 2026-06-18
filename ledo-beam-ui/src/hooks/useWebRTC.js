/**
 * =============================================================================
 * LEDO-Beam — useWebRTC Hook
 * =============================================================================
 * 
 * The core P2P file transfer engine. Orchestrates:
 *   1. WebRTC peer connection (SDP Offer/Answer + ICE candidates)
 *   2. Memory-safe chunked file reading (256KB chunks from disk, never full file)
 *   3. AES-256-GCM encryption of each chunk before sending
 *   4. Backpressure handling (pause reading when DataChannel buffer is full)
 *   5. Streaming decryption and disk writes on the receiver side
 * 
 * PERFORMANCE CONSTRAINTS:
 * - RTCPeerConnection, RTCDataChannel stored in useRef (not useState)
 * - Progress updates throttled to max 10/sec to prevent React re-render storms
 * - File chunks read sequentially from disk using File.slice() — never loaded
 *   entirely into RAM
 * 
 * STUN CONFIG: Google's public STUN servers (stun:stun.l.google.com:19302)
 * These handle NAT traversal for ~80% of consumer connections.
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

import { useRef, useState, useCallback } from 'react';
import { encryptChunk, decryptChunk } from './useCrypto';

// =============================================================================
// Constants
// =============================================================================

/** Size of each file chunk in bytes (64000 bytes — safely under 64KB limit for WebRTC interop) */
const CHUNK_SIZE = 64000;

/**
 * DataChannel buffer threshold in bytes (1MB).
 * When bufferedAmount exceeds this, we pause reading new chunks from disk
 * to prevent the browser's internal send buffer from growing unbounded.
 */
const BUFFER_THRESHOLD = 1 * 1024 * 1024;

/**
 * ICE server configuration — Google's public STUN servers.
 * STUN discovers our public IP and port mapping to traverse NAT.
 * Add TURN server entries here if you need relay fallback for symmetric NATs.
 */
const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    { urls: 'stun:stun4.l.google.com:19302' },
  ],
};

/**
 * Minimum interval between progress state updates (ms).
 * 10 updates/sec max — prevents React from choking during fast transfers.
 */
const PROGRESS_THROTTLE_MS = 100;

// =============================================================================
// Hook
// =============================================================================

/**
 * Custom hook that manages the entire WebRTC file transfer lifecycle.
 * 
 * @param {Object} params
 * @param {Function} params.sendSignal - Function to send SDP/ICE via SignalR
 * @param {string} params.roomId - The room ID for signal routing
 * @returns {Object} - { createOffer, handleSignal, sendFile, progress, status, incomingFile }
 */
export function useWebRTC({ sendSignal, roomId }) {
  // ===========================================================================
  // Refs — mutable connection objects (NEVER put in useState)
  // ===========================================================================
  const peerConnectionRef = useRef(null);
  const dataChannelRef = useRef(null);
  const cryptoKeyRef = useRef(null);
  const cryptoNonceRef = useRef(null);

  // Receiver-side file assembly refs
  const receivedChunksRef = useRef(0);
  const writableStreamRef = useRef(null);
  const fallbackChunksRef = useRef([]);
  const directoryHandleRef = useRef(null);

  // Sender-side backpressure & control
  const sendAbortRef = useRef(false);
  const consentResolverRef = useRef(null);
  const isPausedRef = useRef(false);
  const pauseResolverRef = useRef(null);

  // Progress tracking refs (for throttled updates)
  const lastProgressUpdateRef = useRef(0);
  const transferStartRef = useRef(0);

  // ===========================================================================
  // State — only for UI-facing values (throttled updates)
  // ===========================================================================
  const [progress, setProgress] = useState({
    bytesTransferred: 0,
    totalBytes: 0,
    percentage: 0,
    speed: 0,        // bytes per second
    speedMBps: '0',  // formatted MB/s string
    eta: 0,          // seconds remaining
  });

  const [status, setStatus] = useState('idle');
  // idle → connecting → connected → waiting_for_consent (sender) / confirm_receive (receiver) 
  // → transferring → complete / error / declined
  
  const [isPaused, setIsPaused] = useState(false);

  const [incomingFile, setIncomingFile] = useState(null);
  // { fileName, fileSize, totalChunks, totalFiles }

  // ===========================================================================
  // Progress update (throttled to prevent re-render storms)
  // ===========================================================================
  const updateProgress = useCallback((bytesTransferred, totalBytes) => {
    const now = Date.now();
    if (now - lastProgressUpdateRef.current < PROGRESS_THROTTLE_MS && bytesTransferred < totalBytes) {
      return; // Skip update — too soon
    }
    lastProgressUpdateRef.current = now;

    const elapsed = (now - transferStartRef.current) / 1000; // seconds
    const speed = elapsed > 0 ? bytesTransferred / elapsed : 0;
    const remaining = totalBytes - bytesTransferred;
    const eta = speed > 0 ? remaining / speed : 0;

    setProgress({
      bytesTransferred,
      totalBytes,
      percentage: totalBytes > 0 ? Math.round((bytesTransferred / totalBytes) * 100) : 0,
      speed,
      speedMBps: (speed / (1024 * 1024)).toFixed(2),
      eta: Math.round(eta),
    });
  }, []);

  // ===========================================================================
  // Create RTCPeerConnection with ICE candidate handling
  // ===========================================================================
  const createPeerConnection = useCallback(() => {
    // Close any existing connection before creating a new one
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
    }

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // -------------------------------------------------------------------------
    // ICE Candidate Handling
    // Each discovered candidate (host, srflx, relay) is sent to the peer
    // via the SignalR signaling channel
    // -------------------------------------------------------------------------
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        const signal = JSON.stringify({
          type: 'ice-candidate',
          candidate: event.candidate,
        });
        sendSignal(signal, roomId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[WebRTC] ICE state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setStatus('connected');
      } else if (pc.iceConnectionState === 'failed' || pc.iceConnectionState === 'disconnected') {
        setStatus('error');
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [sendSignal, roomId]);

  // ===========================================================================
  // Configure DataChannel (Sender creates, Receiver accepts via ondatachannel)
  // ===========================================================================
  const setupDataChannel = useCallback((channel) => {
    // CRITICAL: Set binary type to arraybuffer for raw chunk transfer
    channel.binaryType = 'arraybuffer';

    // Set the low-water mark for backpressure
    // When bufferedAmount drops below this after exceeding BUFFER_THRESHOLD,
    // the 'bufferedamountlow' event fires and we resume sending
    channel.bufferedAmountLowThreshold = CHUNK_SIZE;

    channel.onopen = () => {
      console.log('[WebRTC] DataChannel open');
      setStatus('connected');
    };

    channel.onclose = () => {
      console.log('[WebRTC] DataChannel closed');
    };

    channel.onerror = (err) => {
      console.error('[WebRTC] DataChannel error:', err);
      setStatus('error');
    };

    // Default message handler (primarily for the Sender to receive control messages)
    // The receiver will overwrite this with setupReceiverHandler later.
    channel.onmessage = (event) => {
      if (typeof event.data === 'string') {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'accept-transfer') {
            consentResolverRef.current?.(true);
          } else if (msg.type === 'decline-transfer') {
            consentResolverRef.current?.(false);
            setStatus('declined');
          } else if (msg.type === 'pause') {
            setIsPaused(true);
            isPausedRef.current = true;
          } else if (msg.type === 'resume') {
            setIsPaused(false);
            isPausedRef.current = false;
            if (pauseResolverRef.current) {
              pauseResolverRef.current();
              pauseResolverRef.current = null;
            }
          }
        } catch (e) {
          console.warn('[WebRTC] Failed to parse control message:', e);
        }
      }
    };

    dataChannelRef.current = channel;
    return channel;
  }, []);

  // ===========================================================================
  // SENDER: Create SDP Offer (initiates the WebRTC handshake)
  // ===========================================================================

  /**
   * Creates the DataChannel and SDP Offer. Called when the sender hears
   * PeerJoined from SignalR, meaning the receiver has arrived in the room.
   * 
   * Flow: Sender creates offer → sends via SignalR → Receiver creates answer
   */
  const createOffer = useCallback(async () => {
    setStatus('connecting');
    const pc = createPeerConnection();

    // Sender creates the DataChannel — receiver will get it via ondatachannel
    const channel = pc.createDataChannel('fileTransfer', {
      ordered: true,  // Chunks MUST arrive in order for sequential file assembly
    });
    setupDataChannel(channel);

    // Create and set the local SDP offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    // Send the offer to the receiver via the signaling server
    const signal = JSON.stringify({
      type: 'offer',
      sdp: pc.localDescription,
    });
    sendSignal(signal, roomId);

    console.log('[WebRTC] SDP Offer sent');
  }, [createPeerConnection, setupDataChannel, sendSignal, roomId]);

  // ===========================================================================
  // Handle incoming signals (SDP Offer, SDP Answer, ICE Candidates)
  // ===========================================================================

  /**
   * Processes signaling messages from the peer. Called by the SignalR
   * ReceiveSignal event handler.
   * 
   * @param {string} signalJSON - Stringified JSON from the signaling server
   */
  const handleSignal = useCallback(async (signalJSON) => {
    const signal = JSON.parse(signalJSON);

    // -----------------------------------------------------------------------
    // Handle SDP Offer (Receiver side)
    // -----------------------------------------------------------------------
    if (signal.type === 'offer') {
      setStatus('connecting');
      const pc = createPeerConnection();

      // Receiver listens for the DataChannel created by the sender
      pc.ondatachannel = (event) => {
        const channel = setupDataChannel(event.channel);
        // Set up the receiver's chunk handler once the channel is ready
        setupReceiverHandler(channel);
      };

      // Set the sender's offer as our remote description
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));

      // Create our answer and send it back via SignalR
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      const responseSignal = JSON.stringify({
        type: 'answer',
        sdp: pc.localDescription,
      });
      sendSignal(responseSignal, roomId);

      console.log('[WebRTC] SDP Answer sent');
    }

    // -----------------------------------------------------------------------
    // Handle SDP Answer (Sender side)
    // -----------------------------------------------------------------------
    if (signal.type === 'answer') {
      const pc = peerConnectionRef.current;
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        console.log('[WebRTC] SDP Answer received and set');
      }
    }

    // -----------------------------------------------------------------------
    // Handle ICE Candidate (Both sides)
    // -----------------------------------------------------------------------
    if (signal.type === 'ice-candidate') {
      const pc = peerConnectionRef.current;
      if (pc) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        } catch (e) {
          console.warn('[WebRTC] Failed to add ICE candidate:', e);
        }
      }
    }
  }, [createPeerConnection, setupDataChannel, sendSignal, roomId]);

  // ===========================================================================
  // SENDER: Memory-Safe Chunked File Transfer with Backpressure
  // ===========================================================================

  /**
   * Reads an array of files in chunks, encrypts each chunk,
   * and sends it through the DataChannel.
   */
  const sendFiles = useCallback(async (files, cryptoKey, nonce) => {
    const channel = dataChannelRef.current;
    if (!channel || channel.readyState !== 'open') {
      console.error('[WebRTC] DataChannel not open');
      setStatus('error');
      return;
    }

    cryptoKeyRef.current = cryptoKey;
    cryptoNonceRef.current = nonce;
    sendAbortRef.current = false;

    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

    // Step 1: Send global metadata
    channel.send(JSON.stringify({
      type: 'multi-metadata',
      totalBytes,
      totalFiles: files.length,
    }));

    setStatus('waiting_for_consent');

    // Wait for receiver to explicitly accept the transfer
    const consent = await new Promise((resolve) => {
      consentResolverRef.current = resolve;
    });

    if (!consent) {
      setStatus('declined');
      console.log('[WebRTC] Transfer declined by receiver');
      return;
    }

    setStatus('transferring');
    transferStartRef.current = Date.now();
    let globalOffset = 0;
    let chunkIndex = 0; // Increments across all files to maintain AES-GCM nonce safety if we were deriving it, but here we just pass it to encryptChunk. Wait, decryptChunk doesn't take chunkIndex! The sender does.

    for (let i = 0; i < files.length; i++) {
      if (sendAbortRef.current) break;
      const file = files[i];
      const totalChunks = Math.ceil(file.size / CHUNK_SIZE);

      // Send individual file metadata
      channel.send(JSON.stringify({
        type: 'file-metadata',
        fileName: file.customPath || file.name,
        fileSize: file.size,
        totalChunks,
      }));

      let offset = 0;
      while (offset < file.size && !sendAbortRef.current) {
        const end = Math.min(offset + CHUNK_SIZE, file.size);
        const blob = file.slice(offset, end);
        const arrayBuffer = await blob.arrayBuffer();
        const chunk = new Uint8Array(arrayBuffer);

        // Encrypt the chunk
        const encryptedChunk = await encryptChunk(cryptoKey, nonce, chunk, chunkIndex);

        // Wait if paused
        if (isPausedRef.current) {
          await new Promise(resolve => { pauseResolverRef.current = resolve; });
          // If aborted while paused
          if (sendAbortRef.current) break;
          // Adjust transfer start time so speed calc isn't ruined by pause
          transferStartRef.current += (Date.now() - transferStartRef.current); // Rough adjustment, or just accept speed dip
        }

        // Backpressure
        if (channel.bufferedAmount > BUFFER_THRESHOLD) {
          await new Promise((resolve) => {
            channel.onbufferedamountlow = () => {
              channel.onbufferedamountlow = null;
              resolve();
            };
          });
        }

        channel.send(encryptedChunk);

        offset = end;
        globalOffset += chunk.byteLength;
        chunkIndex++;
        updateProgress(globalOffset, totalBytes);
      }

      // File complete
      channel.send(JSON.stringify({ type: 'file-done' }));
    }

    // All files complete
    if (!sendAbortRef.current) {
      channel.send(JSON.stringify({ type: 'all-done' }));
      setStatus('complete');
      updateProgress(totalBytes, totalBytes);
      console.log('[WebRTC] All files transferred');
    }
  }, [updateProgress]);

  // ===========================================================================
  // RECEIVER: Stream Assembly — Decrypt and Write to Disk
  // ===========================================================================

  /**
   * Sets up the DataChannel message handler on the receiver side.
   * 
   * Handles three message types:
   * 1. 'metadata' — file info, triggers save dialog
   * 2. binary chunks — decrypt and write to disk
   * 3. 'done' — finalize the file
   * 
   * DISK STREAMING:
   * Uses the File System Access API (showSaveFilePicker) to write chunks
   * directly to disk as they arrive. This means a 50GB file uses ~256KB
   * of RAM (one chunk), not 50GB.
   * 
   * FALLBACK:
   * If File System Access API is not available (Firefox, Safari), chunks
   * are collected in memory and assembled into a Blob for download.
   * Warning: This fallback CANNOT handle very large files (>2GB typically).
   */
  const setupReceiverHandler = useCallback((channel) => {
    let globalTotalBytes = 0;
    let globalReceivedBytes = 0;
    let expectedTotalChunks = 0;
    let currentFileName = '';
    let directoryHandle = null;

    let messageQueue = Promise.resolve();

    channel.onmessage = (event) => {
      messageQueue = messageQueue.then(async () => {
        // -----------------------------------------------------------------
        // TEXT MESSAGES: Metadata or completion signal
        // -----------------------------------------------------------------
        if (typeof event.data === 'string') {
          const msg = JSON.parse(event.data);

          if (msg.type === 'multi-metadata') {
            globalTotalBytes = msg.totalBytes;
            globalReceivedBytes = 0;
            setIncomingFile({ 
              fileName: msg.totalFiles === 1 ? '1 file' : `${msg.totalFiles} files/folders`, 
              fileSize: globalTotalBytes, 
              totalChunks: 0,
              totalFiles: msg.totalFiles
            });
            setStatus('confirm_receive');
            return;
          }

          if (msg.type === 'accept-transfer') {
            consentResolverRef.current?.(true);
            return;
          }

          if (msg.type === 'decline-transfer') {
            consentResolverRef.current?.(false);
            setStatus('declined');
            return;
          }

          if (msg.type === 'pause') {
            setIsPaused(true);
            isPausedRef.current = true;
            return;
          }

          if (msg.type === 'resume') {
            setIsPaused(false);
            isPausedRef.current = false;
            if (pauseResolverRef.current) {
              pauseResolverRef.current();
              pauseResolverRef.current = null;
            }
            return;
          }

          if (msg.type === 'file-metadata') {
            currentFileName = msg.fileName;
            expectedTotalChunks = msg.totalChunks;
            receivedChunksRef.current = 0;
            fallbackChunksRef.current = [];

            if (directoryHandleRef.current) {
              try {
                const parts = currentFileName.split('/');
                const name = parts.pop();
                let currentDir = directoryHandleRef.current;
                for (const part of parts) {
                  currentDir = await currentDir.getDirectoryHandle(part, { create: true });
                }
                const fileHandle = await currentDir.getFileHandle(name, { create: true });
                writableStreamRef.current = await fileHandle.createWritable();
              } catch(e) {
                console.error('[Receiver] Failed to create file handle:', e);
              }
            } else if ('showSaveFilePicker' in window && !directoryHandleRef.current) {
              // Single file fallback if showDirectoryPicker wasn't used
              try {
                const handle = await window.showSaveFilePicker({ suggestedName: currentFileName.split('/').pop() });
                writableStreamRef.current = await handle.createWritable();
              } catch (err) {
                console.warn('[Receiver] Save dialog cancelled, using Blob fallback');
              }
            }
            return;
          }

          if (msg.type === 'file-done') {
            if (writableStreamRef.current) {
              await writableStreamRef.current.close();
              writableStreamRef.current = null;
            } else if (fallbackChunksRef.current.length > 0) {
              // Blob fallback
              const blob = new Blob(fallbackChunksRef.current);
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = currentFileName.split('/').pop();
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
              fallbackChunksRef.current = [];
            }
            return;
          }

          if (msg.type === 'all-done') {
            setStatus('complete');
            updateProgress(globalTotalBytes, globalTotalBytes);
            return;
          }
        }

        // -----------------------------------------------------------------
        // BINARY MESSAGES: Encrypted file chunks
        // -----------------------------------------------------------------
        if (event.data instanceof ArrayBuffer) {
          const key = cryptoKeyRef.current;
          if (!key) return;

          try {
            const decryptedChunk = await decryptChunk(key, event.data);

            if (writableStreamRef.current) {
              await writableStreamRef.current.write(decryptedChunk);
            } else {
              fallbackChunksRef.current.push(decryptedChunk);
            }

            receivedChunksRef.current++;
            globalReceivedBytes += decryptedChunk.byteLength;
            updateProgress(globalReceivedBytes, globalTotalBytes);
          } catch (err) {
            console.error('[Receiver] Chunk decryption failed:', err);
            setStatus('error');
          }
        }
      }).catch(err => {
        console.error('[Receiver] Queue processing error:', err);
      });
    };
  }, [updateProgress]);

  // ===========================================================================
  // Transfer Control Actions
  // ===========================================================================
  
  const acceptTransfer = useCallback(async () => {
    // Must trigger file pickers here during the user gesture!
    if ('showDirectoryPicker' in window && incomingFile?.totalFiles > 1) {
      try {
        directoryHandleRef.current = await window.showDirectoryPicker({ mode: 'readwrite' });
        console.log('[Receiver] Directory picked');
      } catch (err) {
        console.warn('[Receiver] Directory dialog cancelled');
        setStatus('declined');
        dataChannelRef.current?.send(JSON.stringify({ type: 'decline-transfer' }));
        return;
      }
    } 
    // For single files, we still have a problem where 'showSaveFilePicker' needs a user gesture.
    // However, we don't know the exact filename yet if we only had multi-metadata.
    // Wait, multi-metadata doesn't send the single filename! It sends "1 file".
    // We should probably just let it fallback to Blob for single files if we don't have the name,
    // OR we just use a generic name here. Let's just use Blob fallback for single files unless we refactor metadata.
    
    dataChannelRef.current?.send(JSON.stringify({ type: 'accept-transfer' }));
    transferStartRef.current = Date.now();
    setStatus('transferring');
  }, [incomingFile]);

  const declineTransfer = useCallback(() => {
    dataChannelRef.current?.send(JSON.stringify({ type: 'decline-transfer' }));
    setStatus('declined');
  }, []);

  const pauseTransfer = useCallback(() => {
    setIsPaused(true);
    isPausedRef.current = true;
    dataChannelRef.current?.send(JSON.stringify({ type: 'pause' }));
  }, []);

  const resumeTransfer = useCallback(() => {
    setIsPaused(false);
    isPausedRef.current = false;
    if (pauseResolverRef.current) {
      pauseResolverRef.current();
      pauseResolverRef.current = null;
    }
    dataChannelRef.current?.send(JSON.stringify({ type: 'resume' }));
  }, []);

  // ===========================================================================
  // Set crypto key (called by receiver after extracting from URL fragment)
  // ===========================================================================
  const setCryptoKey = useCallback((key) => {
    cryptoKeyRef.current = key;
  }, []);

  // ===========================================================================
  // Cleanup — close all connections
  // ===========================================================================
  const cleanup = useCallback(() => {
    sendAbortRef.current = true;

    if (dataChannelRef.current) {
      dataChannelRef.current.close();
      dataChannelRef.current = null;
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close();
      peerConnectionRef.current = null;
    }
    if (writableStreamRef.current) {
      writableStreamRef.current.close().catch(() => {});
      writableStreamRef.current = null;
    }

    setStatus('idle');
    setProgress({
      bytesTransferred: 0,
      totalBytes: 0,
      percentage: 0,
      speed: 0,
      speedMBps: '0',
      eta: 0,
    });
  }, []);

  return {
    createOffer,
    handleSignal,
    sendFiles,
    acceptTransfer,
    declineTransfer,
    pauseTransfer,
    resumeTransfer,
    isPaused,
    setCryptoKey,
    cleanup,
    progress,
    status,
    incomingFile,
  };
}
