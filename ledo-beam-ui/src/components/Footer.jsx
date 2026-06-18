import React from 'react';

export default function Footer() {
  return (
    <footer className="relative mt-auto">
      {/* Gradient top border fade */}
      <div className="h-px w-full bg-gradient-to-r from-transparent via-ledo-border/50 to-transparent" />

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 md:gap-4 items-start">
          {/* Left — Brand info */}
          <div className="flex flex-col gap-1.5 text-center md:text-left">
            <div className="flex items-center gap-2 justify-center md:justify-start">
              <span className="text-sm font-bold tracking-tight bg-gradient-to-r from-ledo-primary to-ledo-secondary bg-clip-text text-transparent">
                LEDO-Beam
              </span>
            </div>
            <p className="text-xs text-ledo-muted leading-relaxed">
              Open Source under MIT License.
              <br />
              Your files never touch our servers.
            </p>
          </div>

          {/* Center — Nav links */}
          <div className="flex items-center justify-center gap-6">
            <a
              href="#about"
              className="text-sm text-ledo-muted transition-colors duration-200
                         hover:text-ledo-text
                         relative after:absolute after:bottom-0 after:left-0
                         after:h-px after:w-0 hover:after:w-full
                         after:bg-ledo-primary/50 after:transition-all after:duration-300"
            >
              About
            </a>
            <span className="w-px h-3 bg-ledo-border/40" />
            <a
              href="#privacy"
              className="text-sm text-ledo-muted transition-colors duration-200
                         hover:text-ledo-text
                         relative after:absolute after:bottom-0 after:left-0
                         after:h-px after:w-0 hover:after:w-full
                         after:bg-ledo-primary/50 after:transition-all after:duration-300"
            >
              Privacy
            </a>
          </div>

          {/* Right — GitHub star button */}
          <div className="flex justify-center md:justify-end">
            <a
              href="https://github.com/ledo-tech/LedoBeam"
              target="_blank"
              rel="noopener noreferrer"
              className="group relative inline-flex items-center gap-2 px-4 py-1.5 rounded-full
                         bg-ledo-surface/50 border border-ledo-border/40
                         text-sm font-medium text-ledo-text
                         transition-all duration-300
                         hover:border-ledo-primary/60 hover:shadow-[0_0_20px_rgba(59,130,246,0.15)]
                         hover:bg-ledo-surface/70"
            >
              {/* Glow sweep animation */}
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
              <span className="relative">Star on GitHub</span>
            </a>
          </div>
        </div>

        {/* Bottom copyright */}
        <div className="mt-8 pt-4 border-t border-ledo-border/20 text-center">
          <p className="text-xs text-ledo-muted/70">
            © 2026 LEDO-TECH — Zero-Trust Transfer
          </p>
        </div>
      </div>
    </footer>
  );
}
