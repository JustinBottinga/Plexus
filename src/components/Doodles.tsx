import { cn } from "@/lib/utils";

/** Simple one-line style drawings (64 × 64 grid) that decorate the pastel tiles. */
const doodles = {
  bone: <path d="M14 46c-5 0-8-5-5-9 2-3 6-3 8-1l17-17c-2-2-2-6 1-8 4-3 9 0 9 5 5 0 8 5 5 9-2 3-6 3-8 1L24 43c2 2 2 6-1 8-2 1-6 0-9-5Z" />,
  heart: <path d="M32 54C13 41 9 28 15 20c5-6 14-4 17 4 3-8 12-10 17-4 6 8 2 21-17 34Z" />,
  eye: (
    <>
      <path d="M6 32c8-13 17-19 26-19s18 6 26 19c-8 13-17 19-26 19S14 45 6 32Z" />
      <circle cx="32" cy="32" r="8" />
      <circle cx="35" cy="29" r="1.6" />
    </>
  ),
  hand: (
    <>
      <path d="M23 36V15a3 3 0 0 1 6 0v15M29 30V10a3 3 0 0 1 6 0v20M35 30V13a3 3 0 0 1 6 0v22M41 35V21a3 3 0 0 1 6 0v17" />
      <path d="M23 36l-5-6c-2-2-6 0-4 3l9 14c3 5 7 8 13 8 8 0 13-6 13-14" />
    </>
  ),
  spark: <path d="M32 6l6 20 20 6-20 6-6 20-6-20-20-6 20-6Z" />,
  cube: (
    <>
      <path d="M32 8l20 10v24L32 56 12 42V18Z" />
      <path d="M12 18l20 10 20-10M32 28v28" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 52l3-12L43 12l9 9-28 28Z" />
      <path d="M37 18l9 9M15 40l9 9" />
    </>
  ),
  ruler: (
    <>
      <rect x="6" y="22" width="52" height="20" rx="4" />
      <path d="M16 22v8M26 22v6M36 22v8M46 22v6" />
    </>
  ),
  plus: <path d="M32 14v36M14 32h36" />,
  ring: <circle cx="32" cy="32" r="14" />,
  dots: (
    <>
      <circle cx="16" cy="32" r="2.5" />
      <circle cx="32" cy="32" r="2.5" />
      <circle cx="48" cy="32" r="2.5" />
    </>
  ),
} as const;

export type DoodleName = keyof typeof doodles;

export function Doodle({ name, className }: { name: DoodleName; className?: string }) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("shrink-0", className)}
    >
      {doodles[name]}
    </svg>
  );
}

/** Each set is a small hand-placed scatter; tiles pick one by index so neighbours never look the same. */
const SETS: { name: DoodleName; cls: string }[][] = [
  [
    { name: "bone", cls: "right-4 top-3 size-12 rotate-12" },
    { name: "spark", cls: "right-20 top-8 size-5" },
    { name: "plus", cls: "right-6 top-[4.5rem] size-4" },
  ],
  [
    { name: "heart", cls: "right-4 top-4 size-11 -rotate-6" },
    { name: "dots", cls: "right-3 top-[4.2rem] size-9" },
    { name: "ring", cls: "right-[4.5rem] top-3 size-5" },
  ],
  [
    { name: "eye", cls: "right-3 top-4 size-14" },
    { name: "plus", cls: "right-[4.6rem] top-5 size-4" },
    { name: "spark", cls: "right-6 top-[4.6rem] size-5" },
  ],
  [
    { name: "hand", cls: "right-4 top-3 size-12 rotate-6" },
    { name: "ring", cls: "right-[4.4rem] top-10 size-4" },
    { name: "spark", cls: "right-7 top-[4.6rem] size-5" },
  ],
  [
    { name: "cube", cls: "right-4 top-3 size-12 rotate-6" },
    { name: "plus", cls: "right-[4.6rem] top-4 size-4" },
    { name: "dots", cls: "right-3 top-[4.2rem] size-9" },
  ],
  [
    { name: "pencil", cls: "right-4 top-3 size-12" },
    { name: "ruler", cls: "right-[4.2rem] top-9 size-9 -rotate-12" },
    { name: "spark", cls: "right-8 top-[4.6rem] size-4" },
  ],
];

/** Decorative scatter in the top-right corner of a pastel tile. Always behind the content, never interactive. */
export function DoodleCluster({ index = 0, className }: { index?: number; className?: string }) {
  const set = SETS[((index % SETS.length) + SETS.length) % SETS.length]!;
  return (
    <div aria-hidden="true" className={cn("pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit] text-on-pastel opacity-70", className)}>
      {set.map((d, i) => (
        <Doodle key={i} name={d.name} className={cn("absolute", d.cls)} />
      ))}
    </div>
  );
}
