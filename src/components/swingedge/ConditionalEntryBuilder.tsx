import { Plus, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CONDITION_KIND_LABEL,
  CONDITION_LOGIC_TEXT,
  type ConditionKind,
  type ConditionMode,
  type EntryCondition,
} from '@/lib/swingedge/conditionalStaging';

const TIMEFRAMES = ['15 minute', '1 hour', '4 hour', 'Daily'];

/**
 * The full conditional entry builder. It lives only in the Trade Planner — the
 * Analyzer never builds an order.
 */
export default function ConditionalEntryBuilder({
  conditions,
  onChange,
  mode,
  onModeChange,
  advanced,
  expiresAt,
  onExpiresChange,
  cancelCondition,
  onCancelChange,
}: {
  conditions: EntryCondition[];
  onChange: (next: EntryCondition[]) => void;
  mode: ConditionMode;
  onModeChange: (m: ConditionMode) => void;
  advanced: boolean;
  expiresAt: string;
  onExpiresChange: (v: string) => void;
  cancelCondition: string;
  onCancelChange: (v: string) => void;
}) {
  const update = (id: string, patch: Partial<EntryCondition>) =>
    onChange(conditions.map((c) => (c.id === id ? { ...c, ...patch } : c)));

  const add = () =>
    onChange([
      ...conditions,
      {
        id: `custom-${Date.now()}`,
        kind: 'STUDY',
        timeframe: '1 hour',
        text: '',
        enabled: true,
      },
    ]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Label className="text-xs text-muted-foreground">Condition mode</Label>
        <Select value={mode} onValueChange={(v) => onModeChange(v as ConditionMode)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SIMPLE">Simple</SelectItem>
            <SelectItem value="ADVANCED" disabled={!advanced}>
              Advanced
            </SelectItem>
          </SelectContent>
        </Select>
        <Badge variant="outline" className="text-[10px]">
          {CONDITION_LOGIC_TEXT}
        </Badge>
        {!advanced && (
          <span className="text-xs text-muted-foreground">
            Advanced conditions need Advanced Mode switched on in settings.
          </span>
        )}
      </div>

      <div className="space-y-2">
        {conditions.map((c, i) => (
          <div key={c.id} className="rounded-lg border p-2">
            <div className="flex flex-wrap items-center gap-2">
              <Checkbox checked={c.enabled} onCheckedChange={(v) => update(c.id, { enabled: !!v })} />
              <Badge variant="secondary" className="text-[10px]">
                {i === 0 ? 'IF' : 'AND'} · {CONDITION_KIND_LABEL[c.kind]}
              </Badge>
              {mode === 'ADVANCED' ? (
                <>
                  <Select value={c.kind} onValueChange={(v) => update(c.id, { kind: v as ConditionKind })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CONDITION_KIND_LABEL) as ConditionKind[]).map((k) => (
                        <SelectItem key={k} value={k}>
                          {CONDITION_KIND_LABEL[k]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={c.timeframe} onValueChange={(v) => update(c.id, { timeframe: v })}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMEFRAMES.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    value={c.text}
                    onChange={(e) => update(c.id, { text: e.target.value })}
                    placeholder="For example: EMA 20 is above SMA 50"
                    className="min-w-[220px] flex-1"
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    aria-label="Remove this condition"
                    onClick={() => onChange(conditions.filter((x) => x.id !== c.id))}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </>
              ) : (
                <span className="text-sm">
                  <span className="text-muted-foreground">{c.timeframe}: </span>
                  {c.text || 'not set'}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {mode === 'ADVANCED' && (
        <div className="space-y-2">
          <Button size="sm" variant="outline" onClick={add}>
            <Plus className="mr-2 h-4 w-4" /> Add a condition
          </Button>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Order expires</Label>
              <Input type="date" value={expiresAt} onChange={(e) => onExpiresChange(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Cancel the order if</Label>
              <Input
                value={cancelCondition}
                onChange={(e) => onCancelChange(e.target.value)}
                placeholder="For example: the daily close falls below the stop level"
              />
            </div>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Conditions only delay the order. They do not make a weak setup a good one — read the trade again when they
        trigger.
      </p>
    </div>
  );
}
