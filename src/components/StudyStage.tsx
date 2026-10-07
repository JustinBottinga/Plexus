import { useCallback, useState } from "react";
import { Check, X } from "lucide-react";
import type { Box } from "@/lib/data";
import { cn } from "@/lib/utils";

const pct = (b: Box) => ({ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` });

/**
 * The illustration on a rounded stage tinted with the category color. The image is multiplied onto the
 * tint so the white of anatomy plates disappears; cover boxes use the same color to hide printed labels.
 */
export function StudyStage({
  src,
  marker,
  covers,
  tintClass,
  showMarker,
  maxHeight,
  tap,
  verdict,
  onTap,
}: {
  src: string;
  marker: Box | null;
  covers: Box[];
  /** Tailwind background class of the category's deep tint, e.g. `bg-mint-deep` */
  tintClass: string;
  showMarker: boolean;
  /** Any CSS length; the image shrinks to this height */
  maxHeight: string;
  /** Where the user tapped, in image percentages */
  tap?: { x: number; y: number } | null;
  verdict?: "right" | "wrong" | null;
  onTap?: ((p: { x: number; y: number }) => void) | undefined;
}) {
  const [ratio, setRatio] = useState(4 / 3);
  // The ref callback also catches images that finished loading before React attached onLoad.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth) setRatio(img.naturalWidth / img.naturalHeight);
  }, []);

  function handlePointer(e: React.PointerEvent<HTMLDivElement>) {
    if (!onTap) return;
    const r = e.currentTarget.getBoundingClientRect();
    onTap({
      x: Math.min(100, Math.max(0, ((e.clientX - r.left) / r.width) * 100)),
      y: Math.min(100, Math.max(0, ((e.clientY - r.top) / r.height) * 100)),
    });
  }

  return (
    <div className={cn("isolate flex w-full items-center justify-center rounded-[32px] p-3 shadow-sm", tintClass)}>
      <div
        onPointerDown={handlePointer}
        className={cn("relative touch-manipulation select-none transition-[width] duration-500", onTap && "cursor-crosshair")}
        style={{ aspectRatio: ratio, width: `min(100%, calc(${maxHeight} * ${ratio}))` }}
      >
        <img
          ref={imgRef}
          src={src}
          alt=""
          draggable={false}
          onLoad={(e) => setRatio(e.currentTarget.naturalWidth / e.currentTarget.naturalHeight)}
          className="absolute inset-0 size-full rounded-2xl object-fill mix-blend-multiply"
        />
        {covers.map((b, i) => (
          <div key={i} className={cn("absolute rounded-md", tintClass)} style={pct(b)} />
        ))}
        {showMarker && marker && (
          <div
            className="pulse-soft absolute animate-in fade-in rounded-lg border-[3px] border-marker bg-marker/15 duration-500"
            style={pct(marker)}
          />
        )}
        {tap && (
          <span
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-1/2 animate-in zoom-in-50 duration-300"
            style={{ left: `${tap.x}%`, top: `${tap.y}%` }}
          >
            {verdict ? (
              <span
                className={cn(
                  "flex size-11 items-center justify-center rounded-full shadow-md",
                  verdict === "right" ? "bg-success-surface text-on-pastel" : "bg-error-surface text-on-pastel",
                )}
                role="img"
                aria-label={verdict === "right" ? "Goed" : "Niet helemaal"}
              >
                {verdict === "right" ? <Check className="size-6" strokeWidth={3} /> : <X className="size-6" strokeWidth={3} />}
              </span>
            ) : (
              <span className="block size-4 rounded-full border-2 border-pastel-surface bg-on-pastel shadow" />
            )}
          </span>
        )}
      </div>
    </div>
  );
}
