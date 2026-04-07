import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import { axe, toHaveNoViolations } from "vitest-axe";
import { BrowserRouter } from "react-router-dom";

expect.extend(toHaveNoViolations);

const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <BrowserRouter>{children}</BrowserRouter>
);

async function expectNoA11yViolations(ui: React.ReactElement) {
  const { container } = render(ui, { wrapper: Wrapper });
  const results = await axe(container);
  // @ts-expect-error vitest-axe matcher
  expect(results).toHaveNoViolations();
}

describe("WCAG Accessibility Audit (axe-core)", () => {
  it("OfflineBanner has no violations", async () => {
    const { default: OfflineBanner } = await import("@/components/OfflineBanner");
    await expectNoA11yViolations(<OfflineBanner />);
  });

  it("EmptyState has no violations", async () => {
    const { EmptyState } = await import("@/components/EmptyState");
    const { Inbox } = await import("lucide-react");
    await expectNoA11yViolations(
      <EmptyState icon={Inbox} title="Nothing here" description="No data yet" />
    );
  });

  it("SkeletonCard has no violations", async () => {
    const { SkeletonCard } = await import("@/components/SkeletonCard");
    await expectNoA11yViolations(<SkeletonCard />);
  });

  it("Button has no violations", async () => {
    const { Button } = await import("@/components/ui/button");
    await expectNoA11yViolations(<Button>Click me</Button>);
  });

  it("Badge has no violations", async () => {
    const { Badge } = await import("@/components/ui/badge");
    await expectNoA11yViolations(<Badge>Status</Badge>);
  });

  it("Card has no violations", async () => {
    const { Card, CardHeader, CardTitle, CardContent } = await import("@/components/ui/card");
    await expectNoA11yViolations(
      <Card>
        <CardHeader><CardTitle>Title</CardTitle></CardHeader>
        <CardContent>Body</CardContent>
      </Card>
    );
  });

  it("Alert has no violations", async () => {
    const { Alert, AlertTitle, AlertDescription } = await import("@/components/ui/alert");
    await expectNoA11yViolations(
      <Alert>
        <AlertTitle>Heads up</AlertTitle>
        <AlertDescription>Something happened</AlertDescription>
      </Alert>
    );
  });
});
