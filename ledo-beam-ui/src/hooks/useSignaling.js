/**
 * =============================================================================
 * LEDO-Beam — useSignaling Hook
 * =============================================================================
 * 
 * SignalR WebSocket connection manager for WebRTC signaling.
 * 
 * This hook manages the connection to the .NET SignalR hub that acts as
 * a relay for SDP Offers, SDP Answers, and ICE Candidates. The actual
 * file data NEVER flows through this connection.
 * 
 * ARCHITECTURE:
 * - Hub connection stored in useRef (not useState) to prevent re-renders
 * - Automatic reconnect with exponential backoff
 * - Clean disconnect on component unmount
 * 
 * HUB CONTRACT (matches SignalingHub.cs):
 *   Methods:  JoinRoom(roomId), SendSignal(signal, roomId)
 *   Events:   PeerJoined(connectionId), ReceiveSignal(connectionId, signal),
 *             PeerDisconnected(connectionId)
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech)
 * =============================================================================
 */

import { useRef, useCallback, useEffect } from 'react';
import * as signalR from '@microsoft/signalr';

/**
 * Custom hook for managing the SignalR signaling connection.
 * 
 * @param {Object} callbacks - Event handler callbacks
 * @param {Function} callbacks.onPeerJoined - Called when a peer joins the room
 * @param {Function} callbacks.onReceiveSignal - Called with (connectionId, signalJSON) when SDP/ICE arrives
 * @param {Function} callbacks.onPeerDisconnected - Called when the peer disconnects
 * @param {Function} callbacks.onConnectionStateChange - Called with connection state string
 * @returns {Object} - { connect, joinRoom, sendSignal, disconnect }
 */
export function useSignaling({ onPeerJoined, onReceiveSignal, onPeerDisconnected, onConnectionStateChange }) {
  // =========================================================================
  // Refs — mutable objects that persist across renders without causing them
  // =========================================================================
  const hubConnectionRef = useRef(null);
  const currentRoomRef = useRef(null);

  /**
   * Establishes the SignalR WebSocket connection to the signaling server.
   * Uses the VITE_SIGNALING_URL env var, falling back to localhost.
   * 
   * RECONNECT STRATEGY: [0s, 2s, 10s, 30s] — then gives up.
   * This covers transient network blips without hammering the server.
   */
  const connect = useCallback(async () => {
    // Prevent duplicate connections
    if (hubConnectionRef.current?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    const signalingUrl = import.meta.env.VITE_SIGNALING_URL || '/signaling';

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(signalingUrl)
      .withAutomaticReconnect([0, 2000, 10000, 30000]) // Retry delays in ms
      .configureLogging(signalR.LogLevel.Warning)       // Quiet unless errors
      .build();

    // -----------------------------------------------------------------------
    // Register event handlers (matches SignalingHub.cs server-side events)
    // -----------------------------------------------------------------------

    // Fired when another peer calls JoinRoom for the same roomId
    connection.on('PeerJoined', (connectionId) => {
      console.log('[SignalR] PeerJoined:', connectionId);
      onPeerJoined?.(connectionId);
    });

    // Fired when a peer sends an SDP Offer, SDP Answer, or ICE Candidate
    connection.on('ReceiveSignal', (connectionId, signal) => {
      console.log('[SignalR] ReceiveSignal from:', connectionId);
      onReceiveSignal?.(connectionId, signal);
    });

    // Fired when a peer's browser closes or loses connection
    connection.on('PeerDisconnected', (connectionId) => {
      console.log('[SignalR] PeerDisconnected:', connectionId);
      onPeerDisconnected?.(connectionId);
    });

    // -----------------------------------------------------------------------
    // Connection lifecycle events
    // -----------------------------------------------------------------------
    connection.onreconnecting((error) => {
      console.warn('[SignalR] Reconnecting...', error);
      onConnectionStateChange?.('reconnecting');
    });

    connection.onreconnected((connectionId) => {
      console.log('[SignalR] Reconnected:', connectionId);
      onConnectionStateChange?.('connected');
      // Re-join the room after reconnection so the server re-maps us
      if (currentRoomRef.current) {
        connection.invoke('JoinRoom', currentRoomRef.current).catch(console.error);
      }
    });

    connection.onclose((error) => {
      console.warn('[SignalR] Connection closed:', error);
      onConnectionStateChange?.('disconnected');
    });

    // -----------------------------------------------------------------------
    // Start the connection
    // -----------------------------------------------------------------------
    try {
      await connection.start();
      hubConnectionRef.current = connection;
      onConnectionStateChange?.('connected');
      console.log('[SignalR] Connected to signaling server');
    } catch (error) {
      console.error('[SignalR] Connection failed:', error);
      onConnectionStateChange?.('failed');
      throw error;
    }
  }, [onPeerJoined, onReceiveSignal, onPeerDisconnected, onConnectionStateChange]);

  /**
   * Joins a SignalR group (room) identified by the room ID.
   * Both sender and receiver call this with the same roomId.
   * 
   * @param {string} roomId - The room identifier (e.g., 6-char alphanumeric)
   */
  const joinRoom = useCallback(async (roomId) => {
    const conn = hubConnectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      throw new Error('SignalR not connected. Call connect() first.');
    }
    currentRoomRef.current = roomId;
    await conn.invoke('JoinRoom', roomId);
    console.log('[SignalR] Joined room:', roomId);
  }, []);

  /**
   * Sends a stringified JSON signal (SDP Offer/Answer or ICE Candidate)
   * to the other peer in the room via the SignalR hub.
   * 
   * The signal is routed by SignalingHub.SendSignal() to
   * Clients.OthersInGroup(roomId), so only the peer receives it.
   * 
   * @param {string} signal - JSON string of the signaling data
   * @param {string} roomId - The room to send the signal to
   */
  const sendSignal = useCallback(async (signal, roomId) => {
    const conn = hubConnectionRef.current;
    if (!conn || conn.state !== signalR.HubConnectionState.Connected) {
      console.warn('[SignalR] Cannot send signal — not connected');
      return;
    }
    try {
      await conn.invoke('SendSignal', signal, roomId);
      console.log(`[SignalR] Successfully sent signal (${signal.length} bytes) to room ${roomId}`);
    } catch (err) {
      console.error('[SignalR] Failed to send signal:', err);
    }
  }, []);

  /**
   * Gracefully disconnects from the SignalR hub.
   * This triggers OnDisconnectedAsync on the server, which cleans up
   * the ConcurrentDictionary and notifies the peer.
   */
  const disconnect = useCallback(async () => {
    const conn = hubConnectionRef.current;
    if (conn) {
      try {
        await conn.stop();
      } catch (e) {
        console.warn('[SignalR] Error during disconnect:', e);
      }
      hubConnectionRef.current = null;
      currentRoomRef.current = null;
    }
  }, []);

  // Cleanup on unmount — prevents orphaned WebSocket connections
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return { connect, joinRoom, sendSignal, disconnect };
}
