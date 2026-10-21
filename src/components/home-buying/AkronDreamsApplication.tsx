import { useEffect, useRef, useState } from 'react';
import * as pdfjs from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.js?url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, ArrowRight, Download, FileText, List, PenLine, ZoomIn, ZoomOut, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import sourceAsset from '@/assets/akron-dreams-application.pdf.asset.json';
import { AKRON_FIELDS, AKRON_PAGE_LABELS, type AkronField } from '@/lib/home-buying/akron/fields';
import { buildAkronPdf, akronDownload, type AkronAnswers } from '@/lib/home-buying/akron/pdf';
import AkronSignature from './AkronSignature';
import './akron-application.css';

pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;

export default function AkronDreamsApplication() {
  const [bytes, setBytes] = useState<Uint8Array>();
  const [pdf, setPdf] = useState<pdfjs.PDFDocumentProxy>();
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [mode, setMode] = useState<'document' | 'fields'>('document');
  const [zoom, setZoom] = useState(1);
  const [available, setAvailable] = useState(612);
  const [answers, setAnswers] = useState<AkronAnswers>({});
  const [signature, setSignature] = useState<AkronField>();
  const [busy, setBusy] = useState(false);
  const [rendering, setRendering] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const dirty = Object.values(answers).some(Boolean);
  const current = AKRON_FIELDS.filter((f) => f.page === page);
  const scale = Math.min(available, 816) / 612 * zoom;
  const set = (id: string, value: string | boolean) => setAnswers((old) => ({ ...old, [id]: value }));

  useEffect(() => {
    let active = true;
    let loaded: pdfjs.PDFDocumentProxy | undefined;
    const controller = new AbortController();
    (async () => {
      try {
        // Local Vite does not serve the hosted asset gateway; production stays same-origin.
        const sourceUrl = window.location.hostname === 'localhost' ? `https://prismbudget.com${sourceAsset.url}` : sourceAsset.url;
        const response = await fetch(sourceUrl, { signal: controller.signal });
        if (!response.ok) throw new Error('Unable to load the original application.');
        const data = new Uint8Array(await response.arrayBuffer());
        loaded = await pdfjs.getDocument({ data: data.slice() }).promise;
        if (active) { setBytes(data); setPdf(loaded); }
        else await loaded.destroy();
      } catch (e) { if (active) setError(e instanceof Error ? e.message : 'Unable to load application.'); }
    })();
    return () => { active = false; controller.abort(); void loaded?.destroy(); };
  }, []);

  useEffect(() => {
    const el = container.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => { setAvailable(Math.max(280, entry.contentRect.width - 16)); });
    observer.observe(el);
    return () => observer.disconnect();
  }, [pdf, mode]);

  useEffect(() => {
    if (!pdf || mode !== 'document') return;
    let active = true;
    let task: pdfjs.RenderTask | undefined;
    setRendering(true);
    (async () => {
      try {
        const p = await pdf.getPage(page);
        const c = canvas.current;
        if (!active || !c) return;
        const ctx = c.getContext('2d');
        if (!ctx) return;
        const viewport = p.getViewport({ scale: scale * 2 });
        c.width = viewport.width; c.height = viewport.height;
        task = p.render({ canvasContext: ctx, viewport });
        await task.promise;
        if (active) setRendering(false);
      } catch (e) { if (active) { setRendering(false); setError(e instanceof Error ? e.message : 'Page rendering failed.'); } }
    })();
    return () => { active = false; task?.cancel(); };
  }, [pdf, page, scale, mode]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const exportPdf = async (flatten: boolean) => {
    if (!bytes) return;
    setBusy(true);
    try {
      const data = await buildAkronPdf(bytes, answers, flatten);
      akronDownload(data, `akron-dreams-${flatten ? 'completed' : 'fillable'}.pdf`);
    } catch (e) { toast.error(e instanceof Error ? e.message : 'PDF export failed.'); }
    finally { setBusy(false); }
  };

  const fieldControl = (f: AkronField, positioned: boolean) => {
    const geometry = positioned ? { left: f.x * scale, top: f.y * scale, width: f.width * scale, height: f.height * scale, fontSize: Math.min(10, f.height - 2) * scale } : undefined;
    if (f.kind === 'checkbox') return <Checkbox id={`akron-${f.id}`} aria-label={f.label} checked={answers[f.id] === true} onCheckedChange={(v) => set(f.id, v === true)} className={positioned ? 'akron-field' : ''} style={geometry} />;
    if (f.kind === 'signature') return <div style={geometry} className={positioned ? 'absolute' : 'flex items-center gap-2'}>
      <Button variant="outline" size="sm" className={positioned ? 'akron-field static w-full h-full px-0' : 'gap-2'} aria-label={f.label} title={f.label} onClick={() => setSignature(f)}>
        {typeof answers[f.id] === 'string' && answers[f.id] ? <img src={String(answers[f.id])} alt={f.label} className="h-full max-h-8 max-w-full object-contain" /> : positioned ? <PenLine className="h-full w-auto" /> : <><PenLine className="h-4 w-4" />Draw signature</>}
      </Button>
      {!positioned && answers[f.id] && <Button variant="ghost" size="sm" onClick={() => set(f.id, '')}>Remove</Button>}
    </div>;
    return <Input id={`akron-${f.id}`} aria-label={f.label} title={f.label} autoComplete="off" value={typeof answers[f.id] === 'string' ? String(answers[f.id]) : ''} onChange={(e) => set(f.id, e.target.value)} className={positioned ? 'akron-field' : ''} style={geometry} />;
  };

  return <section className="akron-application space-y-4" aria-label="Akron Dreams online application">
    <div className="space-y-2">
      <h2 className="text-xl font-semibold">Akron Dreams 2026 — Application & Guide</h2>
      <p className="text-sm text-muted-foreground">Your answers stay only in this open page. Download a copy before leaving, switching tabs or reloading; unsaved answers will be cleared. No application is submitted automatically.</p>
      <p className="text-xs text-muted-foreground">Original program wording and dates are preserved. Confirm current eligibility and electronic signature acceptance with EANDC. Office-only sections remain blank.</p>
    </div>
    <div className="flex flex-wrap gap-2">
      <Button disabled={!bytes || busy} onClick={() => exportPdf(true)} className="gap-2">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Download Completed PDF</Button>
      <Button variant="outline" disabled={!bytes || busy} onClick={() => exportPdf(false)} className="gap-2"><FileText className="h-4 w-4" />Download Fillable PDF</Button>
      <Button variant="ghost" disabled={!bytes} onClick={() => { if (bytes) akronDownload(bytes, 'akron-dreams-original-application-guide.pdf'); }}>Original Application & Guide</Button>
      <Button variant="ghost" disabled={!dirty} title="Clear all answers" aria-label="Clear all answers" onClick={() => { if (window.confirm('Clear all answers and signatures? Download a copy first if needed.')) setAnswers({}); }}><RotateCcw className="h-4 w-4" /></Button>
    </div>
    {error ? <div role="alert" className="text-destructive">{error}</div> : !pdf ? <p role="status" className="text-muted-foreground">Loading original application…</p> : <>
      <div className="flex flex-wrap items-center gap-2 border-y border-border py-3">
        <Button size="icon" variant="outline" aria-label="Previous application page" disabled={page === 1} onClick={() => setPage(page - 1)}><ArrowLeft className="h-4 w-4" /></Button>
        <Select value={String(page)} onValueChange={(v) => setPage(Number(v))}><SelectTrigger aria-label="Application page" className="w-full sm:w-80"><SelectValue /></SelectTrigger><SelectContent>{AKRON_PAGE_LABELS.map((label, i) => <SelectItem key={label} value={String(i + 1)}>{i + 1}. {label}</SelectItem>)}</SelectContent></Select>
        <Button size="icon" variant="outline" aria-label="Next application page" disabled={page === 9} onClick={() => setPage(page + 1)}><ArrowRight className="h-4 w-4" /></Button>
        <div className="flex gap-1 sm:ml-auto">
          <Button variant={mode === 'document' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('document')}><FileText className="mr-1 h-4 w-4" />Original pages</Button>
          <Button variant={mode === 'fields' ? 'secondary' : 'ghost'} size="sm" onClick={() => setMode('fields')}><List className="mr-1 h-4 w-4" />Field entry</Button>
        </div>
        {mode === 'document' && <><Button variant="ghost" size="icon" aria-label="Zoom out" disabled={zoom <= 1} onClick={() => setZoom(Math.max(1, zoom - .25))}><ZoomOut className="h-4 w-4" /></Button><span className="text-xs tabular-nums">{Math.round(zoom * 100)}%</span><Button variant="ghost" size="icon" aria-label="Zoom in" disabled={zoom >= 2} onClick={() => setZoom(Math.min(2, zoom + .25))}><ZoomIn className="h-4 w-4" /></Button></>}
      </div>
      <div aria-live="polite" className="text-sm text-muted-foreground">Page {page} of 9 · {AKRON_PAGE_LABELS[page - 1]} · {current.filter((f) => answers[f.id]).length} / {current.length} fields entered</div>
      {mode === 'document' ? <div ref={container} className="w-full overflow-auto border border-border rounded-md p-2">
        <div className="akron-paper relative mx-auto" style={{ width: 612 * scale, height: 792 * scale }}>
          <canvas ref={canvas} aria-label={`Original application page ${page}: ${AKRON_PAGE_LABELS[page - 1]}`} className="block w-full h-full" />
          {!rendering && current.map((f) => <div key={f.id}>{fieldControl(f, true)}</div>)}
        </div>
      </div> : current.length ? <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{current.map((f) => <div key={f.id} className="space-y-2"><Label htmlFor={`akron-${f.id}`}>{f.label}</Label>{fieldControl(f, false)}</div>)}</div> : <p className="text-muted-foreground">This page contains program guidance only. View the original page to read it.</p>}
      <div className="flex justify-between gap-2"><Button variant="outline" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><Button disabled={page === 9} onClick={() => setPage(page + 1)}>Next page<ArrowRight className="ml-2 h-4 w-4" /></Button></div>
    </>}
    <AkronSignature open={Boolean(signature)} label={signature?.label ?? 'Signature'} onClose={() => setSignature(undefined)} onSave={(png) => { if (signature) set(signature.id, png); setSignature(undefined); }} />
  </section>;
}