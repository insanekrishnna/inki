import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ToggleTheme } from "@/components/ui/toggle-theme";
import "../../react/toolbar-exact.css";

export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-start overflow-hidden bg-white dark:bg-[#05070a]">
      {/* Exact navbar code from capture.html */}
      <div className="toolbar liquidGlass-wrapper">
        <div className="toolbar-dismiss-hint" aria-hidden="true"></div>
        <div className="liquidGlass-effect" aria-hidden="true"></div>
        <div className="liquidGlass-tint" aria-hidden="true"></div>
        <div className="liquidGlass-shine" aria-hidden="true"></div>
        <div className="toolbar-brand" aria-label="INKI">
          <img src="inki.png" alt="INKI" className="toolbar-logo" />
        </div>
        <div className="toolbar-group capture-modes">
          <button className="toolbar-btn" id="btn-capture-region" data-tooltip="Capture region" onClick={() => window.location.href = '/capture.html'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M4 8V4h4"/><path d="M4 16v4h4"/><path d="M16 4h4v4"/><path d="M16 20h4v-4"/><rect x="8" y="8" width="8" height="8" rx="1" strokeDasharray="2 2"/></svg></button>
          <button className="toolbar-btn" id="btn-capture-window" data-tooltip="Capture window" onClick={() => window.location.href = '/capture.html'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18"/><circle cx="5.5" cy="6" r=".5" fill="currentColor"/><circle cx="7.5" cy="6" r=".5" fill="currentColor"/><circle cx="9.5" cy="6" r=".5" fill="currentColor"/></svg></button>
          <button className="toolbar-btn" id="btn-capture-fullscreen" data-tooltip="Capture fullscreen" onClick={() => window.location.href = '/capture.html'}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M6 21h12"/><path d="M12 17v4"/></svg></button>
        </div>
        <div id="react-theme-toggle-root">
          <ToggleTheme />
        </div>
      </div>

      <div className="container relative z-10 flex flex-col items-start justify-center text-left px-4 lg:px-12 pt-20">
        <h1 className="text-zinc-900 dark:text-zinc-100 max-w-[800px] text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-[72px] font-extralight leading-[1.1]">
          Inki lets you capture <br className="hidden md:block" /> screen with <span className="font-medium text-zinc-900 dark:text-white">elegance.</span>
        </h1>

        <p className="text-zinc-500 dark:text-zinc-400 text-lg mt-8 md:text-xl font-light max-w-[600px] leading-relaxed">
          Fast captures. Clean marks. Zero friction. A minimalist operating tool designed for absolute focus.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-start gap-4">
          <Button asChild size="lg" className="rounded-md px-6 h-12 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 text-sm font-medium transition-all duration-300">
            <a href="/capture.html">
              Download App
            </a>
          </Button>
          <Button asChild variant="outline" size="lg" className="rounded-md px-6 h-12 bg-white dark:bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 hover:scale-[1.02] active:scale-95 text-sm font-medium transition-all duration-300">
            <a href="#features">
              Check out features
            </a>
          </Button>
        </div>
      </div>
    </section>
  );
};
