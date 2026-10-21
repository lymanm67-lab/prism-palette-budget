import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Eraser, Check } from 'lucide-react';

export default function AkronSignature({ label, open, onClose, onSave }: { label: string; open: boolean; onClose: () => void; onSave: (png: string) => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);
  const [ink, setInk] = useState(false);
  useEffect(() => { if (open) setInk(false); }, [open]);
  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const c = e.currentTarget;
    const rect = c.getBoundingClientRect();
    return [(e.clientX - rect.left) * c.width / rect.width, (e.clientY - rect.top) * c.height / rect.height];
  };
  return <Dialog open={open} onOpenChange={(value) => { if (!value) onClose(); }}>
    <DialogContent className="max-w-lg">
      <DialogHeader><DialogTitle>{label}</DialogTitle><DialogDescription>Electronic signature acceptance is determined by EANDC. You can instead leave this blank and sign the printed application.</DialogDescription></DialogHeader>
      <canvas ref={ref} width={720} height={180} aria-label="Draw signature" className="akron-signature w-full rounded-md border touch-none"
        onPointerDown={(e) => { const ctx = e.currentTarget.getContext('2d'); if (!ctx) return; e.currentTarget.setPointerCapture(e.pointerId); const [x, y] = point(e); ctx.beginPath(); ctx.moveTo(x, y); ctx.strokeStyle = getComputedStyle(e.currentTarget).color; ctx.lineWidth = 2; ctx.lineCap = 'round'; drawing.current = true; }}
        onPointerMove={(e) => { if (!drawing.current) return; const ctx = e.currentTarget.getContext('2d'); if (!ctx) return; const [x, y] = point(e); ctx.lineTo(x, y); ctx.stroke(); setInk(true); }}
        onPointerUp={() => { drawing.current = false; }} onPointerCancel={() => { drawing.current = false; }} />
      <div className="flex justify-between gap-2">
        <Button variant="outline" onClick={() => { ref.current?.getContext('2d')?.clearRect(0, 0, 720, 180); setInk(false); }}><Eraser className="mr-2 h-4 w-4" />Clear</Button>
        <Button disabled={!ink} onClick={() => {
          const c = ref.current; const ctx = c?.getContext('2d');
          if (!c || !ctx) return;
          const pixels = ctx.getImageData(0, 0, c.width, c.height).data;
          let left = c.width, top = c.height, right = 0, bottom = 0;
          for (let y = 0; y < c.height; y++) for (let x = 0; x < c.width; x++) {
            if (pixels[(y * c.width + x) * 4 + 3] > 0) { left = Math.min(left, x); top = Math.min(top, y); right = Math.max(right, x); bottom = Math.max(bottom, y); }
          }
          if (right < left) return;
          const cropped = document.createElement('canvas');
          cropped.width = right - left + 3; cropped.height = bottom - top + 3;
          cropped.getContext('2d')?.drawImage(c, left, top, right - left + 1, bottom - top + 1, 1, 1, right - left + 1, bottom - top + 1);
          onSave(cropped.toDataURL('image/png'));
        }}><Check className="mr-2 h-4 w-4" />Use signature</Button>
      </div>
    </DialogContent>
  </Dialog>;
}