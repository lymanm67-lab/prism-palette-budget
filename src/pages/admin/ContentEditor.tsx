import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ImageUp, Loader2, RotateCcw, Save, Search, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { isBlankValue } from '@/lib/contentKeys';
import { CONTENT_GROUPS, type ContentField } from '@/lib/siteContent';
import { uploadSiteImage } from '@/lib/siteImageUpload';
import { useResetContent, useSaveContent, useSiteContent } from '@/hooks/useSiteContent';
import { useEditMode } from '@/components/editor/EditModeContext';

const FieldRow = ({
  field,
  savedValue,
  draft,
  setDraft,
}: {
  field: ContentField;
  savedValue: string | null | undefined;
  draft: string | undefined;
  setDraft: (key: string, value: string | undefined) => void;
}) => {
  const save = useSaveContent();
  const reset = useResetContent();
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const isEdited = !isBlankValue(savedValue);
  const effective = isEdited ? String(savedValue) : field.defaultValue;
  const current = draft ?? effective;
  const isUnsaved = draft !== undefined && draft !== effective;

  const doSave = () => {
    if (!current.trim()) {
      toast.error('Value cannot be blank — use "Reset to original" instead.');
      return;
    }
    save.mutate(
      { key: field.key, value: current, kind: field.kind },
      {
        onSuccess: () => {
          setDraft(field.key, undefined);
          toast.success(`Saved ${field.label}`);
        },
        onError: (e) => toast.error(`Could not save: ${(e as Error).message}`),
      },
    );
  };

  const doReset = () => {
    reset.mutate(field.key, {
      onSuccess: () => {
        setDraft(field.key, undefined);
        toast.success(`${field.label} reset to original`);
      },
      onError: (e) => toast.error(`Could not reset: ${(e as Error).message}`),
    });
  };

  const doUpload = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    const result = await uploadSiteImage(file, field.key);
    setUploading(false);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    setDraft(field.key, result.url);
    save.mutate(
      { key: field.key, value: result.url, kind: 'image' },
      {
        onSuccess: () => {
          setDraft(field.key, undefined);
          toast.success('Image uploaded and saved');
        },
        onError: (e) => toast.error(`Could not save image: ${(e as Error).message}`),
      },
    );
  };

  return (
    <div className="rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-sm font-semibold">{field.label}</Label>
        <div className="flex items-center gap-2">
          {isUnsaved && <Badge variant="secondary">Unsaved</Badge>}
          {isEdited && <Badge>Edited</Badge>}
          <code className="text-[10px] text-muted-foreground">{field.key}</code>
        </div>
      </div>

      {field.kind === 'longtext' ? (
        <Textarea
          rows={4}
          value={current}
          onChange={(e) => setDraft(field.key, e.target.value)}
          placeholder={field.defaultValue}
        />
      ) : (
        <Input
          value={current}
          onChange={(e) => setDraft(field.key, e.target.value)}
          placeholder={field.kind === 'image' ? 'Image URL' : field.defaultValue}
        />
      )}

      {field.kind === 'image' && (
        <div className="flex items-center gap-3">
          {current ? (
            <img
              src={current}
              alt={`${field.label} preview`}
              className="h-16 w-16 rounded-lg border border-border object-cover"
            />
          ) : (
            <div className="flex h-16 w-16 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
              No image
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => doUpload(e.target.files?.[0])}
          />
          <Button variant="outline" size="sm" disabled={uploading} onClick={() => inputRef.current?.click()}>
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
            <span className="ml-2">{uploading ? 'Uploading…' : 'Upload'}</span>
          </Button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <Button size="sm" onClick={doSave} disabled={!isUnsaved || save.isPending}>
          <Save className="h-4 w-4" /> <span className="ml-2">Save</span>
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDraft(field.key, undefined)}
          disabled={!isUnsaved}
        >
          <Undo2 className="h-4 w-4" /> <span className="ml-2">Discard</span>
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={doReset}
          disabled={!isEdited || reset.isPending}
          className="text-muted-foreground"
        >
          <RotateCcw className="h-4 w-4" /> <span className="ml-2">Reset to original</span>
        </Button>
      </div>
    </div>
  );
};

const ContentEditor = () => {
  const { canEdit } = useEditMode();
  const { map, isLoading } = useSiteContent();
  const [drafts, setDrafts] = useState<Record<string, string | undefined>>({});
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState(CONTENT_GROUPS[0].id);


  const setDraft = (key: string, value: string | undefined) =>
    setDrafts((prev) => ({ ...prev, [key]: value }));

  const groups = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CONTENT_GROUPS;
    return CONTENT_GROUPS.map((g) => ({
      ...g,
      fields: g.fields.filter((f) => {
        const saved = map[f.key];
        return (
          f.label.toLowerCase().includes(q) ||
          f.key.toLowerCase().includes(q) ||
          f.defaultValue.toLowerCase().includes(q) ||
          (saved ? String(saved).toLowerCase().includes(q) : false)
        );
      }),
    })).filter((g) => g.fields.length > 0);
  }, [search, map]);

  if (!canEdit) {
    return (
      <div className="mx-auto max-w-md py-20 text-center space-y-3">
        <h1 className="font-display text-2xl font-bold">Admins only</h1>
        <p className="text-sm text-muted-foreground">
          The Content Editor is available to administrators of this app.
        </p>
        <Button asChild variant="outline">
          <Link to="/dashboard">Back to dashboard</Link>
        </Button>
      </div>
    );
  }

  const editedCount = CONTENT_GROUPS.flatMap((g) => g.fields).filter(
    (f) => !isBlankValue(map[f.key]),
  ).length;

  return (
    <div className="space-y-6 pb-16">
      <div className="space-y-2">
        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground">
          Content Editor
        </h1>
        <p className="text-sm text-muted-foreground">
          Change copy and images across your public pages. Blank values are ignored, and
          “Reset to original” always brings back the shipped wording.
          {editedCount > 0 && <> Currently customized: {editedCount} field(s).</>}
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search labels or wording…"
          className="pl-9"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading content…
        </div>
      ) : groups.length === 0 ? (
        <p className="text-sm text-muted-foreground">No fields match “{search}”.</p>
      ) : (
        <Tabs
          value={groups.some((g) => g.id === activeTab) ? activeTab : groups[0].id}
          onValueChange={setActiveTab}
        >

          <TabsList className="flex h-auto flex-wrap justify-start gap-1">
            {groups.map((g) => (
              <TabsTrigger key={g.id} value={g.id} className="text-xs">
                {g.label}
              </TabsTrigger>
            ))}
          </TabsList>
          {groups.map((g) => (
            <TabsContent key={g.id} value={g.id} className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">{g.label}</CardTitle>
                  <p className="text-xs text-muted-foreground">{g.description}</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  {g.fields.map((f) => (
                    <FieldRow
                      key={f.key}
                      field={f}
                      savedValue={map[f.key]}
                      draft={drafts[f.key]}
                      setDraft={setDraft}
                    />
                  ))}
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
};

export default ContentEditor;
