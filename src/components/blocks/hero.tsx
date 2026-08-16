import { Monitor, ScanLine, SquareDashedMousePointer } from "lucide-react";
import { ScrollStroke } from "./scroll-stroke";

import "../../react/toolbar-exact.css";

const CaptureNavButton = ({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: import("react").ReactNode;
}) => (
  <a className="landing-nav-icon" href={href} aria-label={label} title={label}>
    {children}
  </a>
);

export const Hero = () => {
  return (
    <section className="landing-hero">
      <div className="landing-dot-grid" aria-hidden="true" />

      <a href="/" className="landing-top-logo" aria-label="Icodraw home">
        <img src="/inki.png" alt="" />
        <span>Icodraw</span>
      </a>

      {/* ── Top-right social pills ── */}
      <div className="landing-top-social" aria-label="Creator links">
        <a
          href="https://x.com/insanekrishnaa"
          className="landing-social-pill"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Twitter / X"
        >
          {/* X / Twitter */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-4.714-6.231-5.401 6.231H2.744l7.73-8.835L1.254 2.25H8.08l4.26 5.632 5.904-5.632zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
          </svg>
          @insanekrishnaa
        </a>

        <a
          href="https://github.com/insanekrishnna"
          className="landing-social-pill"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="GitHub"
        >
          {/* GitHub */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0 1 12 6.844a9.59 9.59 0 0 1 2.504.337c1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.017C22 6.484 17.522 2 12 2z" />
          </svg>
          GitHub
        </a>

        <a
          href="https://prathm.me/"
          className="landing-social-pill"
          target="_blank"
          rel="noopener noreferrer"
          aria-label="Portfolio"
        >
          {/* Globe / Portfolio */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
          prathm.me
        </a>
      </div>

      <header className="landing-island landing-island-glass" aria-label="Landing navigation">
        <div className="landing-island-dismiss-hint" aria-hidden="true"></div>
        <div className="landing-island-glass-effect" aria-hidden="true"></div>
        <div className="landing-island-glass-tint" aria-hidden="true"></div>
        <div className="landing-island-glass-shine" aria-hidden="true"></div>
        
        <a className="landing-island-brand" href="/" aria-label="Icodraw">
          <img src="/inki.png" alt="Icodraw" className="landing-island-logo" />
        </a>

        <div className="landing-island-group capture-modes">
          <a className="landing-island-btn" href="/capture.html" aria-label="Capture region">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <path d="M4 8V4h4"></path><path d="M4 16v4h4"></path><path d="M16 4h4v4"></path><path d="M16 20h4v-4"></path><rect x="8" y="8" width="8" height="8" rx="1" strokeDasharray="2 2"></rect>
            </svg>
          </a>
          <a className="landing-island-btn" href="/capture.html" aria-label="Capture window">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="3" y="4" width="18" height="16" rx="2"></rect><path d="M3 8h18"></path><circle cx="5.5" cy="6" r=".5" fill="currentColor"></circle><circle cx="7.5" cy="6" r=".5" fill="currentColor"></circle><circle cx="9.5" cy="6" r=".5" fill="currentColor"></circle>
            </svg>
          </a>
          <a className="landing-island-btn" href="/capture.html" aria-label="Capture fullscreen">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <rect x="2" y="3" width="20" height="14" rx="2"></rect><path d="M6 21h12"></path><path d="M12 17v4"></path>
            </svg>
          </a>
        </div>
      </header>

      <div className="landing-hero-layout">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Screen capture, cleaned up</span>
          <h1>
            Icodraw lets you capture screen <br className="landing-heading-break" />
            with <span>elegance.</span>
          </h1>
          <p>
            Fast captures. Clean marks. Zero friction. <br />
            A minimalist operating tool designed for absolute focus.
          </p>
          <div className="landing-hero-actions">
            <a className="landing-primary-cta" href="/capture.html">
              Get started
            </a>
            <a className="landing-secondary-cta" href="#features">
              See in action
            </a>
          </div>
        </div>

        <ScrollStroke />
      </div>
    </section>
  );
};
