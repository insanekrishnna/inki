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
          <h2 className="landing-feature-heading">Capture. Design. Deliver.</h2>
          <div className="landing-feature-grid">
            {items.map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="landing-feature-card fade-in-view">
                  <div className="landing-feature-icon-wrapper">
                    <Icon size={20} strokeWidth={1.5} />
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
};
