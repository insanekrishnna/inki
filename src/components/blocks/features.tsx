import { useEffect, useRef } from "react";

/* ─── Illustration: Capture mode icon grid (2×2, centered) ─── */
const CaptureIllustration = () => (
  <div className="feat-illust feat-illust--capture">
    <div className="feat-icon-grid">
      <span className="feat-icon-sym">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M4 8V4h4"/><path d="M4 16v4h4"/><path d="M16 4h4v4"/><path d="M16 20h4v-4"/></svg>
      </span>
      <span className="feat-icon-sym">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 8h18"/></svg>
      </span>
      <span className="feat-icon-sym">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M6 21h12"/><path d="M12 17v4"/></svg>
      </span>
      <span className="feat-icon-sym">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="3"/><path d="M12 1v2"/><path d="M12 21v2"/><path d="M4.22 4.22l1.42 1.42"/><path d="M18.36 18.36l1.42 1.42"/><path d="M1 12h2"/><path d="M21 12h2"/><path d="M4.22 19.78l1.42-1.42"/><path d="M18.36 5.64l1.42-1.42"/></svg>
      </span>
    </div>
  </div>
);

/* ─── Illustration: Annotation tool list ─── */
const tools = [
  { label: "Crop", shortcut: "C", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg> },
  { label: "Select / Move", shortcut: "V", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M5 3l14 9-6 1-4 5z"/></svg> },
  { label: "Pixelate", shortcut: "P", icon: <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/></svg> },
];

const AnnotationIllustration = () => (
  <div className="feat-illust feat-illust--annotate">
    <div className="feat-tool-list">
      {tools.map((t) => (
        <div key={t.label} className="feat-tool-row">
          <span className="feat-tool-icon">{t.icon}</span>
          <span className="feat-tool-label">{t.label}</span>
          <kbd className="feat-tool-key">{t.shortcut}</kbd>
        </div>
      ))}
    </div>
  </div>
);

/* ─── Illustration: Action pill buttons ─── */
const ShareIllustration = () => (
  <div className="feat-illust feat-illust--share">
    <div className="feat-pills">
      <span className="feat-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy to clipboard
      </span>
      <span className="feat-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
        Share link
      </span>
      <span className="feat-pill">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
        Quick export
      </span>
    </div>
  </div>
);

const items = [
  {
    title: "Region & Window",
    description:
      "Capture exactly what you need with precision. Select any region, window, or full screen with a single shortcut. Zero friction.",
    Illustration: CaptureIllustration,
  },
  {
    title: "Clean Annotation",
    description:
      "Highlight, blur, and draw with elegant tools. Visualize edits in real time with a refined toolbar designed for focus and speed.",
    Illustration: AnnotationIllustration,
  },
  {
    title: "Instant Share",
    description:
      "Everything goes straight to clipboard immediately. Empower your workflow with one-click actions that just work.",
    Illustration: ShareIllustration,
  },
];

export const Features = () => {
  const sectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) entry.target.classList.add("visible");
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -40px 0px" }
    );

    const elements = sectionRef.current?.querySelectorAll(".fade-in-view");
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="landing-features" ref={sectionRef}>
      <div className="landing-dot-grid" aria-hidden="true" />
      <div className="landing-feature-shell">
        <div className="landing-feature-intro fade-in-view">
          <h2 className="landing-feature-heading">Capture. Design. Deliver.</h2>
          <p className="landing-feature-subhead">Everything you need to capture, annotate, and share in seconds.</p>
          <div className="landing-feature-grid">
            {items.map((item, i) => {
              const Illust = item.Illustration;
              return (
                <div
                  key={item.title}
                  className="landing-feature-card fade-in-view"
                  style={{ animationDelay: `${i * 0.1}s` }}
                >
                  <Illust />
                  <div className="feat-card-body">
                    <p>
                      <strong className="feat-card-title">{item.title}</strong>{" "}
                      {item.description}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
