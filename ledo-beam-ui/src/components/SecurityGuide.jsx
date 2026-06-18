import React, { useState } from 'react';

export default function SecurityGuide() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 rounded-xl bg-ledo-surface border border-ledo-border/50 hover:bg-ledo-surface/80 hover:border-ledo-primary/30 transition-all duration-300"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-ledo-primary/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-ledo-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-ledo-text">Security & Performance Guide</h3>
            <p className="text-xs text-ledo-muted">How to get the best speeds and ensure maximum security</p>
          </div>
        </div>
        <svg 
          className={`w-5 h-5 text-ledo-muted transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} 
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {isOpen && (
        <div className="mt-2 p-6 rounded-xl bg-ledo-dark/50 border border-ledo-border/30 space-y-6 animate-fade-in text-sm text-ledo-muted">
          
          <div className="space-y-2">
            <h4 className="text-ledo-text font-medium flex items-center gap-2">
              <span className="text-ledo-secondary">⚡</span> Getting Gigabit Speeds
            </h4>
            <p>
              LEDO-Beam uses WebRTC to establish a direct Peer-to-Peer (P2P) connection. 
              If both devices are on the same local network (e.g., your home Wi-Fi or Gigabit LAN), 
              the files transfer directly between them without ever touching the internet. 
              Expect speeds of 50MB/s to 100MB/s on a modern router!
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-ledo-text font-medium flex items-center gap-2">
              <span className="text-amber-400">🔥</span> Bypassing Corporate Firewalls (Symmetric NAT)
            </h4>
            <p>
              If the transfer fails at 0% or cannot connect, one of you might be behind a strict corporate firewall (Symmetric NAT).
              To fix this, simply connect one device to a <strong>Mobile Hotspot</strong> or use a <strong>VPN</strong>.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-ledo-text font-medium flex items-center gap-2">
              <span className="text-green-400">🔒</span> Is my file actually secure?
            </h4>
            <p>
              <strong>Yes.</strong> When you select a file, your browser generates a random AES-256-GCM encryption key.
              This key is appended to the share link as a "Hash Fragment" (the part after the # symbol). 
              Browsers are designed to <strong>never</strong> send hash fragments to any server. Our server only sees the Room ID.
              The files are fully encrypted before they leave your device, meaning we couldn't read your files even if we wanted to.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-ledo-text font-medium flex items-center gap-2">
              <span className="text-ledo-primary">💾</span> Why do we recommend Chrome / Edge?
            </h4>
            <p>
              Chromium-based browsers support the <code>FileSystemWritableFileStream</code> API. 
              This allows LEDO-Beam to stream chunks of a massive 50GB file directly to your hard drive, 
              using almost zero RAM. Firefox and Safari force the entire file into memory before saving, which can crash the browser for large transfers.
            </p>
          </div>

        </div>
      )}
    </div>
  );
}
