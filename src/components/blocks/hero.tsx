import { Monitor, ScanLine, SquareDashedMousePointer } from "lucide-react";
import { ToggleTheme } from "@/components/ui/toggle-theme";

import "../../react/toolbar-exact.css";

const ProductVisual = () => (
  <div className="landing-product-visual" aria-label="Inki capture editor preview">
    <div className="landing-product-window">
      <div className="landing-window-bar">
        <div className="landing-window-dots" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span>Inki capture</span>
      </div>
      <div className="landing-product-body">
        <aside className="landing-product-tools" aria-hidden="true">
          <SquareDashedMousePointer size={18} strokeWidth={1.4} />
          <ScanLine size={18} strokeWidth={1.4} />
          <Monitor size={18} strokeWidth={1.4} />
          <span />
          <span />
          <span />
        </aside>
        <div className="landing-product-canvas">
          <div className="landing-canvas-selection">
            <div className="landing-selection-header">
              <span />
              <strong>Screenshot</strong>
            </div>
            <div className="landing-selection-lines">
              <span />
              <span />
              <span />
            </div>
          </div>
          <div className="landing-annotation landing-annotation-one" />
          <div className="landing-annotation landing-annotation-two" />
        </div>
      </div>
    </div>
    <div className="landing-product-note">
      <strong>3 tools</strong>
      <span>Capture, mark, share</span>
    </div>
  </div>
);

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

      <header className="landing-nav" aria-label="Landing navigation">
        <a className="landing-brand" href="/" aria-label="INKI home">
          <img src="/inki.png" alt="INKI" />
        </a>

        <nav className="landing-nav-actions" aria-label="Capture shortcuts">
          <CaptureNavButton href="/capture.html" label="Capture region">
            <SquareDashedMousePointer size={17} strokeWidth={1.5} />
          </CaptureNavButton>
          <CaptureNavButton href="/capture.html" label="Capture window">
            <ScanLine size={17} strokeWidth={1.5} />
          </CaptureNavButton>
          <CaptureNavButton href="/capture.html" label="Capture fullscreen">
            <Monitor size={17} strokeWidth={1.5} />
          </CaptureNavButton>
          <div className="landing-theme-toggle">
            <ToggleTheme />
          </div>
        </nav>
      </header>

      <div className="landing-hero-layout">
        <div className="landing-hero-copy">
          <span className="landing-eyebrow">Screen capture, cleaned up</span>
          <h1>
            Inki lets you capture screen <br className="landing-heading-break" />
            with <span>elegance.</span>
          </h1>
          <p>
            Fast captures. Clean marks. Zero friction. A minimalist operating tool designed for absolute focus.
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

        <ProductVisual />
      </div>
    </section>
  );
};
