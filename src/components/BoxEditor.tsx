import { useRef, useState } from "react";
import { X } from "lucide-react";
import type { Box } from "@/lib/data";
import { cn } from "@/lib/utils";

type Sel = { kind: "marker" } | { kind: "cover"; i: number } | null;
type Drag =
  | { type: "draw"; sx: number; sy: number }
  | { type: "move"; sel: Sel; ox: number; oy: number; start: Box }
  | { type: "resize"; sel: Sel; start: Box; sx: number; sy: number };

const clamp = (v: number, a = 0, b = 100) => Math.min(b, Math.max(a, v));

export function BoxEditor({
  src,
  mode,
  marker,
  covers,
  coverClass = "bg-stage",
  onChange,
}: {
  src: string;
  mode: "marker" | "cover";
  marker: Box | null;
  covers: Box[];
  coverClass?: string;
  onChange: (marker: Box | null, covers: Box[]) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  const [sel, setSel] = useState<Sel>(null);

  const pt = (e: React.PointerEvent) => {
    const r = ref.current!.getBoundingClientRect();
    return { x: clamp(((e.clientX - r.left) / r.width) * 100), y: clamp(((e.clientY - r.top) / r.height) * 100) };
  };
  const get = (s: Sel) => (s?.kind === "marker" ? marker : s ? covers[s.i] : null);
  const set = (s: Sel, b: Box | null) => {
    if (s?.kind === "marker") onChange(b, covers);
    else if (s) onChange(marker, b ? covers.map((c, i) => (i === s.i ? b : c)) : covers.filter((_, i) => i !== s.i));
  };

  function down(e: React.PointerEvent) {
    ref.current!.setPointerCapture(e.pointerId);
    const p = pt(e);
    drag.current = { type: "draw", sx: p.x, sy: p.y };
    setSel(null);
  }
  function boxDown(e: React.PointerEvent, s: Sel) {
    e.stopPropagation();
    ref.current!.setPointerCapture(e.pointerId);
    const p = pt(e);
    setSel(s);
    drag.current = { type: "move", sel: s, ox: p.x, oy: p.y, start: get(s)! };
  }
  function handleDown(e: React.PointerEvent, s: Sel) {
    e.stopPropagation();
    ref.current!.setPointerCapture(e.pointerId);
    const p = pt(e);
    setSel(s);
    drag.current = { type: "resize", sel: s, start: get(s)!, sx: p.x, sy: p.y };
  }
  function move(e: React.PointerEvent) {
    const d = drag.current;
    if (!d) return;
    const p = pt(e);
    if (d.type === "draw") {
      const b = { x: Math.min(d.sx, p.x), y: Math.min(d.sy, p.y), w: Math.abs(p.x - d.sx), h: Math.abs(p.y - d.sy) };
      if (b.w < 1 && b.h < 1) return;
      if (mode === "marker") {
        onChange(b, covers);
        setSel({ kind: "marker" });
      } else {
        const i = sel?.kind === "cover" && (drag.current as Drag & { created?: boolean }).created ? sel.i : covers.length;
        const next = [...covers];
        next[i] = b;
        (drag.current as Drag & { created?: boolean }).created = true;
        onChange(marker, next);
        setSel({ kind: "cover", i });
      }
    } else if (d.type === "move") {
      const s = d.start;
      set(d.sel, { ...s, x: clamp(s.x + p.x - d.ox, 0, 100 - s.w), y: clamp(s.y + p.y - d.oy, 0, 100 - s.h) });
    } else {
      const s = d.start;
      set(d.sel, { ...s, w: clamp(s.w + p.x - d.sx, 2, 100 - s.x), h: clamp(s.h + p.y - d.sy, 2, 100 - s.y) });
    }
  }
  function up() {
    drag.current = null;
  }

  const renderBox = (b: Box, s: Sel, cls: string, key: string) => {
    const active = sel && s && sel.kind === s.kind && (sel.kind === "marker" || (s.kind === "cover" && sel.i === s.i));
    return (
      <div
        key={key}
        onPointerDown={(e) => boxDown(e, s)}
        className={cn("absolute cursor-move", cls, active && "outline-2 outline-offset-2 outline-dashed outline-foreground")}
        style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }}
      >
        {active && (
          <>
            <button
              type="button"
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => { set(s, null); setSel(null); }}
              className="absolute -right-3 -top-3 flex size-7 items-center justify-center rounded-full bg-primary text-primary-foreground"
              aria-label="Verwijderen"
            >
              <X className="size-4" />
            </button>
            <div onPointerDown={(e) => handleDown(e, s)} className="absolute -bottom-2 -right-2 size-5 cursor-se-resize rounded-full border-2 border-card bg-primary" />
          </>
        )}
      </div>
    );
  };

  return (
    <div
      ref={ref}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={up}
      className="relative touch-none select-none overflow-hidden rounded-[24px] bg-stage"
    >
      <img src={src} alt="" draggable={false} className="pointer-events-none block w-full" />
      {covers.map((c, i) => renderBox(c, { kind: "cover", i }, cn("rounded-md", coverClass), `c${i}`))}
      {marker && renderBox(marker, { kind: "marker" }, "rounded-lg border-[3px] border-marker bg-marker/15", "m")}
    </div>
  );
}

export function BoxPreview({ src, marker, covers, coverClass = "bg-stage" }: { src: string; marker: Box | null; covers: Box[]; coverClass?: string }) {
  return (
    <div className="relative overflow-hidden rounded-[24px] bg-stage">
      <img src={src} alt="" className="block w-full" />
      {covers.map((b, i) => (
        <div key={i} className={cn("absolute rounded-md", coverClass)} style={{ left: `${b.x}%`, top: `${b.y}%`, width: `${b.w}%`, height: `${b.h}%` }} />
      ))}
      {marker && (
        <div className="absolute rounded-lg border-[3px] border-marker bg-marker/15" style={{ left: `${marker.x}%`, top: `${marker.y}%`, width: `${marker.w}%`, height: `${marker.h}%` }} />
      )}
    </div>
  );
}
