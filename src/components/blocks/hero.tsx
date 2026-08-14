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

      <a href="/" className="landing-top-logo" aria-label="INKI home">
        <img src="/inki.png" alt="" />
        <span>INKI</span>
      </a>

      <header className="landing-island landing-island-glass" aria-label="Landing navigation">
        <div className="landing-island-dismiss-hint" aria-hidden="true"></div>
        <div className="landing-island-glass-effect" aria-hidden="true"></div>
        <div className="landing-island-glass-tint" aria-hidden="true"></div>
        <div className="landing-island-glass-shine" aria-hidden="true"></div>
        
        <a className="landing-island-brand" href="/" aria-label="INKI">
          <img src="/inki.png" alt="INKI" className="landing-island-logo" />
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
            Inki lets you capture screen <br className="landing-heading-break" />
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
