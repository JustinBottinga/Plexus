import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const drawings = {
  // a bone
  bone: (
    <path d="M14 46c-5 0-8-5-5-9 2-3 6-3 8-1l17-17c-2-2-2-6 1-8 4-3 9 0 9 5 5 0 8 5 5 9-2 3-6 3-8 1L24 43c2 2 2 6-1 8-2 1-6 0-9-5Z" />
  ),
  // a small stack of cards with a pencil line
  cards: (
    <>
      <rect x="12" y="20" width="34" height="26" rx="6" />
      <path d="M18 14h30a6 6 0 0 1 6 6v24" />
      <path d="M20 33c4-5 8 4 12-1s6 2 8-2" />
    </>
  ),
  // a check mark in a circle
  check: (
    <>
      <circle cx="32" cy="32" r="21" />
      <path d="M22 33l7 7 13-15" />
    </>
  ),
  // a star, for finishing a session
  star: <path d="M32 9l6 14.5 15.5 1.5-11.7 10.2L45.3 51 32 42.8 18.7 51l3.5-15.8L10.5 25l15.5-1.5Z" />,
  // folder with a plus
  folder: (
    <>
      <path d="M10 22a5 5 0 0 1 5-5h12l5 6h17a5 5 0 0 1 5 5v18a5 5 0 0 1-5 5H15a5 5 0 0 1-5-5Z" />
      <path d="M32 31v10M27 36h10" />
    </>
  ),
} as const;

export type DrawingName = keyof typeof drawings;

export function EmptyState({
  drawing,
  color,
  title,
  text,
  action,
  className,
}: {
  drawing: DrawingName;
  /** Tailwind background class of the circle, e.g. `bg-butter` */
  color: string;
  title: string;
  text?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center px-6 py-10 text-center", className)}>
      <div className={cn("flex size-28 items-center justify-center rounded-full text-on-pastel", color)}>
        <svg
          viewBox="0 0 64 64"
          className="size-14"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {drawings[drawing]}
        </svg>
      </div>
      <p className="mt-5 font-display text-xl font-semibold">{title}</p>
      {text && <p className="mt-1 max-w-xs text-sm text-muted-foreground">{text}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
