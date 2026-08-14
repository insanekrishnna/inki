import { Crop, Layers, Share2 } from "lucide-react";
import { useEffect, useRef } from "react";

const items = [
  {
    title: "Region & Window",
    description: "Capture exactly what you need with precision.",
    icon: Crop,
  },
  {
    title: "Clean Annotation",
    description: "Highlight, blur, and draw with elegant tools.",
    icon: Layers,
  },
  {
    title: "Instant Share",
    description: "Everything goes straight to clipboard immediately.",
    icon: Share2,
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
          <h2>Minimal. Powerful.</h2>
          <p>
            Clean captures, precise annotation, and instant sharing without leaving the focused tool surface.
          </p>
        </div>

        <div className="landing-feature-grid">
          {items.map((item, index) => {
            const Icon = item.icon;
            return (
              <article
                className="landing-feature-card fade-in-view"
                style={{ transitionDelay: `${index * 120}ms` }}
                key={item.title}
              >
                <div className="landing-feature-index">0{index + 1} / {item.title}</div>
                <Icon size={26} strokeWidth={1.25} aria-hidden="true" />
                <p>{item.description}</p>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
