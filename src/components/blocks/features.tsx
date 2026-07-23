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
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.15, rootMargin: '0px 0px -40px 0px' }
    );

    const elements = sectionRef.current?.querySelectorAll('.fade-in-view');
    elements?.forEach((el) => observer.observe(el));

    return () => observer.disconnect();
  }, []);

  return (
    <section id="features" className="py-32 bg-white dark:bg-[#05070a] relative z-10 border-t border-zinc-100 dark:border-zinc-800" ref={sectionRef}>
      {/* Subtle background continuation */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] dark:opacity-[0.015]"
        aria-hidden="true"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, currentColor 0.5px, transparent 0)',
          backgroundSize: '32px 32px',
        }}
      />

      <div className="container px-4 relative">
        <div className="mx-auto flex flex-col items-center mb-24 text-center fade-in-view">
          <span className="text-zinc-400 dark:text-zinc-500 text-xs font-mono uppercase tracking-widest mb-4">
            Built for modern workflows
          </span>
          <h2 className="text-3xl md:text-5xl font-light text-zinc-900 dark:text-zinc-100 tracking-tight">
            Minimal. Powerful.
          </h2>
        </div>
        
        <div className="mx-auto grid max-w-5xl items-start gap-12 lg:grid-cols-3 relative">
          {/* Connecting lines between cards (desktop only) */}
          <div className="hidden lg:block absolute top-8 left-[33.33%] right-[33.33%] h-px pointer-events-none" aria-hidden="true">
            <div className="w-full h-px border-t border-dashed border-zinc-200 dark:border-zinc-800" />
          </div>

          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <div
                key={i}
                className="flex flex-col items-center text-center group fade-in-view"
                style={{ transitionDelay: `${i * 150}ms` }}
              >
                <div className="h-16 w-16 rounded-2xl bg-zinc-50 dark:bg-zinc-900 flex items-center justify-center mb-6 border border-zinc-100 dark:border-zinc-800 transition-all duration-500 group-hover:bg-zinc-100 dark:group-hover:bg-zinc-800 group-hover:scale-110 group-hover:border-zinc-200 dark:group-hover:border-zinc-700 shadow-sm relative z-10">
                  <Icon className="size-6 text-zinc-700 dark:text-zinc-300 transition-transform duration-500 group-hover:scale-110" strokeWidth={1} />
                </div>
                <h3 className="text-xl font-medium tracking-tight mb-3 text-zinc-900 dark:text-zinc-100">
                  {item.title}
                </h3>
                <p className="text-zinc-500 dark:text-zinc-400 leading-relaxed font-light text-sm max-w-[250px]">
                  {item.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
