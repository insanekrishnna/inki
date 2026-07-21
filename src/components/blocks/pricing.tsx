import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";

export const Pricing = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container max-w-4xl">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Simple, transparent pricing.
          </h2>
          <p className="mt-4 text-muted-foreground text-lg md:text-xl font-light">
            Download first. Pay after the trial. No subscriptions.
          </p>
        </div>

        <div className="relative rounded-3xl border border-border/50 bg-background/50 backdrop-blur-sm p-8 md:p-12 shadow-xl flex flex-col md:flex-row gap-12 items-center justify-between">
          <div className="flex-1">
            <h3 className="text-2xl font-semibold">Personal License</h3>
            <p className="mt-2 text-muted-foreground">
              Unlock the full app after the 30-day trial. Includes scrolling captures, annotation, export, and clipboard workflows.
            </p>
            <ul className="mt-8 space-y-4">
              {[
                "Download and try it before paying.",
                "Activate by email after checkout.",
                "Use one license on up to 2 active devices.",
                "Free updates for 1 year."
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                  <span className="text-muted-foreground">{feature}</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="bg-primary/5 rounded-2xl p-8 flex flex-col items-center justify-center min-w-[280px] border border-primary/10">
            <div className="flex items-baseline gap-1">
              <span className="text-5xl font-bold tracking-tight">9€</span>
              <span className="text-muted-foreground text-sm font-medium">one-time</span>
            </div>
            <p className="mt-2 text-sm text-muted-foreground text-center">Full app · 2 devices</p>
            <Button size="lg" className="w-full mt-8 rounded-xl h-12 shadow-sm font-medium" asChild>
              <a href="https://github.com/your-github-username/your-project/releases/latest">
                Download Now
              </a>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
};
