import React from 'react';

export default function TermsView() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-ledo-text mb-6">
        Terms of Service & About
      </h2>
      
      <div className="space-y-6 text-ledo-muted leading-relaxed">
        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">1. Zero-Trust Architecture</h3>
          <p>
            LEDO-Beam is a zero-trust, peer-to-peer file transfer application. 
            By using this service, you acknowledge that all files are encrypted locally in your browser 
            using AES-256-GCM before being transferred. The encryption keys are generated locally and 
            never transmitted to or stored on our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">2. No File Storage or Monitoring</h3>
          <p>
            Our servers strictly facilitate the initial WebRTC signaling connection (the "handshake") 
            between peers. Once the peer-to-peer connection is established, the data flows directly 
            between the sender and the receiver. We do not store, monitor, inspect, or log the files 
            being transferred. You are entirely responsible for the content you share.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">3. Acceptable Use</h3>
          <p>
            You agree not to use LEDO-Beam to distribute illegal, malicious, or copyrighted material 
            without authorization. While we cannot monitor the content of your transfers due to our 
            strict end-to-end encryption, you assume full legal liability for the data you transmit 
            using this software.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">4. "As Is" Warranty</h3>
          <p>
            LEDO-Beam is provided "as is", without warranty of any kind, express or implied. 
            We do not guarantee that the service will be uninterrupted, error-free, or completely secure. 
            In no event shall the developers be liable for any claim, damages, or other liability 
            arising from your use of the software.
          </p>
        </section>
        
        <div className="pt-8">
          <a href="#" className="px-6 py-2.5 rounded-xl bg-ledo-surface border border-ledo-border hover:border-ledo-primary/50 text-ledo-text font-medium transition-all">
            ← Back to App
          </a>
        </div>
      </div>
    </div>
  );
}
