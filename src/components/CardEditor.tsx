import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ImagePlus, Square, SquareDashed, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { BUCKET, categoriesQuery, useSignedUrl, type Box, type Card } from "@/lib/data";
import { colorOf } from "@/lib/palette";
import { BoxEditor } from "@/components/BoxEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";

const schema = z.object({
  name_nl: z.string().trim().min(1, "Naam is verplicht").max(120),
  name_latin: z.string().trim().max(160),
  origin: z.string().max(1000),
  insertion: z.string().max(1000),
  innervation: z.string().max(1000),
  function: z.string().max(1000),
  image_source: z.string().trim().max(300),
  image_author: z.string().trim().max(200),
  image_license: z.string().trim().max(100),
  category_id: z.string().uuid("Kies een categorie"),
});

const field = "h-12 rounded-full border-on-pastel/10 bg-pastel-surface/70 px-5 text-on-pastel placeholder:text-on-pastel-muted";
const area = "rounded-[22px] border-on-pastel/10 bg-pastel-surface/70 px-5 py-3 text-on-pastel placeholder:text-on-pastel-muted";

export function CardEditor({ card, defaultCategory }: { card?: Card; defaultCategory?: string }) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: cats } = useQuery(categoriesQuery);
  const [f, setF] = useState({
    name_nl: card?.name_nl ?? "",
    name_latin: card?.name_latin ?? "",
    origin: card?.origin ?? "",
    insertion: card?.insertion ?? "",
    innervation: card?.innervation ?? "",
    function: card?.function ?? "",
    image_source: card?.image_source ?? "",
    image_author: card?.image_author ?? "",
    image_license: card?.image_license ?? "",
    category_id: card?.category_id ?? defaultCategory ?? "",
  });
  const [marker, setMarker] = useState<Box | null>((card?.marker as Box | null) ?? null);
  const [covers, setCovers] = useState<Box[]>((card?.covers as Box[] | null) ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [localUrl, setLocalUrl] = useState<string | null>(null);
  const [mode, setMode] = useState<"marker" | "cover">("marker");
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const { data: remoteUrl } = useSignedUrl(file ? null : card?.image_path);

  useEffect(() => {
    if (!f.category_id && cats?.[0]) setF((s) => ({ ...s, category_id: cats[0]!.id }));
  }, [cats, f.category_id]);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const fl = item.getAsFile();
          if (fl) {
            e.preventDefault();
            pick(fl);
          }
          break;
        }
      }
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const category = cats?.find((c) => c.id === f.category_id);
  const color = colorOf(category?.color);
  const imgUrl = localUrl ?? remoteUrl ?? null;
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function pick(fl: File | undefined) {
    if (!fl) return;
    if (!fl.type.startsWith("image/")) { toast.error("Kies een afbeelding"); return; }
    if (fl.size > 10 * 1024 * 1024) { toast.error("De afbeelding mag maximaal 10 MB zijn"); return; }
    setFile(fl);
    setLocalUrl(URL.createObjectURL(fl));
    setMarker(null);
    setCovers([]);
  }

  async function save() {
    const parsed = schema.safeParse(f);
    if (!parsed.success) { toast.error(parsed.error.issues[0]?.message ?? "Ongeldig"); return; }
    if (!imgUrl) { toast.error("Voeg een afbeelding toe"); return; }
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      let image_path = card?.image_path ?? null;
      if (file) {
        const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${u.user!.id}/${crypto.randomUUID()}.${ext}`;
        const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type });
        if (error) throw error;
        if (card?.image_path) await supabase.storage.from(BUCKET).remove([card.image_path]);
        image_path = path;
      }
      const d = parsed.data;
      const row = {
        ...d,
        name_latin: d.name_latin || null,
        origin: d.origin || null,
        insertion: d.insertion || null,
        innervation: d.innervation || null,
        function: d.function || null,
        image_source: d.image_source || null,
        image_author: d.image_author || null,
        image_license: d.image_license || null,
        image_path,
        marker,
        covers,
        updated_at: new Date().toISOString(),
      };
      const { error } = card
        ? await supabase.from("cards").update(row).eq("id", card.id)
        : await supabase.from("cards").insert(row);
      if (error) throw error;
      qc.invalidateQueries({ queryKey: ["cards"] });
      qc.invalidateQueries({ queryKey: ["card"] });
      qc.invalidateQueries({ queryKey: ["categories"] });
      toast.success("Kaart opgeslagen");
      navigate({ to: "/categories/$id", params: { id: d.category_id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!card) return;
    if (card.image_path) await supabase.storage.from(BUCKET).remove([card.image_path]);
    const { error } = await supabase.from("cards").delete().eq("id", card.id);
    if (error) { toast.error(error.message); return; }
    qc.invalidateQueries({ queryKey: ["cards"] });
    qc.removeQueries({ queryKey: ["card", card.id] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    navigate({ to: "/categories/$id", params: { id: card.category_id } });
  }

  // The color runs on underneath the tab bar (-mb cancels the shell padding), so no plain strip shows below it
  return (
    <div className={cn("-mb-28 min-h-screen px-5 pb-[9.5rem] pt-8 text-on-pastel transition-colors", color.bg)}>
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60" aria-label="Terug">
          <ArrowLeft className="size-5" />
        </button>
        {card && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <button className="flex size-12 items-center justify-center rounded-full bg-pastel-surface/60" aria-label="Kaart verwijderen">
                <Trash2 className="size-4" />
              </button>
            </AlertDialogTrigger>
            <AlertDialogContent className="rounded-[30px]">
              <AlertDialogHeader>
                <AlertDialogTitle>“{card.name_nl}” verwijderen?</AlertDialogTitle>
                <AlertDialogDescription>Deze kaart en de afbeelding worden definitief verwijderd.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel className="rounded-full">Annuleren</AlertDialogCancel>
                <AlertDialogAction className="rounded-full" onClick={remove}>Verwijderen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>
      <h1 className="mt-6 text-4xl font-semibold">{card ? "Kaart bewerken" : "Nieuwe kaart"}</h1>
      {/* The category is fixed here: it comes from where the card was opened and is not changed in this screen */}
      {category && <p className="mt-1 text-sm text-on-pastel/60">{category.name}</p>}

      <section className="mt-6 space-y-3">
        <Input className={field} placeholder="Naam (NL)" value={f.name_nl} onChange={up("name_nl")} />
        <Input className={cn(field, "italic")} placeholder="Latijnse naam (optioneel)" value={f.name_latin} onChange={up("name_latin")} />
      </section>

      <section className="mt-6">
        {!imgUrl ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); }}
            className={cn("tile flex aspect-[4/3] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-on-pastel/25 bg-pastel-surface/50 p-8 text-center", dragOver && "bg-pastel-surface/80")}
          >
            <ImagePlus className="size-8" />
            <span className="mt-3 max-w-xs font-semibold">Sleep een afbeelding hierheen, plak met Ctrl+V of klik om te uploaden</span>
            <span className="mt-1 text-xs text-on-pastel-muted">PNG of JPG, maximaal 10 MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode("marker")} className={cn("flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold", mode === "marker" ? "pop bg-primary text-primary-foreground" : "bg-pastel-surface/60")}>
                <Square className="size-4" /> Markeren
              </button>
              <button type="button" onClick={() => setMode("cover")} className={cn("flex h-12 items-center gap-2 rounded-full px-5 text-sm font-semibold", mode === "cover" ? "pop bg-primary text-primary-foreground" : "bg-pastel-surface/60")}>
                <SquareDashed className="size-4" /> Labels afdekken
              </button>
              <label className="ml-auto flex h-12 cursor-pointer items-center rounded-full bg-pastel-surface/60 px-5 text-sm font-semibold">
                Vervangen
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
            </div>
            <BoxEditor
              src={imgUrl}
              mode={mode}
              marker={marker}
              covers={covers}
              onChange={(m, c) => { setMarker(m); setCovers(c); }}
            />
            <p className="mt-2 text-xs text-on-pastel-muted">
              {mode === "marker" ? "Sleep over de afbeelding om de markering te tekenen. Sleep om te verplaatsen, gebruik de hoek om het formaat te wijzigen." : "Sleep over gedrukte labels om ze af te dekken."}{" "}
              Je kunt ook een nieuwe afbeelding plakken met Ctrl+V om de huidige te vervangen.
            </p>
          </>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Textarea className={area} placeholder="Origo" value={f.origin} onChange={up("origin")} />
        <Textarea className={area} placeholder="Insertie" value={f.insertion} onChange={up("insertion")} />
        <Textarea className={area} placeholder="Innervatie" value={f.innervation} onChange={up("innervation")} />
        <Textarea className={area} placeholder="Functie" value={f.function} onChange={up("function")} />
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-sm font-semibold">Bronvermelding afbeelding</p>
        <Input className={field} placeholder="Bron (URL of boek)" value={f.image_source} onChange={up("image_source")} />
        <div className="grid grid-cols-2 gap-3">
          <Input className={field} placeholder="Auteur" value={f.image_author} onChange={up("image_author")} />
          <Input className={field} placeholder="Licentie" value={f.image_license} onChange={up("image_license")} />
        </div>
      </section>

      <Button size="lg" className="mt-8 w-full" onClick={save} disabled={saving}>
        {saving ? "Opslaan…" : "Kaart opslaan"}
      </Button>
    </div>
  );
}
