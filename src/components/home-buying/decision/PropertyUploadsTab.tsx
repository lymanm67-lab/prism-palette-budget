import { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Upload, Image as ImageIcon, FileText, Trash2, ExternalLink, Camera } from 'lucide-react';
import {
  loadUploads, saveUploads,
  type PropertyProfile, type PropertyUploads, type PropertyPhoto, type PropertyDoc,
} from '@/lib/home-buying/decision/walkthrough-store';

const MAX_IMG = 1200;   // px
const MAX_DOC_BYTES = 3 * 1024 * 1024; // 3MB inline cap

async function resizeImage(file: File): Promise<string> {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, MAX_IMG / Math.max(bmp.width, bmp.height));
  const w = Math.round(bmp.width * scale);
  const h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bmp, 0, 0, w, h);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

export default function PropertyUploadsTab({ property }: { property: PropertyProfile }) {
  const [uploads, setUploads] = useState<PropertyUploads>(() => loadUploads(property.id));
  const photoRef = useRef<HTMLInputElement>(null);
  const docRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [room, setRoom] = useState('Exterior');

  const update = (u: PropertyUploads) => { setUploads(u); saveUploads(property.id, u); };

  const onPhotos = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const added: PropertyPhoto[] = [];
    for (const f of Array.from(files)) {
      if (!f.type.startsWith('image/')) continue;
      try {
        const dataUrl = await resizeImage(f);
        added.push({ id: `ph-${Date.now()}-${Math.random().toString(36).slice(2,7)}`, dataUrl, caption, room, addedAt: new Date().toISOString() });
      } catch { toast.error(`Could not process ${f.name}`); }
    }
    if (added.length) {
      update({ ...uploads, photos: [...uploads.photos, ...added] });
      toast.success(`Added ${added.length} photo${added.length > 1 ? 's' : ''}`);
      setCaption('');
    }
  };

  const onDocs = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const added: PropertyDoc[] = [];
    for (const f of Array.from(files)) {
      if (f.size > MAX_DOC_BYTES) {
        toast.error(`${f.name} exceeds 3MB — store link or upload a smaller PDF`);
        continue;
      }
      try {
        const dataUrl = await fileToDataUrl(f);
        added.push({
          id: `doc-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
          name: f.name, size: f.size, mime: f.type || 'application/octet-stream',
          dataUrl, kind: 'listing', addedAt: new Date().toISOString(),
        });
      } catch { toast.error(`Could not read ${f.name}`); }
    }
    if (added.length) {
      update({ ...uploads, docs: [...uploads.docs, ...added] });
      toast.success(`Added ${added.length} document${added.length > 1 ? 's' : ''}`);
    }
  };

  const removePhoto = (id: string) => update({ ...uploads, photos: uploads.photos.filter(p => p.id !== id) });
  const removeDoc = (id: string) => update({ ...uploads, docs: uploads.docs.filter(d => d.id !== id) });

  return (
    <div className="space-y-4">
      {/* Listing details */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2"><ExternalLink className="h-4 w-4 text-prism-teal"/>Listing Source</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="md:col-span-2">
            <Label className="text-xs">Listing URL (Zillow / Redfin / Realtor)</Label>
            <Input value={uploads.listingUrl || ''} onChange={e => update({ ...uploads, listingUrl: e.target.value })} placeholder="https://…" />
          </div>
          <div>
            <Label className="text-xs">MLS #</Label>
            <Input value={uploads.mlsNumber || ''} onChange={e => update({ ...uploads, mlsNumber: e.target.value })} placeholder="e.g. 5031234" />
          </div>
          <div className="md:col-span-3">
            <Label className="text-xs">Listing notes</Label>
            <Textarea rows={2} value={uploads.listingNotes || ''} onChange={e => update({ ...uploads, listingNotes: e.target.value })} placeholder="Days on market, seller motivation, offers already in, price cuts…" />
          </div>
        </CardContent>
      </Card>

      {/* Photos */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><Camera className="h-4 w-4 text-prism-teal"/>Photos ({uploads.photos.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => photoRef.current?.click()} className="gap-1"><Upload className="h-3 w-3"/>Add photos</Button>
          <input ref={photoRef} type="file" accept="image/*" multiple capture="environment" className="hidden" onChange={e => { onPhotos(e.target.files); e.currentTarget.value = ''; }} />
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div>
              <Label className="text-xs">Room / area for next upload</Label>
              <Select value={room} onValueChange={setRoom}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Exterior','Kitchen','Living','Primary bed','Bedroom','Bathroom','Basement','Attic','Roof','Electrical','Plumbing','HVAC','Garage','Yard','Neighborhood'].map(x => <SelectItem key={x} value={x}>{x}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label className="text-xs">Caption</Label>
              <Input value={caption} onChange={e => setCaption(e.target.value)} placeholder="e.g. Crack in foundation, south wall" />
            </div>
          </div>

          {uploads.photos.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No photos yet. Snap or upload photos from listings, walk-throughs, and inspections.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {uploads.photos.map(p => (
                <div key={p.id} className="group relative rounded border border-border/40 overflow-hidden bg-muted/20">
                  <img src={p.dataUrl} alt={p.caption || p.room} className="w-full h-32 object-cover" loading="lazy" />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-1.5">
                    <div className="text-[10px] font-bold text-white uppercase tracking-wider">{p.room}</div>
                    {p.caption && <div className="text-[10px] text-white/90 line-clamp-2">{p.caption}</div>}
                  </div>
                  <button onClick={() => removePhoto(p.id)} className="absolute top-1 right-1 p-1 rounded bg-black/60 text-red-300 opacity-0 group-hover:opacity-100 transition"><Trash2 className="h-3 w-3"/></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Docs */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2"><FileText className="h-4 w-4 text-prism-teal"/>Documents ({uploads.docs.length})</CardTitle>
          <Button size="sm" variant="outline" onClick={() => docRef.current?.click()} className="gap-1"><Upload className="h-3 w-3"/>Add docs</Button>
          <input ref={docRef} type="file" accept=".pdf,.doc,.docx,.txt,.csv,.xls,.xlsx,image/*" multiple className="hidden" onChange={e => { onDocs(e.target.files); e.currentTarget.value = ''; }} />
        </CardHeader>
        <CardContent>
          {uploads.docs.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">Upload the listing sheet, seller disclosure, inspection report, HOA docs, or tax records (up to 3MB each).</p>
          ) : (
            <div className="space-y-1.5">
              {uploads.docs.map(d => (
                <div key={d.id} className="flex items-center gap-2 rounded border border-border/40 px-2 py-1.5 text-xs">
                  <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{d.name}</div>
                    <div className="text-[10px] text-muted-foreground">{(d.size/1024).toFixed(0)} KB · {d.kind}</div>
                  </div>
                  <Select value={d.kind || 'other'} onValueChange={v => update({ ...uploads, docs: uploads.docs.map(x => x.id === d.id ? { ...x, kind: v as any } : x) })}>
                    <SelectTrigger className="h-7 w-32 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {['listing','disclosure','inspection','title','other'].map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <a href={d.dataUrl} download={d.name} className="p-1 rounded hover:bg-muted"><ExternalLink className="h-3 w-3"/></a>
                  <button onClick={() => removeDoc(d.id)} className="p-1 rounded hover:bg-muted text-red-400"><Trash2 className="h-3 w-3"/></button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="text-[11px] text-muted-foreground italic px-1">
        Photos and documents are stored locally in your browser. Use them side-by-side with the Walk-Through checklist and Comparison tabs.
      </div>
    </div>
  );
}
