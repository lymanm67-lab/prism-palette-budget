import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useThvUpsert, useThvDelete, type ThvTable } from '@/hooks/use-tiny-home-village';

export interface ThvField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'money' | 'percent' | 'select' | 'date' | 'textarea' | 'bool';
  options?: string[];
  span?: 1 | 2 | 3;
}

export function ThvFieldInput({
  field,
  value,
  onCommit,
}: {
  field: ThvField;
  value: any;
  onCommit: (v: any) => void;
}) {
  const { type, label, options } = field;

  return (
    <div className={cn('space-y-1', field.span === 2 && 'sm:col-span-2', field.span === 3 && 'sm:col-span-3')}>
      <Label className="text-xs text-muted-foreground">{label}</Label>

      {type === 'select' && (
        <Select value={value ?? ''} onValueChange={onCommit}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select" />
          </SelectTrigger>
          <SelectContent>
            {(options ?? []).map((o) => (
              <SelectItem key={o} value={o}>
                {o}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {type === 'bool' && (
        <div className="flex h-9 items-center">
          <Switch checked={!!value} onCheckedChange={onCommit} />
        </div>
      )}

      {type === 'textarea' && (
        <Textarea
          key={String(value ?? '')}
          defaultValue={value ?? ''}
          onBlur={(e) => e.target.value !== (value ?? '') && onCommit(e.target.value)}
          className="min-h-[72px] text-sm"
        />
      )}

      {(type === 'text' || type === 'date') && (
        <Input
          key={String(value ?? '')}
          type={type === 'date' ? 'date' : 'text'}
          defaultValue={value ?? ''}
          onBlur={(e) => e.target.value !== (value ?? '') && onCommit(e.target.value || null)}
          className="h-9"
        />
      )}

      {(type === 'number' || type === 'money' || type === 'percent') && (
        <div className="relative">
          <Input
            key={String(value ?? '')}
            type="number"
            step={type === 'money' ? 100 : 1}
            defaultValue={value ?? 0}
            onBlur={(e) => {
              const v = parseFloat(e.target.value);
              if (Number.isFinite(v) && v !== Number(value)) onCommit(v);
            }}
            className={cn('h-9', (type === 'money' || type === 'percent') && 'pl-6')}
          />
          {type === 'money' && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">$</span>
          )}
          {type === 'percent' && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">%</span>
          )}
        </div>
      )}
    </div>
  );
}

export default function ThvRecordManager({
  table,
  rows,
  fields,
  titleKey,
  defaults,
  addLabel,
  badgeKey,
  subtitle,
  emptyText,
  renderExtra,
}: {
  table: ThvTable;
  rows: any[];
  fields: ThvField[];
  titleKey: string;
  defaults: Record<string, unknown>;
  addLabel: string;
  badgeKey?: string;
  subtitle?: (row: any) => string;
  emptyText?: string;
  renderExtra?: (row: any, save: (patch: Record<string, unknown>) => void) => React.ReactNode;
}) {
  const upsert = useThvUpsert(table);
  const del = useThvDelete(table);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const save = (id: string, patch: Record<string, unknown>) => upsert.mutate({ id, ...patch });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'record' : 'records'}
        </p>
        <Button
          size="sm"
          variant="outline"
          onClick={() => upsert.mutate({ ...defaults } as any)}
          disabled={upsert.isPending}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          {addLabel}
        </Button>
      </div>

      {rows.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            {emptyText ?? 'Nothing tracked yet. Add your first record.'}
          </CardContent>
        </Card>
      )}

      {rows.map((row) => {
        const isOpen = !!open[row.id];
        return (
          <Card key={row.id} className="border-border/60 bg-card/60 backdrop-blur">
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <button
                  className="flex flex-1 items-start gap-2 text-left"
                  onClick={() => setOpen((o) => ({ ...o, [row.id]: !isOpen }))}
                >
                  {isOpen ? (
                    <ChevronDown className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{row[titleKey] || 'Untitled'}</p>
                    {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle(row)}</p>}
                  </div>
                </button>
                <div className="flex shrink-0 items-center gap-2">
                  {badgeKey && row[badgeKey] && (
                    <Badge variant="secondary" className="text-[10px]">
                      {row[badgeKey]}
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-prism-rose"
                    onClick={() => del.mutate(row.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>

              {isOpen && (
                <div className="mt-4 space-y-4">
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {fields.map((f) => (
                      <ThvFieldInput
                        key={f.key}
                        field={f}
                        value={row[f.key]}
                        onCommit={(v) => save(row.id, { [f.key]: v })}
                      />
                    ))}
                  </div>
                  {renderExtra?.(row, (patch) => save(row.id, patch))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
