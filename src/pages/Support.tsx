import { Mail, Phone, Globe, MapPin } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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

export default function Support() {
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
      </div>
    </main>
  );
}