import { useEffect, useState, type RefObject } from "react";
import { PALETTE } from "@/lib/palette";

/** Same pitch as the plus grid in styles.css (the `plus-grid` mask), so these sit exactly on a grid cell. */
const CELL = 32;
const TARGET = 48;

type Spot = { col: number; row: number; color: string };

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
 * A few plus signs of the grid in one of the category colors, on free cells only: never behind the text or
 * the button. They turn a full circle when you hover or tap them. Placed at random on each visit.
 */
export function ColorPlusField({ avoid }: { avoid: RefObject<HTMLElement | null>[] }) {
  const [spots, setSpots] = useState<Spot[]>([]);

  useEffect(() => {
    const place = () => {
      const cols = Math.floor(window.innerWidth / CELL);
      const rows = Math.floor(window.innerHeight / CELL);
      const margin = 10;
      const blocked = avoid
        .map((r) => r.current?.getBoundingClientRect())
        .filter((r): r is DOMRect => !!r)
        .map((r) => ({ l: r.left - margin, t: r.top - margin, r: r.right + margin, b: r.bottom + margin }));
      const free: { col: number; row: number }[] = [];
      for (let col = 1; col < cols - 1; col++) {
        for (let row = 1; row < rows - 1; row++) {
          const l = col * CELL + CELL / 2 - TARGET / 2;
          const t = row * CELL + CELL / 2 - TARGET / 2;
          const hits = blocked.some((b) => l < b.r && l + TARGET > b.l && t < b.b && t + TARGET > b.t);
          if (!hits) free.push({ col, row });
        }
      }
      const count = Math.min(9, Math.max(4, Math.round(free.length / 16)));
      const picked: { col: number; row: number }[] = [];
      for (const c of shuffle(free)) {
        // Keep them apart, so every one has its own touch target
        if (picked.every((p) => Math.abs(p.col - c.col) >= 3 || Math.abs(p.row - c.row) >= 3)) picked.push(c);
        if (picked.length === count) break;
      }
      const colors = shuffle(PALETTE.map((p) => `var(--${p.key}-deep)`));
      setSpots(picked.map((c, i) => ({ ...c, color: colors[i % colors.length]! })));
    };
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [avoid]);

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {spots.map((s) => (
        <SpinPlus key={`${s.col}-${s.row}`} spot={s} />
      ))}
    </div>
  );
}
