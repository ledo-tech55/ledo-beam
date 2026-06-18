import React from 'react';

export default function Header() {
  return (
    <header className="sticky top-0 z-50">
      {/* Glassmorphism nav bar */}
      <nav className="backdrop-blur-xl bg-ledo-dark/60 border-b border-ledo-border/30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            {/* Logo with animated glow */}
            <div className="relative flex items-center justify-center">
              {/* Glow pulse behind logo */}
              <div className="absolute inset-0 rounded-full bg-ledo-primary/30 blur-xl animate-pulse" />
              <div className="absolute inset-0 rounded-full bg-ledo-secondary/20 blur-lg animate-[pulse_3s_ease-in-out_infinite_0.5s]" />
              <svg
                className="relative w-9 h-9 text-ledo-primary drop-shadow-[0_0_8px_rgba(59,130,246,0.5)]"
                viewBox="0 0 40 40"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <rect
                  x="4"
                  y="4"
                  width="32"
                  height="32"
                  rx="8"
                  className="stroke-ledo-primary"
                  strokeWidth="2.5"
                  fill="none"
                />
                <path
                  d="M14 14 L26 20 L14 26Z"
                  className="fill-ledo-primary"
                />
              </svg>
            </div>

            {/* Brand text */}
            <div className="flex flex-col">
              <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-ledo-primary to-ledo-secondary bg-clip-text text-transparent">
                LEDO-Beam
              </span>
              <span className="text-[10px] font-medium tracking-widest uppercase text-ledo-muted -mt-0.5">
                Zero-Trust P2P Transfer
              </span>
            </div>
          </div>

          {/* GitHub pill button */}
          <a
            href="https://github.com/ledo-tech55/LedoBeam"
            target="_blank"
            rel="noopener noreferrer"
            className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                       bg-ledo-surface/60 border border-ledo-border/50
                       text-sm font-medium text-ledo-text
                       transition-all duration-300
                       hover:border-ledo-primary/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]
                       hover:bg-ledo-surface/80"
          >
            {/* Hover glow sweep */}
            <span className="pointer-events-none absolute inset-0 rounded-full overflow-hidden">
              <span
                className="absolute inset-0 -translate-x-full group-hover:translate-x-full
                           transition-transform duration-700 ease-in-out
                           bg-gradient-to-r from-transparent via-ledo-primary/10 to-transparent"
              />
            </span>

            <svg
              className="w-4 h-4 text-ledo-muted group-hover:text-ledo-primary transition-colors duration-300"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
            </svg>
            <span className="relative">GitHub</span>
          </a>
        </div>
      </nav>

      {/* Animated beam line */}
      <div className="relative h-px w-full overflow-hidden bg-ledo-border/20">
        <div
          className="absolute top-0 h-full w-1/3
                     bg-gradient-to-r from-transparent via-ledo-primary/80 to-transparent
                     animate-[beam_3s_ease-in-out_infinite]"
        />
      </div>

      {/* Keyframes injected via style tag */}
      <style>{`
        @keyframes beam {
          0%   { left: -33%; }
          100% { left: 100%; }
        }
      `}</style>
    </header>
  );
}
