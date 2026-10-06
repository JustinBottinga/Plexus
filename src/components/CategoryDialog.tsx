import { useEffect, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PALETTE, type ColorKey } from "@/lib/palette";
import { cn } from "@/lib/utils";

export function CategoryDialog({
  trigger,
  initial,
}: {
  trigger: ReactNode;
  initial?: { id: string; name: string; color: string };
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initial?.name ?? "");
  const [color, setColor] = useState<string>(initial?.color ?? "butter");
  const qc = useQueryClient();

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setColor(initial?.color ?? "butter");
    }
  }, [open, initial?.name, initial?.color]);

  async function save() {
    const n = name.trim();
    if (!n || n.length > 60) return toast.error("De naam moet 1–60 tekens lang zijn");
    const { error } = initial
      ? await supabase.from("categories").update({ name: n, color }).eq("id", initial.id)
      : await supabase.from("categories").insert({ name: n, color });
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["categories"] });
    qc.invalidateQueries({ queryKey: ["cards", "study"] });
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-[30px] border-0 bg-card">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{initial ? "Categorie bewerken" : "Nieuwe categorie"}</DialogTitle>
        </DialogHeader>
        <Input className="h-12 rounded-full px-5" placeholder="bijv. Bovenste extremiteit" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        <div className="grid grid-cols-6 gap-2">
          {PALETTE.map((p) => (
            <button
              key={p.key}
              type="button"
              aria-label={p.label}
              onClick={() => setColor(p.key as ColorKey)}
              className={cn("aspect-square rounded-full ring-offset-2 ring-offset-card transition", p.bg, color === p.key && "ring-2 ring-foreground")}
            />
          ))}
        </div>
        <Button size="lg" onClick={save}>Opslaan</Button>
      </DialogContent>
    </Dialog>
  );
}
