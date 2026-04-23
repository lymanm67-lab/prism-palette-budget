import { useEffect } from 'react';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const SUPPORT_URL = 'https://www.prismbudget.com/support';
const SUPPORT_TITLE = 'PrismMoney™ Support | Returns, Billing & Account Help';
const SUPPORT_DESCRIPTION = 'Contact PrismMoney™ support for returns, billing questions, account help, and customer assistance with quick answers and direct support information.';

const SUPPORT_ITEMS = [
  {
    icon: Mail,
    label: 'Email',
    value: 'Lymanm67@gmail.com',
    href: 'mailto:Lymanm67@gmail.com',
  },
  {
    icon: Phone,
    label: 'Phone',
    value: '(330) 305-2639',
    href: 'tel:+13303052639',
  },
  {
    icon: Globe,
    label: 'Website',
    value: 'https://www.prismbudget.com',
    href: 'https://www.prismbudget.com',
  },
  {
    icon: MapPin,
    label: 'Business Address',
    value: '2260 6th Street SW, Akron, OH 44314, United States',
  },
];

const SUPPORT_FAQS = [
  {
    id: 'returns',
    question: 'How do I request a return or refund?',
    answer:
      'Email PrismMoney™ support with your order number, the item name, the reason for the return, and whether the package was opened or used. Once your request is reviewed, support will reply with the next steps and return instructions if your request is approved.',
  },
  {
    id: 'return-window',
    question: 'How long do I have to start a return?',
    answer:
      'Return requests should be submitted within 30 days of delivery. Include your order details and the date the item arrived so support can verify eligibility quickly.',
  },
  {
    id: 'billing',
    question: 'What should I do if I see an unexpected charge?',
    answer:
      'Send the billing date, amount charged, order number if available, and the email used at checkout. PrismMoney™ support can review the transaction and help confirm whether it was a duplicate, pending, or valid purchase.',
  },
  {
    id: 'account-help',
    question: 'How can I get help accessing my account or order details?',
    answer:
      'If you cannot access your account, include the email address you used when ordering, your full name, and a short description of the issue. Support can help verify your purchase and guide you to the correct next step.',
  },
  {
    id: 'response-times',
    question: 'How fast will support respond?',
    answer:
      'Most support questions receive a response within 1–2 business days. For faster handling, include your order number, purchase date, and all relevant return or billing details in your first message.',
  },
];

export default function Support() {
  useEffect(() => {
    const previousTitle = document.title;

    const upsertMeta = (selector: string, attribute: 'name' | 'property', value: string, content: string) => {
      let element = document.head.querySelector(selector) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attribute, value);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    const upsertLink = (rel: string, href: string) => {
      let element = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
      if (!element) {
        element = document.createElement('link');
        element.setAttribute('rel', rel);
        document.head.appendChild(element);
      }
      element.setAttribute('href', href);
    };

    document.title = SUPPORT_TITLE;
    upsertMeta('meta[name="description"]', 'name', 'description', SUPPORT_DESCRIPTION);
    upsertMeta('meta[property="og:title"]', 'property', 'og:title', SUPPORT_TITLE);
    upsertMeta('meta[property="og:description"]', 'property', 'og:description', SUPPORT_DESCRIPTION);
    upsertMeta('meta[property="og:type"]', 'property', 'og:type', 'website');
    upsertMeta('meta[property="og:url"]', 'property', 'og:url', SUPPORT_URL);
    upsertLink('canonical', SUPPORT_URL);

    return () => {
      document.title = previousTitle;
    };
  }, []);

  return (
    <main className="min-h-screen bg-background px-6 py-16 text-foreground">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
        <header className="space-y-3">
          <p className="text-sm font-medium text-primary">PrismMoney™</p>
          <h1 className="font-display text-4xl font-bold tracking-tight">Customer Support</h1>
          <p className="max-w-2xl text-base text-muted-foreground">
            Contact PrismMoney™ support for product questions, return requests, and customer assistance.
          </p>
        </header>

        <Card>
          <CardHeader>
            <CardTitle>Support Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            {SUPPORT_ITEMS.map((item) => {
              const Icon = item.icon;
              const content = (
                <div className="flex items-start gap-3 rounded-lg border border-border bg-card p-4">
                  <div className="mt-0.5 rounded-md bg-muted p-2 text-foreground">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{item.label}</p>
                    <p className="break-words text-sm text-muted-foreground">{item.value}</p>
                  </div>
                </div>
              );

              return item.href ? (
                <a key={item.label} href={item.href} className="transition-opacity hover:opacity-90">
                  {content}
                </a>
              ) : (
                <div key={item.label}>{content}</div>
              );
            })}
          </CardContent>
        </Card>

        <section className="space-y-5" aria-labelledby="support-faq-heading">
          <div className="space-y-2">
            <h2 id="support-faq-heading" className="font-display text-2xl font-bold tracking-tight">
              Support FAQ
            </h2>
            <p className="text-sm text-muted-foreground">
              Quick answers for returns, billing questions, and account help.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {SUPPORT_FAQS.map((faq) => (
              <a
                key={faq.id}
                href={`#${faq.id}`}
                className="rounded-lg border border-border bg-card px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-muted"
              >
                {faq.question}
              </a>
            ))}
          </div>

          <div className="space-y-4">
            {SUPPORT_FAQS.map((faq) => (
              <Card key={faq.id} id={faq.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}