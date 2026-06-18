/**
 * =============================================================================
 * LEDO-Beam — useCrypto Hook
 * =============================================================================
 * 
 * Zero-trust Application-Layer Encryption using AES-256-GCM.
 * Uses ONLY the native Web Crypto API (window.crypto.subtle).
 * 
 * WHY: WebRTC's built-in DTLS encryption is peer-to-peer but we cannot
 * verify the DTLS certificate chain in-browser. By adding our own AES layer,
 * we guarantee that even if the signaling server were compromised, the file
 * data remains encrypted with a key that NEVER touches the server.
 * 
 * KEY EXCHANGE: The AES key is shared via URL fragment (#), which browsers
 * do NOT send to the server in HTTP requests.
 * 
 * IV STRATEGY: AES-GCM requires a unique 12-byte IV per encryption.
 * We generate a random 8-byte nonce at key creation time and combine it
 * with a 4-byte chunk counter. This guarantees uniqueness across all chunks.
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

/**
 * Generates a fresh AES-256-GCM key pair: the CryptoKey for encryption
 * and a Base64 string for embedding in the shareable URL.
 * 
 * The returned object contains:
 * - cryptoKey: The CryptoKey object for encrypt/decrypt operations
 * - keyBase64: Base64-encoded raw key bytes for URL fragment
 * - nonceBase64: Base64-encoded 8-byte nonce for IV construction
 * 
 * @returns {Promise<{cryptoKey: CryptoKey, keyBase64: string, nonceBase64: string}>}
 */
export async function generateKey() {
  // Generate a 256-bit AES key using the Web Crypto API
  const cryptoKey = await window.crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,       // extractable — we need to export it for the URL
    ['encrypt', 'decrypt']
  );

  // Export the raw key bytes so we can Base64-encode them for the URL fragment
  const rawKey = await window.crypto.subtle.exportKey('raw', cryptoKey);
  const keyBase64 = arrayBufferToBase64(rawKey);

  // Generate a random 8-byte nonce that will be combined with chunk indices
  // to form unique 12-byte IVs for each chunk encryption
  const nonce = window.crypto.getRandomValues(new Uint8Array(8));
  const nonceBase64 = arrayBufferToBase64(nonce.buffer);

  return { cryptoKey, keyBase64, nonceBase64 };
}

/**
 * Reconstructs a CryptoKey from a Base64-encoded string extracted from
 * the URL fragment on the receiver side.
 * 
 * @param {string} keyBase64 - Base64-encoded 256-bit AES key
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(keyBase64) {
  const rawKey = base64ToArrayBuffer(keyBase64);
  return window.crypto.subtle.importKey(
    'raw',
    rawKey,
    { name: 'AES-GCM', length: 256 },
    false,      // non-extractable on import — no need to re-export
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a single chunk using AES-256-GCM.
 * 
 * The IV is constructed as: [4-byte chunkIndex (big-endian)] + [8-byte nonce]
 * This guarantees a unique IV for every chunk without coordination.
 * 
 * Output format: [12-byte IV] + [ciphertext + 16-byte GCM auth tag]
 * The IV is prepended so the receiver can extract it for decryption.
 * 
 * @param {CryptoKey} key - The AES-256-GCM CryptoKey
 * @param {Uint8Array} nonce - The 8-byte random nonce generated at key creation
 * @param {Uint8Array} chunk - Raw file chunk bytes to encrypt
 * @param {number} chunkIndex - Sequential chunk number (0-based)
 * @returns {Promise<ArrayBuffer>} - IV + ciphertext combined
 */
export async function encryptChunk(key, nonce, chunk, chunkIndex) {
  // Build the 12-byte IV: 4 bytes for chunk counter + 8 bytes for session nonce
  const iv = new Uint8Array(12);
  // Write chunk index as 4-byte big-endian integer into first 4 bytes
  const view = new DataView(iv.buffer);
  view.setUint32(0, chunkIndex, false); // false = big-endian
  // Copy the 8-byte nonce into bytes 4-11
  iv.set(nonce, 4);

  // Encrypt the chunk with AES-256-GCM (includes 16-byte auth tag automatically)
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    chunk
  );

  // Prepend the IV to the ciphertext so the receiver can extract it
  const result = new Uint8Array(12 + ciphertext.byteLength);
  result.set(iv, 0);
  result.set(new Uint8Array(ciphertext), 12);

  return result.buffer;
}

/**
 * Decrypts a single chunk that was encrypted with encryptChunk().
 * Extracts the 12-byte IV prefix, then decrypts the remaining ciphertext.
 * 
 * @param {CryptoKey} key - The AES-256-GCM CryptoKey
 * @param {ArrayBuffer} encryptedData - IV + ciphertext as produced by encryptChunk
 * @returns {Promise<Uint8Array>} - Decrypted plaintext chunk
 */
export async function decryptChunk(key, encryptedData) {
  const data = new Uint8Array(encryptedData);

  // First 12 bytes are the IV
  const iv = data.slice(0, 12);
  // Remaining bytes are ciphertext + GCM auth tag
  const ciphertext = data.slice(12);

  const plaintext = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );

  return new Uint8Array(plaintext);
}

// =============================================================================
// Utility Functions — Base64 <-> ArrayBuffer conversion
// =============================================================================

/**
 * Converts an ArrayBuffer to a URL-safe Base64 string.
 * Uses URL-safe alphabet (- instead of +, _ instead of /) and strips padding.
 * This is critical because the key goes into a URL fragment.
 * 
 * @param {ArrayBuffer} buffer
 * @returns {string}
 */
export function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary)
    .replace(/\+/g, '-')   // URL-safe: replace + with -
    .replace(/\//g, '_')   // URL-safe: replace / with _
    .replace(/=+$/, '');   // Strip padding
}

/**
 * Converts a URL-safe Base64 string back to an ArrayBuffer.
 * Reverses the URL-safe encoding applied by arrayBufferToBase64().
 * 
 * @param {string} base64
 * @returns {ArrayBuffer}
 */
export function base64ToArrayBuffer(base64) {
  // Restore standard Base64 from URL-safe variant
  const standardBase64 = base64
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const binary = atob(standardBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
