import { Button } from "@/components/ui/button";
import { ToggleTheme } from "@/components/ui/toggle-theme";

import "../../react/toolbar-exact.css";

/* ─── Ambient Floating Particles ─── */
const StarField = () => {
  const stars = Array.from({ length: 35 }, (_, i) => ({
    id: i,
    left: `${Math.random() * 100}%`,
    top: `${Math.random() * 100}%`,
    size: Math.random() * 2 + 0.5,
    delay: Math.random() * 8,
    duration: 6 + Math.random() * 8,
    variant: i % 2 === 0 ? 'float-particle' : 'float-particle-slow',
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
      {stars.map((s) => (
        <div
          key={s.id}
          className="absolute rounded-full bg-zinc-400 dark:bg-zinc-500"
          style={{
            left: s.left,
            top: s.top,
            width: `${s.size}px`,
            height: `${s.size}px`,
            animation: `${s.variant} ${s.duration}s ease-in-out ${s.delay}s infinite`,
            opacity: 0.25,
          }}
        />
      ))}
    </div>
  );
};

/* ─── Gradient Orbs ─── */
const AmbientOrbs = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none z-0" aria-hidden="true">
    {/* Primary warm orb */}
    <div
      className="absolute rounded-full blur-[120px] opacity-[0.04] dark:opacity-[0.06]"
      style={{
        width: '600px',
        height: '600px',
        right: '-100px',
        top: '10%',
        background: 'radial-gradient(circle, rgba(59,130,246,0.5) 0%, rgba(147,51,234,0.3) 50%, transparent 70%)',
        animation: 'orb-drift 20s ease-in-out infinite',
      }}
    />
    {/* Secondary accent orb */}
    <div
      className="absolute rounded-full blur-[100px] opacity-[0.03] dark:opacity-[0.05]"
      style={{
        width: '400px',
        height: '400px',
        left: '10%',
        bottom: '5%',
        background: 'radial-gradient(circle, rgba(236,72,153,0.4) 0%, rgba(251,146,60,0.2) 50%, transparent 70%)',
        animation: 'orb-drift 25s ease-in-out 3s infinite reverse',
      }}
    />
    {/* Tertiary subtle orb behind editor */}
    <div
      className="absolute rounded-full blur-[140px] opacity-[0.03] dark:opacity-[0.04]"
      style={{
        width: '500px',
        height: '500px',
        right: '15%',
        bottom: '20%',
        background: 'radial-gradient(circle, rgba(34,197,94,0.3) 0%, rgba(6,182,212,0.2) 50%, transparent 70%)',
        animation: 'orb-drift 18s ease-in-out 6s infinite',
      }}
    />
  </div>
);

/* ─── Dot Grid Background ─── */
const DotGrid = () => (
  <div
    className="absolute inset-0 pointer-events-none z-0"
    aria-hidden="true"
    style={{
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(0,0,0,0.06) 1px, transparent 0)',
      backgroundSize: '24px 24px',
    }}
  />
);

const DotGridDark = () => (
  <div
    className="absolute inset-0 pointer-events-none z-0 hidden dark:block"
    aria-hidden="true"
    style={{
      backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.04) 1px, transparent 0)',
      backgroundSize: '24px 24px',
    }}
  />
);

/* ─── Editor Preview Illustration ─── */
const EditorPreview = () => {
  const tools = [
    // Cursor/Select
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t1"><path d="M4 4l7.07 17 2.51-7.39L21 11.07z"/></svg>,
    // Crop/Region
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t2"><path d="M4 8V4h4"/><path d="M4 16v4h4"/><path d="M16 4h4v4"/><path d="M16 20h4v-4"/><rect x="8" y="8" width="8" height="8" rx="1" strokeDasharray="2 2"/></svg>,
    // Arrow
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t3"><path d="M5 12h14M12 5l7 7-7 7"/></svg>,
    // Pen
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t4"><path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/></svg>,
    // Text
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t5"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>,
    // Blur
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t6"><circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="7" strokeDasharray="2 2"/><circle cx="12" cy="12" r="10" opacity="0.3"/></svg>,
    // Shape
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" key="t7"><rect x="3" y="3" width="18" height="18" rx="2"/></svg>,
  ];

  return (
    <div className="relative w-full max-w-[650px]">
      {/* Glow behind preview */}
      <div
        className="absolute -inset-8 rounded-3xl opacity-[0.06] dark:opacity-[0.08] blur-2xl pointer-events-none"
        style={{ background: 'linear-gradient(135deg, rgba(59,130,246,0.4), rgba(147,51,234,0.3), rgba(236,72,153,0.2))' }}
      />

      {/* Main editor container */}
      <div className="relative rounded-2xl border border-zinc-200/80 dark:border-zinc-800/60 bg-white dark:bg-[#0c0c0e] shadow-md shadow-zinc-200/40 dark:shadow-black/40 overflow-hidden transition-shadow duration-500 hover:shadow-xl hover:shadow-zinc-300/50 dark:hover:shadow-black/60">

        {/* ── macOS Title Bar ── */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-zinc-50/80 dark:bg-[#141416] border-b border-zinc-200/60 dark:border-zinc-800/60">
          <div className="flex items-center gap-2">
            <span className="w-[10px] h-[10px] rounded-full bg-[#ff5f56] inline-block" />
            <span className="w-[10px] h-[10px] rounded-full bg-[#ffbd2e] inline-block" />
            <span className="w-[10px] h-[10px] rounded-full bg-[#27c93f] inline-block" />
          </div>
          <span className="text-[11px] text-zinc-400 dark:text-zinc-500 font-medium tracking-wide">Inki — Editor</span>
          <div className="w-12" />
        </div>

        {/* ── Editor Body ── */}
        <div className="flex">
          {/* ── Left Tool Sidebar ── */}
          <div className="w-11 bg-zinc-50/60 dark:bg-[#111113] border-r border-zinc-200/50 dark:border-zinc-800/50 flex flex-col items-center py-3 gap-1 shrink-0">
            {tools.map((icon, i) => (
              <div
                key={i}
                className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all duration-300 ${
                  i === 2
                    ? 'bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                }`}
                style={i === 2 ? { animation: 'tool-glow 3s ease-in-out infinite' } : undefined}
              >
                <div className="w-3.5 h-3.5">{icon}</div>
              </div>
            ))}

            {/* Separator */}
            <div className="w-5 h-px bg-zinc-200 dark:bg-zinc-700 my-1" />

            {/* Color swatches */}
            <div className="flex flex-col gap-1.5 mt-1">
              <div className="w-4 h-4 rounded-full bg-zinc-900 dark:bg-white border-2 border-zinc-300 dark:border-zinc-600" />
              <div className="w-4 h-4 rounded-full bg-[#3b82f6] border-2 border-blue-300/50 dark:border-blue-500/30" />
              <div className="w-4 h-4 rounded-full bg-[#ef4444] border-2 border-red-300/50 dark:border-red-500/30" />
            </div>
          </div>

          {/* ── Canvas Area ── */}
          <div className="flex-1 relative bg-white dark:bg-[#0c0c0e] flex items-center justify-center overflow-hidden group" style={{ minHeight: '320px' }}>
            {/* Canvas grid */}
            <div
              className="absolute inset-0 opacity-[0.4] dark:opacity-[0.15]"
              style={{
                backgroundImage: 'linear-gradient(rgba(0,0,0,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.03) 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            />

            {/* mac.webm internal canvas taking full width/height */}
            <video 
              src="/mac.webm" 
              autoPlay 
              loop 
              muted 
              playsInline
              className="absolute inset-0 w-full h-full object-contain opacity-95 z-10 scale-[2.1]" 
              style={{ padding: '24px' }}
            />
            
            {/* Subtle gradient fade at the bottom for depth */}
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-zinc-100/30 dark:from-[#0a0a0c]/80 to-transparent pointer-events-none z-10" />
          </div>
        </div>

        {/* ── Status Bar ── */}
        <div className="flex items-center justify-between px-4 py-1.5 bg-zinc-50/80 dark:bg-[#111113] border-t border-zinc-200/50 dark:border-zinc-800/50 text-[10px] text-zinc-400 dark:text-zinc-500">
          <span className="font-medium">Arrow Tool</span>
          <div className="flex items-center gap-3">
            <span>1920 × 1080</span>
            <span className="font-medium">100%</span>
          </div>
        </div>
      </div>
    </div>
  );
};


export const Hero = () => {
  return (
    <section className="relative min-h-[90vh] flex items-center justify-center overflow-hidden bg-white dark:bg-[#05070a] py-20">
      {/* ── Ambient Background Layers ── */}
      <DotGrid />
      <DotGridDark />
      <StarField />
      <AmbientOrbs />

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

      <div className="container relative z-10 px-6 lg:px-12 pt-16">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          
          {/* Left Hero Content — UNCHANGED */}
          <div className="lg:col-span-6 flex flex-col items-start text-left">
            <h1 className="text-zinc-900 dark:text-zinc-100 max-w-[620px] text-4xl tracking-tight sm:text-5xl md:text-6xl lg:text-[68px] font-extralight leading-[1.06]">
              Inki lets you capture <br className="hidden md:block" /> screen with <span className="font-medium text-zinc-900 dark:text-white">elegance.</span>
            </h1>

            <p className="text-zinc-500 dark:text-zinc-400 text-base md:text-lg font-light max-w-[500px] leading-relaxed mt-6">
              Fast captures. Clean marks. Zero friction. A minimalist operating tool designed for absolute focus.
            </p>

            <div className="mt-10 flex flex-wrap items-center justify-start gap-4">
              <Button asChild size="lg" className="rounded-md px-6 h-10 bg-zinc-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-zinc-800 dark:hover:bg-zinc-200 hover:scale-[1.02] active:scale-95 text-sm font-medium transition-all duration-300">
                <a href="/capture.html">
                  Get started
                </a>
              </Button>
              <Button asChild variant="outline" size="lg" className="rounded-md px-6 h-10 bg-white dark:bg-transparent border-zinc-200 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 hover:bg-zinc-50 dark:hover:bg-zinc-800 hover:text-zinc-900 hover:scale-[1.02] active:scale-95 text-sm font-medium transition-all duration-300">
                <a href="#features">
                  See in action
                </a>
              </Button>
            </div>
          </div>

          {/* Right — Editor Preview Illustration */}
          <div className="lg:col-span-6 w-full flex justify-center lg:justify-end">
            <EditorPreview />
          </div>

        </div>
      </div>
    </section>
  );
};
