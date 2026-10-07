import { useState, type ReactNode } from "react";
import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

/** Small info button: the text shows on mouse hover and stays open after a click or tap. */
export function InfoHint({ label, children }: { label: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  const [pinned, setPinned] = useState(false);

  return (
    <Popover open={hover || pinned} onOpenChange={(open) => !open && setPinned(false)}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={label}
          className="flex size-12 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          onPointerEnter={(e) => e.pointerType === "mouse" && setHover(true)}
          onPointerLeave={(e) => e.pointerType === "mouse" && setHover(false)}
          onClick={(e) => {
            // Radix would toggle on its own; hover and click share one state instead
            e.preventDefault();
            setPinned((p) => !p);
          }}
        >
          <Info className="size-5" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="top"
        className="w-64 rounded-[20px] bg-card text-sm text-card-foreground"
        onOpenAutoFocus={(e) => e.preventDefault()}
        onPointerEnter={() => setHover(true)}
        onPointerLeave={() => setHover(false)}
      >
        {children}
      </PopoverContent>
    </Popover>
  );
}
