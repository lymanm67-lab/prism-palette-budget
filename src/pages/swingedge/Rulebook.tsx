// SwingEdge — My Rulebook.
//
// Rules are plain sentences the owner can switch on, change the number in, or
// write from scratch. The Trade Planner checks them automatically, so this page
// is the one place where "my rules" actually lives.

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import SwingEdgeHeader from '@/components/swingedge/SwingEdgeHeader';
import HowToUse from '@/components/swingedge/HowToUse';
import NextStepsCard from '@/components/swingedge/NextStepsCard';
import { useTradingSettings, useTradingTitle } from '@/hooks/use-swingedge';
import { useTradingRules } from '@/hooks/use-swingedge-rulebook';
import { ruleSentence, templateFor, type RuleRow } from '@/lib/swingedge/rulebook';

function RuleCard({
  rule,
  onToggle,
  onThreshold,
  onRemove,
}: {
  rule: RuleRow;
  onToggle: (enabled: boolean) => void;
  onThreshold: (value: number) => void;
  onRemove: () => void;
}) {
  const template = templateFor(rule.rule_key);
  const [draft, setDraft] = useState(rule.threshold === null ? '' : String(rule.threshold));

  const sentence = template
    ? ruleSentence(template, rule.threshold)
    : (rule.custom_text ?? 'Your own rule');

  return (
    <div className={cn('rounded-lg border p-3', !rule.enabled && 'opacity-60')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-1">
          <p className="text-sm font-medium">{sentence}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className="text-[10px]">
              {template ? template.label : 'My own rule'}
            </Badge>
            {template ? (
              <span className="text-xs text-muted-foreground">{template.why}</span>
            ) : (
              <span className="text-xs text-muted-foreground">
                You check this one yourself before you enter.
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Switch checked={rule.enabled} onCheckedChange={onToggle} />
          {!template ? (
            <Button variant="ghost" size="icon" onClick={onRemove} aria-label="Remove this rule">
              <Trash2 className="h-4 w-4" />
            </Button>
          ) : null}
        </div>
      </div>

      {template?.defaultThreshold !== null && template ? (
        <div className="mt-3 flex items-end gap-2">
          <div className="w-32">
            <Label className="text-xs">My number ({template.unit})</Label>
            <Input
              type="number"
              min={template.min}
              max={template.max}
              step={template.step}
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={() => {
                const value = Number(draft);
                if (!Number.isFinite(value)) {
                  setDraft(rule.threshold === null ? '' : String(rule.threshold));
                  return;
                }
                const clamped = Math.min(template.max, Math.max(template.min, value));
                setDraft(String(clamped));
                if (clamped !== rule.threshold) onThreshold(clamped);
              }}
            />
          </div>
          <p className="pb-2 text-xs text-muted-foreground">
            Allowed {template.min} to {template.max}.
          </p>
        </div>
      ) : null}
    </div>
  );
}

export default function Rulebook() {
  useTradingTitle('My Rulebook');
  const { settings } = useTradingSettings();
  const { rules, isLoading, updateRule, addCustomRule, removeRule, isSaving } = useTradingRules();
  const [newRule, setNewRule] = useState('');

  const builtIn = rules.filter((r) => templateFor(r.rule_key));
  const custom = rules.filter((r) => !templateFor(r.rule_key));
  const onCount = rules.filter((r) => r.enabled).length;

  const addRule = async () => {
    const text = newRule.trim();
    if (text.length < 8) {
      toast.error('Write the rule as a full sentence first.');
      return;
    }
    try {
      await addCustomRule(text);
      setNewRule('');
      toast.success('Rule added');
    } catch {
      toast.error('Could not add that rule');
    }
  };

  return (
    <div className="space-y-6">
      <SwingEdgeHeader
        title="My Rulebook"
        subtitle="Write your rules in plain words. The planner checks them for you before every trade."
        mode={settings.data_mode}
        right={
          <Badge variant="outline" className="text-xs">
            {onCount} rules on
          </Badge>
        }
      />

      <HowToUse
        id="rulebook-how-to"
        title="How to use this screen"
        description="Set the rules once, then let the planner hold you to them."
        steps={[
          'Read each rule and change the number so it matches how you actually want to trade.',
          'Switch off any rule you do not want to be held to. Nothing is hidden from you.',
          'Add your own rules at the bottom in your own words.',
          'Open the Trade Planner — your rules are checked there automatically, and broken ones are flagged before you save a plan.',
        ]}
        tips={[
          'Rules marked "stop and fix" block nothing on their own, but the planner will tell you plainly that you are breaking your own plan.',
          'Rules you write yourself cannot be measured for you, so the planner reminds you to check them.',
        ]}
      />

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">The rules I keep</CardTitle>
          <CardDescription>
            These are checked against whatever plan is on the screen. When a number is missing the
            check says so instead of guessing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading your rules…</p>
          ) : (
            builtIn.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={(enabled) => updateRule({ id: rule.id, enabled })}
                onThreshold={(threshold) => updateRule({ id: rule.id, threshold })}
                onRemove={() => removeRule(rule.id)}
              />
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Rules in my own words</CardTitle>
          <CardDescription>
            Write anything you want to be reminded of, such as "I never trade the first thirty
            minutes" or "I take Fridays off".
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {custom.length === 0 ? (
            <p className="text-sm text-muted-foreground">You have not written any yet.</p>
          ) : (
            custom.map((rule) => (
              <RuleCard
                key={rule.id}
                rule={rule}
                onToggle={(enabled) => updateRule({ id: rule.id, enabled })}
                onThreshold={(threshold) => updateRule({ id: rule.id, threshold })}
                onRemove={async () => {
                  await removeRule(rule.id);
                  toast.success('Rule removed');
                }}
              />
            ))
          )}
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              value={newRule}
              onChange={(e) => setNewRule(e.target.value)}
              placeholder="I never add to a losing position."
              maxLength={200}
            />
            <Button onClick={addRule} disabled={isSaving}>
              <Plus className="mr-2 h-4 w-4" />
              Add rule
            </Button>
          </div>
        </CardContent>
      </Card>

      <NextStepsCard
        summary="Rules only help when something checks them at the moment you are tempted to break them."
        steps={[
          { label: 'Build a plan and watch the rule check', to: '/swingedge/planner', cta: 'Open Trade Planner' },
          { label: 'See how well you followed them lately', to: '/swingedge/performance', cta: 'Open Performance' },
          { label: 'Test what your risk number does over many trades', to: '/swingedge/risk-lab', cta: 'Open Risk Lab' },
        ]}
      />
    </div>
  );
}
