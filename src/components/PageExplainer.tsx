import { HelpCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface Section {
  heading: string;
  body: React.ReactNode;
}

interface PageExplainerProps {
  title?: string;
  sections: Section[];
  defaultOpen?: boolean;
}

export function PageExplainer({ title = 'How to read this page', sections, defaultOpen = false }: PageExplainerProps) {
  return (
    <Card className="border-prism-sky/30 bg-prism-sky/5">
      <CardContent className="p-4">
        <Accordion type="single" collapsible defaultValue={defaultOpen ? 'how' : undefined}>
          <AccordionItem value="how" className="border-0">
            <AccordionTrigger className="py-1 hover:no-underline">
              <span className="flex items-center gap-2 text-sm font-semibold">
                <HelpCircle className="h-4 w-4 text-prism-sky" />
                {title}
              </span>
            </AccordionTrigger>
            <AccordionContent className="text-xs text-muted-foreground space-y-3 pt-2">
              {sections.map((s, i) => (
                <div key={i}>
                  <p className="font-semibold text-foreground">{s.heading}</p>
                  <div className="mt-1">{s.body}</div>
                </div>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </CardContent>
    </Card>
  );
}
