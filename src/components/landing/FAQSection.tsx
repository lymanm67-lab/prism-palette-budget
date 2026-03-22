import { motion } from 'framer-motion';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const FAQS = [
  { q: 'Is Prism just a financial control system?', a: 'No. Prism is an all-in-one financial command center. It includes budgeting, subscription monitoring, forecasting, credit tracking, net worth visibility, tax prep organization, and business finance tools — all in one place.' },
  { q: 'What makes Prism different from other money apps?', a: 'Most apps do one thing — track spending or monitor subscriptions. Prism replaces multiple tools by combining personal budgeting, financial planning, waste detection, and business management into a single platform.' },
  { q: 'Can I use Prism for both personal and business finances?', a: 'Yes. The Business Pro plan gives you separate dashboards for personal and business finances, so you can manage both from one login without mixing them up.' },
  { q: 'Which plan is best for entrepreneurs?', a: 'The Business Pro plan is designed specifically for entrepreneurs, consultants, and small business owners who need visibility into both personal and business finances alongside premium planning tools.' },
  { q: 'Why should I choose annual billing?', a: 'Annual billing saves you up to $130 per year depending on your plan. It\'s the smart choice if you\'re committed to improving your financial health long-term.' },
  { q: 'Does Prism help with planning and organization, not just tracking?', a: 'Absolutely. Prism includes cash flow forecasting, tax prep organization, bill scheduling, savings goals, and financial insights — so you can plan ahead, not just look back.' },
  { q: 'Is there a free trial?', a: 'Yes. Every plan comes with a free trial so you can explore the features and see the value before committing.' },
];

const FAQSection = () => (
  <section id="faq" className="py-20 sm:py-28 bg-muted/20">
    <div className="mx-auto max-w-3xl px-6">
      <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
        className="text-center mb-14">
        <h2 className="font-display text-3xl sm:text-5xl font-extrabold tracking-tight">
          Frequently asked{' '}
          <span className="prism-gradient-text">questions</span>
        </h2>
      </motion.div>

      <Accordion type="single" collapsible className="space-y-3">
        {FAQS.map((faq, i) => (
          <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-5">
            <AccordionTrigger className="text-sm font-semibold text-foreground hover:no-underline py-4">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  </section>
);

export default FAQSection;
