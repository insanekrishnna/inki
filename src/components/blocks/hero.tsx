import { Monitor, ScanLine, SquareDashedMousePointer } from "lucide-react";
import { ToggleTheme } from "@/components/ui/toggle-theme";
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

        <ScrollStroke />
      </div>
    </section>
  );
};
