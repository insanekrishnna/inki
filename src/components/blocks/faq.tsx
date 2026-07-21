import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    question: "Is Your Project free?",
    answer: "Your Project has a 30-day trial. After the trial, buy a license and activate it with your checkout email.",
  },
  {
    question: "How does the license work?",
    answer: "Each license allows 2 active device activations. Active licenses are revalidated online periodically, while captures remain local.",
  },
  {
    question: "What platforms does Your Project support?",
    answer: "macOS (Intel & Apple Silicon), Windows (portable), and Linux (AppImage). Same feature set on all three.",
  },
  {
    question: "Does Your Project upload my data?",
    answer: "No. Everything runs locally. No analytics, no telemetry, no accounts. Your screen stays yours.",
  },
  {
    question: "How do I get started?",
    answer: "Download the binary for your platform, launch it, and press Cmd+Shift+S (macOS) or Ctrl+Shift+S. No install wizard needed.",
  },
];

export const FAQ = () => {
  return (
    <section className="py-24 lg:py-32">
      <div className="container max-w-3xl">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold tracking-tight md:text-5xl">
            Frequently Asked Questions
          </h2>
          <p className="mt-4 text-muted-foreground text-lg">
            Everything you need to know about Your Project and billing.
          </p>
        </div>
        
        <Accordion type="single" collapsible className="w-full">
          {faqs.map((faq, index) => (
            <AccordionItem key={index} value={`item-${index}`} className="border-border/40 px-2 py-1">
              <AccordionTrigger className="text-left text-[15px] font-medium hover:no-underline hover:text-primary transition-colors">
                {faq.question}
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground leading-relaxed">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};
