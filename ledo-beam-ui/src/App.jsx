/**
 * =============================================================================
 * LEDO-Beam — App.jsx (Root Component)
 * =============================================================================
 * 
 * URL-hash-based routing (no React Router dependency needed):
 * 
 *   No hash  →  SenderView (user wants to send a file)
 *   #RoomID#AES_KEY#NONCE  →  ReceiverView (user opened a share link)
 *   #terms  →  TermsView
 *   #privacy  →  PrivacyView
 * 
 * @author LEDO-TECH (https://github.com/ledo-tech55)
 * =============================================================================
 */

import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import SenderView from './components/SenderView';
import ReceiverView from './components/ReceiverView';
import Footer from './components/Footer';
import SecurityGuide from './components/SecurityGuide';
import TermsView from './components/TermsView';
import PrivacyView from './components/PrivacyView';

/**
 * Parses the URL hash to determine the current view.
 */
function parseHash() {
  const rawHash = window.location.hash;
  if (!rawHash || rawHash.length < 2) return { view: 'sender' };

  // Decode the hash to handle cases where messaging apps URL-encode '#' to '%23'
  const hash = decodeURIComponent(rawHash);

  if (hash === '#about' || hash === '#terms') return { view: 'terms' };
  if (hash === '#privacy') return { view: 'privacy' };

  // Remove the leading '#' and split by '#'
  const parts = hash.substring(1).split('#');

  // We need exactly 3 parts: roomId, keyBase64, nonceBase64
  if (parts.length === 3) {
    const [roomId, keyBase64, nonceBase64] = parts;
    if (roomId && keyBase64 && nonceBase64) {
      return { view: 'receiver', roomId, keyBase64, nonceBase64 };
    }
  }

  return { view: 'sender' };
}

/**
 * Overlay forcing the user to accept the Terms of Service.
 */
function TermsConsentOverlay({ onAgree }) {
  const [isChecked, setIsChecked] = useState(false);
  const [showError, setShowError] = useState(false);

  const handleContinue = () => {
    if (isChecked) {
      onAgree();
    } else {
      setShowError(true);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ledo-dark/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-ledo-surface border border-ledo-border/50 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-2xl font-bold text-ledo-text mb-2">Welcome to LEDO-Beam</h3>
        <p className="text-sm text-ledo-muted mb-6 leading-relaxed">
          Before you start securely transferring files, please review and agree to our Terms of Service and Privacy Policy.
        </p>
        
        <div className="flex flex-col gap-5">
          <label className="flex items-start gap-3 cursor-pointer group">
            <div className={`relative flex items-center justify-center w-5 h-5 mt-0.5 rounded border transition-colors ${showError && !isChecked ? 'border-red-500 bg-red-500/10' : 'border-ledo-border bg-ledo-dark group-hover:border-ledo-primary'}`}>
              <input 
                type="checkbox" 
                className="peer sr-only" 
                checked={isChecked}
                onChange={(e) => {
                  setIsChecked(e.target.checked);
                  setShowError(false);
                }}
              />
              <svg className={`w-3.5 h-3.5 text-ledo-primary opacity-0 transition-opacity ${isChecked ? 'opacity-100' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <span className="text-sm text-ledo-text">
              I agree to the <a href="#terms" className="text-ledo-primary hover:underline">Terms of Service</a> and <a href="#privacy" className="text-ledo-primary hover:underline">Privacy Policy</a>.
            </span>
          </label>

          <button
            onClick={handleContinue}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-ledo-primary to-ledo-secondary text-white font-bold transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-ledo-primary/20"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const [route, setRoute] = useState(null);
  const [hasAgreedToTerms, setHasAgreedToTerms] = useState(
    () => localStorage.getItem('ledo_beam_tos') === 'true'
  );

  useEffect(() => {
    const handleHashChange = () => setRoute(parseHash());
    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (!route) return null;

  const handleAgree = () => {
    localStorage.setItem('ledo_beam_tos', 'true');
    setHasAgreedToTerms(true);
  };

  const showConsentOverlay = !hasAgreedToTerms && (route.view === 'sender' || route.view === 'receiver');

  return (
    <div className="min-h-screen bg-ledo-dark text-ledo-text flex flex-col relative">

      {/* =============================================================== */}
      {/* Background effects — fixed, non-interactive layer               */}
      {/* =============================================================== */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">

        {/* Animated mesh / grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `
              linear-gradient(rgba(108, 92, 231, 0.6) 1px, transparent 1px),
              linear-gradient(90deg, rgba(108, 92, 231, 0.6) 1px, transparent 1px)
            `,
            backgroundSize: '48px 48px',
            animation: 'meshDrift 25s linear infinite',
          }}
        />

        {/* Top-left purple ambient orb */}
        <div
          className="absolute rounded-full"
          style={{
            top: '-10%',
            left: '-8%',
            width: '50vw',
            height: '50vw',
            maxWidth: '700px',
            maxHeight: '700px',
            background: 'radial-gradient(circle, rgba(108, 92, 231, 0.12) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />

        {/* Bottom-right cyan ambient orb */}
        <div
          className="absolute rounded-full"
          style={{
            bottom: '-12%',
            right: '-8%',
            width: '50vw',
            height: '50vw',
            maxWidth: '700px',
            maxHeight: '700px',
            background: 'radial-gradient(circle, rgba(0, 210, 211, 0.10) 0%, transparent 70%)',
            filter: 'blur(100px)',
          }}
        />

        {/* Center radial gradient — very subtle */}
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
          style={{
            width: '60vw',
            height: '60vw',
            maxWidth: '900px',
            maxHeight: '900px',
            background: 'radial-gradient(circle, rgba(108, 92, 231, 0.04) 0%, transparent 60%)',
          }}
        />
      </div>

      {/* =============================================================== */}
      {/* Noise / film-grain texture overlay                              */}
      {/* =============================================================== */}
      <div
        className="fixed inset-0 pointer-events-none z-[1]"
        style={{
          opacity: 0.03,
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='1'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat',
          backgroundSize: '180px 180px',
        }}
      />

      {/* =============================================================== */}
      {/* Terms of Service Consent Overlay                                */}
      {/* =============================================================== */}
      {showConsentOverlay && <TermsConsentOverlay onAgree={handleAgree} />}

      {/* =============================================================== */}
      {/* Header (sticky)                                                 */}
      {/* =============================================================== */}
      <div className="sticky top-0 z-30">
        <Header />
      </div>

      {/* =============================================================== */}
      {/* Main content                                                    */}
      {/* =============================================================== */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-start px-4 pt-10 pb-16 w-full">
        {route.view === 'terms' && <TermsView />}
        {route.view === 'privacy' && <PrivacyView />}
        
        {route.view === 'sender' && <SenderView />}
        
        {route.view === 'receiver' && (
          <ReceiverView
            roomId={route.roomId}
            keyBase64={route.keyBase64}
            nonceBase64={route.nonceBase64}
          />
        )}
      </main>

      {/* =============================================================== */}
      {/* Security Guide                                                  */}
      {/* =============================================================== */}
      {(route.view === 'sender' || route.view === 'receiver') && (
        <div className="relative z-10 w-full px-4 pb-8">
          <SecurityGuide />
        </div>
      )}

      {/* =============================================================== */}
      {/* Footer                                                          */}
      {/* =============================================================== */}
      <Footer />

      {/* Keyframe for mesh drift animation */}
      <style>{`
        @keyframes meshDrift {
          0%   { background-position: 0 0, 0 0; }
          100% { background-position: 48px 48px, 48px 48px; }
        }
      `}</style>
    </div>
  );
}
