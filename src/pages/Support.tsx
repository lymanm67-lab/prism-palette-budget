import { useEffect, useMemo, useState } from 'react';
import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

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

const SUPPORT_EMAIL = 'Lymanm67@gmail.com';

const SUPPORT_FAQS = [
  {
    id: 'returns',
    category: 'Returns',
    question: 'How do I request a return or refund?',
    answer:
      'Email PrismMoney™ support with your order number, the item name, the reason for the return, and whether the package was opened or used. Once your request is reviewed, support will reply with the next steps and return instructions if your request is approved.',
  },
  {
    id: 'return-window',
    category: 'Returns',
    question: 'How long do I have to start a return?',
    answer:
      'Return requests should be submitted within 30 days of delivery. Include your order details and the date the item arrived so support can verify eligibility quickly.',
  },
  {
    id: 'billing',
    category: 'Billing',
    question: 'What should I do if I see an unexpected charge?',
    answer:
      'Send the billing date, amount charged, order number if available, and the email used at checkout. PrismMoney™ support can review the transaction and help confirm whether it was a duplicate, pending, or valid purchase.',
  },
  {
    id: 'account-help',
    category: 'Account Help',
    question: 'How can I get help accessing my account or order details?',
    answer:
      'If you cannot access your account, include the email address you used when ordering, your full name, and a short description of the issue. Support can help verify your purchase and guide you to the correct next step.',
  },
  {
    id: 'response-times',
    category: 'General Support',
    question: 'How fast will support respond?',
    answer:
      'Most support questions receive a response within 1–2 business days. For faster handling, include your order number, purchase date, and all relevant return or billing details in your first message.',
  },
];

const buildPrefilledDetails = (category: string, question: string) =>
  `Support topic: ${category}\nQuestion: ${question}\n\nOrder number:\nPurchase date:\nDetails:`;

export default function Support() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    orderNumber: '',
    topic: 'Returns',
    details: buildPrefilledDetails('Returns', SUPPORT_FAQS[0].question),
  });

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

  const emailHref = useMemo(() => {
    const subject = `${form.topic} — PrismMoney™ Support Request${form.orderNumber ? ` (${form.orderNumber})` : ''}`;
    const body = [
      `Name: ${form.name || '[Your name]'}`,
      `Email: ${form.email || '[Your email]'}`,
      `Order number: ${form.orderNumber || '[Order number]'}`,
      '',
      form.details,
    ].join('\n');

    return `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }, [form]);

  const handlePrefill = (category: string, question: string) => {
    setForm((current) => ({
      ...current,
      topic: category,
      details: buildPrefilledDetails(category, question),
    }));

    document.getElementById('contact-support-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
                <CardContent className="space-y-4">
                  <p className="text-sm leading-6 text-muted-foreground">{faq.answer}</p>
                  <Button variant="outline" onClick={() => handlePrefill(faq.category, faq.question)}>
                    Contact support
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        <Card id="contact-support-form">
          <CardHeader>
            <CardTitle>Contact Support</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="support-name">Name</Label>
                <Input
                  id="support-name"
                  value={form.name}
                  onChange={(e) => setForm((current) => ({ ...current, name: e.target.value }))}
                  placeholder="Your name"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-email">Email</Label>
                <Input
                  id="support-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm((current) => ({ ...current, email: e.target.value }))}
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="support-order">Order Number</Label>
                <Input
                  id="support-order"
                  value={form.orderNumber}
                  onChange={(e) => setForm((current) => ({ ...current, orderNumber: e.target.value }))}
                  placeholder="Optional order number"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="support-topic">Topic</Label>
                <Input
                  id="support-topic"
                  value={form.topic}
                  onChange={(e) => setForm((current) => ({ ...current, topic: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="support-details">Details</Label>
              <Textarea
                id="support-details"
                value={form.details}
                onChange={(e) => setForm((current) => ({ ...current, details: e.target.value }))}
                className="min-h-40"
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <a href={emailHref}>Email support</a>
              </Button>
              <p className="self-center text-sm text-muted-foreground">
                FAQ links prefill the topic and details for you.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}