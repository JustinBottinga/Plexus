import { useEffect, useLayoutEffect, useState, type RefObject } from "react";
import { PALETTE } from "@/lib/palette";

/** Same pitch as the plus grid in styles.css (the `plus-grid` mask), so these sit exactly on a grid cell. */
const CELL = 32;
const TARGET = 48;

type Spot = { col: number; row: number; color: string };
type Cell = { col: number; row: number };

// useLayoutEffect on the client, so the pluses are placed before the first frame after hydration, not after it
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

const shuffle = <T,>(items: T[]): T[] => {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
};

function SpinPlus({ spot }: { spot: Spot }) {
  const [spinning, setSpinning] = useState(false);
  return (
    <span
      role="presentation"
      className="pointer-events-auto absolute flex cursor-pointer touch-manipulation select-none items-center justify-center"
      style={{
        left: spot.col * CELL + CELL / 2 - TARGET / 2,
        top: spot.row * CELL + CELL / 2 - TARGET / 2,
        width: TARGET,
        height: TARGET,
      }}
      // Mouse: a turn on hover. Touch and mouse: a turn on tap.
      onPointerEnter={(e) => e.pointerType === "mouse" && setSpinning(true)}
      onClick={() => setSpinning(true)}
    >
      <svg
        viewBox="0 0 32 32"
        width={CELL}
        height={CELL}
        aria-hidden="true"
        className={spinning ? "spin-once" : undefined}
        onAnimationEnd={() => setSpinning(false)}
        style={{ color: spot.color }}
      >
        {/* The same plus as the grid mask in styles.css: same size, same stroke */}
        <path d="M16 11.5v9M11.5 16h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </svg>
    </span>
  );
}

/**
 * A few plus signs of the grid in one of the category colors, on free cells only: never under the text or the
 * button. They turn a full circle when you hover or tap them. Placed at random on each visit, and checked again
 * whenever the layout changes (fonts loading, a rotated or resized screen): a plus that ends up in the way is
 * replaced, the others stay where they are.
 *
 * The layer sits behind the page content (the content is a layer higher and lets clicks through to it), so even a
 * plus that is momentarily in the way can never cover anything.
 */
export function ColorPlusField({ avoid }: { avoid: RefObject<HTMLElement | null>[] }) {
  const [spots, setSpots] = useState<Spot[]>([]);

  useIsoLayoutEffect(() => {
    const reflow = () => {
      const cols = Math.floor(window.innerWidth / CELL);
      const rows = Math.floor(window.innerHeight / CELL);
      const margin = 12;
      const blocked = avoid
        .map((r) => r.current?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r)
        .map((r) => ({ l: r.left - margin, t: r.top - margin, r: r.right + margin, b: r.bottom + margin }));
      const isFree = ({ col, row }: Cell) => {
        if (col < 1 || row < 1 || col > cols - 2 || row > rows - 2) return false;
        const l = col * CELL + CELL / 2 - TARGET / 2;
        const t = row * CELL + CELL / 2 - TARGET / 2;
        return !blocked.some((b) => l < b.r && l + TARGET > b.l && t < b.b && t + TARGET > b.t);
      };
      const apart = (a: Cell, b: Cell) => Math.abs(a.col - b.col) >= 3 || Math.abs(a.row - b.row) >= 3;

      setSpots((prev) => {
        const kept = prev.filter(isFree);
        const free: Cell[] = [];
        for (let col = 1; col < cols - 1; col++) for (let row = 1; row < rows - 1; row++) if (isFree({ col, row })) free.push({ col, row });
        const count = Math.min(9, Math.max(4, Math.round(free.length / 16)));
        const next = [...kept];
        const unused = shuffle(PALETTE.map((p) => `var(--${p.key}-deep)`)).filter((c) => !kept.some((k) => k.color === c));
        for (const cell of shuffle(free)) {
          if (next.length >= count) break;
          // Keep them apart, so every one has its own touch target
          if (next.every((p) => apart(p, cell))) {
            next.push({ ...cell, color: unused.shift() ?? `var(--${PALETTE[next.length % PALETTE.length]!.key}-deep)` });
          }
        }
        const same = next.length === prev.length && next.every((s, i) => s === prev[i]);
        return same ? prev : next;
      });
    };

    reflow();
    window.addEventListener("resize", reflow);
    // The headline wraps differently once the real font has loaded, so look again then
    void document.fonts?.ready.then(reflow);
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(reflow) : null;
    avoid.forEach((r) => r.current && observer?.observe(r.current));
    return () => {
      window.removeEventListener("resize", reflow);
      observer?.disconnect();
    };
  }, [avoid]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {spots.map((s) => (
        <SpinPlus key={`${s.col}-${s.row}`} spot={s} />
      ))}
    </div>
  );
}
