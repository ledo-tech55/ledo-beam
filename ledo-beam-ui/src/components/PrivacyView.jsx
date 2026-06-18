import React from 'react';

export default function PrivacyView() {
  return (
    <div className="w-full max-w-3xl mx-auto py-12 px-6 animate-fade-in">
      <h2 className="text-3xl font-bold text-ledo-text mb-6">
        Privacy Policy
      </h2>
      
      <div className="space-y-6 text-ledo-muted leading-relaxed">
        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">1. We Cannot Read Your Files</h3>
          <p>
            Because LEDO-Beam uses AES-256-GCM end-to-end encryption, the encryption keys never leave 
            the URL fragment on your device. We possess zero technical ability to intercept, decrypt, 
            or read any files you transfer. Your files never touch our servers.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">2. Data We Collect</h3>
          <p>
            The only data our signaling server briefly handles is the WebRTC connection metadata 
            (such as your public IP address) strictly for the duration required to establish the 
            peer-to-peer tunnel. This data is held in memory and is instantly discarded once the 
            connection is made or dropped.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">3. No Trackers, No Ads</h3>
          <p>
            We do not use tracking cookies, analytics scripts, or advertising networks. 
            We do not sell your personal information because we don't collect any in the first place. 
            LEDO-Beam is designed from the ground up to respect your absolute privacy.
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-xl font-semibold text-ledo-primary">4. Local Storage</h3>
          <p>
            We use your browser's local storage solely to remember your consent to our Terms of Service. 
            This information is kept entirely on your device.
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
