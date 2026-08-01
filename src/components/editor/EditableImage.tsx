import { useRef, useState } from 'react';
import { ImageUp, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { isBlankValue } from '@/lib/contentKeys';
import { useSaveContent, useSiteContent } from '@/hooks/useSiteContent';
import { useEditMode } from '@/components/editor/EditModeContext';
import { uploadSiteImage } from '@/lib/siteImageUpload';

type EditableImageProps = {
  /** Fully-qualified content key, e.g. `hero.product_image`. */
  contentKey: string;
  /** The imported original image used when nothing is saved. */
  fallbackSrc: string;
  alt: string;
  className?: string;
  wrapperClassName?: string;
  loading?: 'eager' | 'lazy';
};

const EditableImage = ({
  contentKey,
  fallbackSrc,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
}: EditableImageProps) => {
  const { map } = useSiteContent();
  const { editing } = useEditMode();
  const save = useSaveContent();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const saved = map[contentKey];
  const src = isBlankValue(saved) ? fallbackSrc : String(saved);

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setBusy(true);
    const result = await uploadSiteImage(file, contentKey);
    setBusy(false);
    if ('error' in result) {
      toast.error(result.error);
      return;
    }
    save.mutate(
      { key: contentKey, value: result.url, kind: 'image' },
      {
        onSuccess: () => toast.success('Image replaced'),
        onError: (e) => toast.error(`Could not save image: ${(e as Error).message}`),
      },
    );
  };

  if (!editing) {
    return <img src={src} alt={alt} className={className} loading={loading} />;
  }

  return (
    <div className={cn('relative group', wrapperClassName)}>
      <img src={src} alt={alt} className={className} loading={loading} />
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => handleFile(e.target.files?.[0])}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-[inherit] bg-background/70 text-foreground opacity-0 ring-2 ring-dashed ring-accent transition-opacity group-hover:opacity-100 focus:opacity-100"
      >
        {busy ? <Loader2 className="h-6 w-6 animate-spin" /> : <ImageUp className="h-6 w-6" />}
        <span className="text-xs font-semibold">
          {busy ? 'Uploading…' : 'Replace image'}
        </span>
        <span className="text-[10px] text-muted-foreground">PNG, JPG, WebP · max 8 MB</span>
      </button>
    </div>
  );
};

export default EditableImage;
