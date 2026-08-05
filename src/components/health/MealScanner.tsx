import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Camera, Upload, Loader2, Plus, RefreshCw, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { todayISO } from '@/lib/health/healthEngine';
import { useHealthUpsert, useSaveDailyLog, useTodayLog } from '@/hooks/use-health';

type ScanItem = {
  label: string;
  portion: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fiber_g: number;
  fat_g: number;
};

type ScanResult = {
  name: string;
  meal_type: string;
  confidence: string;
  items: ScanItem[];
  totals: { calories: number; protein_g: number; carbs_g: number; fiber_g: number; fat_g: number };
  notes: string;
};

const MAX_EDGE = 1280;

async function fileToCompressedDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.8);
}

export default function MealScanner() {
  const [image, setImage] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [mealType, setMealType] = useState('lunch');
  const [cameraOn, setCameraOn] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const saveMeal = useHealthUpsert('health_meals');
  const saveLog = useSaveDailyLog();
  const { data: today } = useTodayLog();

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => stopCamera, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error('Camera unavailable — use "Upload photo" instead.');
    }
  };

  const capture = () => {
    const video = videoRef.current;
    if (!video) return;
    const scale = Math.min(1, MAX_EDGE / Math.max(video.videoWidth, video.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext('2d')!.drawImage(video, 0, 0, canvas.width, canvas.height);
    setImage(canvas.toDataURL('image/jpeg', 0.8));
    setResult(null);
    stopCamera();
  };

  const onFile = async (file?: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) return toast.error('Pick an image file');
    try {
      setImage(await fileToCompressedDataUrl(file));
      setResult(null);
    } catch {
      toast.error('Could not read that image');
    }
  };

  const analyze = async () => {
    if (!image) return;
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke('analyze-meal-photo', {
        body: { image, note },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const res = data as ScanResult;
      if (!res.items?.length) {
        toast.error(res.notes || 'No food detected in that photo');
      }
      setResult(res);
      setMealType(res.meal_type || 'lunch');
    } catch (e: any) {
      toast.error(e?.message ?? 'Could not analyze that photo');
    } finally {
      setBusy(false);
    }
  };

  const editTotal = (key: keyof ScanResult['totals'], value: string) => {
    if (!result) return;
    const n = Math.max(0, parseFloat(value) || 0);
    setResult({ ...result, totals: { ...result.totals, [key]: n } });
  };

  const logIt = () => {
    if (!result) return;
    const t = result.totals;
    saveMeal.mutate({
      meal_date: todayISO(),
      meal_type: mealType,
      name: result.name || 'Scanned meal',
      calories: Math.round(t.calories),
      protein_g: Math.round(t.protein_g),
      carbs_g: Math.round(t.carbs_g),
      fiber_g: Math.round(t.fiber_g),
      fat_g: Math.round(t.fat_g),
      components: { source: 'photo_scan', confidence: result.confidence, items: result.items },
    });
    saveLog.mutate({
      log_date: todayISO(),
      protein_g: (today?.protein_g ?? 0) + Math.round(t.protein_g),
    });
    toast.success('Meal logged from photo');
    setResult(null);
    setImage(null);
    setNote('');
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4 text-prism-teal" /> Scan a meal with your camera
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-xs text-muted-foreground">
          Snap or upload a photo and AI estimates calories, protein, carbs, fiber and fat from
          standard nutritional values. Estimates are approximate — edit any number before logging.
        </p>

        {cameraOn && (
          <div className="space-y-2">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full max-h-72 rounded-lg border object-cover"
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={capture}>
                <Camera className="mr-1 h-4 w-4" /> Capture
              </Button>
              <Button size="sm" variant="outline" onClick={stopCamera}>
                <X className="mr-1 h-4 w-4" /> Cancel
              </Button>
            </div>
          </div>
        )}

        {!cameraOn && !image && (
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={startCamera}>
              <Camera className="mr-1 h-4 w-4" /> Open camera
            </Button>
            <Button size="sm" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="mr-1 h-4 w-4" /> Upload photo
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={(e) => onFile(e.target.files?.[0])}
            />
          </div>
        )}

        {image && (
          <div className="space-y-3">
            <img
              src={image}
              alt="Meal to analyze"
              className="max-h-72 w-full rounded-lg border object-cover"
            />
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">
                Optional detail (helps accuracy)
              </Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="e.g. 8 oz grilled chicken, brown rice, olive oil"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" onClick={analyze} disabled={busy}>
                {busy ? (
                  <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-1 h-4 w-4" />
                )}
                {busy ? 'Analyzing…' : result ? 'Re-analyze' : 'Analyze meal'}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setImage(null);
                  setResult(null);
                }}
              >
                <X className="mr-1 h-4 w-4" /> Clear photo
              </Button>
            </div>
          </div>
        )}

        {result && (
          <div className="space-y-4 rounded-lg border bg-muted/30 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Input
                value={result.name}
                onChange={(e) => setResult({ ...result, name: e.target.value })}
                className="max-w-xs"
              />
              <Badge variant="outline" className="capitalize">
                {result.confidence} confidence
              </Badge>
            </div>

            {result.items.length > 0 && (
              <div className="divide-y rounded-lg border bg-card">
                {result.items.map((i, idx) => (
                  <div key={`${i.label}-${idx}`} className="flex justify-between gap-3 p-2 text-xs">
                    <span className="min-w-0 truncate">
                      {i.label}
                      {i.portion ? ` · ${i.portion}` : ''}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {Math.round(i.calories)} kcal · {Math.round(i.protein_g)}g P
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {(
                [
                  ['calories', 'Calories'],
                  ['protein_g', 'Protein g'],
                  ['carbs_g', 'Carbs g'],
                  ['fiber_g', 'Fiber g'],
                  ['fat_g', 'Fat g'],
                ] as const
              ).map(([key, label]) => (
                <div key={key} className="space-y-1">
                  <Label className="text-xs text-muted-foreground">{label}</Label>
                  <Input
                    type="number"
                    min="0"
                    value={result.totals[key]}
                    onChange={(e) => editTotal(key, e.target.value)}
                  />
                </div>
              ))}
            </div>

            {result.notes && <p className="text-xs text-muted-foreground">{result.notes}</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Select value={mealType} onValueChange={setMealType}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="breakfast">Breakfast</SelectItem>
                  <SelectItem value="lunch">Lunch</SelectItem>
                  <SelectItem value="dinner">Dinner</SelectItem>
                  <SelectItem value="snack">Snack</SelectItem>
                </SelectContent>
              </Select>
              <Button size="sm" onClick={logIt}>
                <Plus className="mr-1 h-4 w-4" /> Log this meal
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
