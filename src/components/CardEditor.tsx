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
import { cn } from "@/lib/utils";

const schema = z.object({
  name_nl: z.string().trim().min(1, "Name is required").max(120),
  name_latin: z.string().trim().max(160),
  origin: z.string().max(1000),
  insertion: z.string().max(1000),
  innervation: z.string().max(1000),
  function: z.string().max(1000),
  image_source: z.string().trim().max(300),
  image_author: z.string().trim().max(200),
  image_license: z.string().trim().max(100),
  category_id: z.string().uuid("Pick a category"),
});

const field = "h-12 rounded-full border-on-pastel/10 bg-card/70 px-5";
const area = "rounded-[22px] border-on-pastel/10 bg-card/70 px-5 py-3";

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
    if (!f.category_id && cats?.[0]) setF((s) => ({ ...s, category_id: cats[0].id }));
  }, [cats, f.category_id]);

  const color = colorOf(cats?.find((c) => c.id === f.category_id)?.color);
  const imgUrl = localUrl ?? remoteUrl ?? null;
  const up = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value });

  function pick(fl: File | undefined) {
    if (!fl) return;
    if (!fl.type.startsWith("image/")) return toast.error("Please choose an image");
    if (fl.size > 10 * 1024 * 1024) return toast.error("Image must be under 10 MB");
    setFile(fl);
    setLocalUrl(URL.createObjectURL(fl));
    setMarker(null);
    setCovers([]);
  }

  async function save() {
    const parsed = schema.safeParse(f);
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    if (!imgUrl) return toast.error("Add an image");
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
      toast.success("Card saved");
      navigate({ to: "/categories/$id", params: { id: d.category_id } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!card || !confirm("Delete this card?")) return;
    if (card.image_path) await supabase.storage.from(BUCKET).remove([card.image_path]);
    const { error } = await supabase.from("cards").delete().eq("id", card.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["cards"] });
    qc.invalidateQueries({ queryKey: ["categories"] });
    navigate({ to: "/categories/$id", params: { id: card.category_id } });
  }

  return (
    <div className={cn("min-h-screen px-5 pb-10 pt-8 text-on-pastel transition-colors", color.bg)}>
      <div className="flex items-center justify-between">
        <button onClick={() => history.back()} className="flex size-11 items-center justify-center rounded-full bg-card/60" aria-label="Back">
          <ArrowLeft className="size-5" />
        </button>
        {card && (
          <button onClick={remove} className="flex size-11 items-center justify-center rounded-full bg-card/60" aria-label="Delete card">
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
      <h1 className="mt-6 text-4xl font-semibold">{card ? "Edit card" : "New card"}</h1>

      <section className="mt-6 space-y-3">
        <Input className={field} placeholder="Name (NL)" value={f.name_nl} onChange={up("name_nl")} />
        <Input className={cn(field, "italic")} placeholder="Latin name (optional)" value={f.name_latin} onChange={up("name_latin")} />
        <div className="flex flex-wrap gap-2">
          {cats?.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setF({ ...f, category_id: c.id })}
              className={cn("rounded-full border-2 px-4 py-2 text-sm font-medium", colorOf(c.color).bg, f.category_id === c.id ? "border-on-pastel" : "border-card/70")}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mt-6">
        {!imgUrl ? (
          <label
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); pick(e.dataTransfer.files[0]); }}
            className={cn("tile flex aspect-[4/3] cursor-pointer flex-col items-center justify-center border-2 border-dashed border-on-pastel/25 bg-card/50", dragOver && "bg-card")}
          >
            <ImagePlus className="size-8" />
            <span className="mt-2 font-semibold">Drop an image or click to upload</span>
            <span className="text-xs opacity-60">PNG, JPG up to 10 MB</span>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
          </label>
        ) : (
          <>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <button type="button" onClick={() => setMode("marker")} className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", mode === "marker" ? "bg-primary text-primary-foreground" : "bg-card/60")}>
                <Square className="size-4" /> Highlight
              </button>
              <button type="button" onClick={() => setMode("cover")} className={cn("flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold", mode === "cover" ? "bg-primary text-primary-foreground" : "bg-card/60")}>
                <SquareDashed className="size-4" /> Cover labels
              </button>
              <label className="ml-auto cursor-pointer rounded-full bg-card/60 px-4 py-2 text-sm font-semibold">
                Replace
                <input type="file" accept="image/*" className="hidden" onChange={(e) => pick(e.target.files?.[0])} />
              </label>
            </div>
            <BoxEditor
              src={imgUrl}
              mode={mode}
              marker={marker}
              covers={covers}
              coverClass={color.deep}
              onChange={(m, c) => { setMarker(m); setCovers(c); }}
            />
            <p className="mt-2 text-xs opacity-60">
              {mode === "marker" ? "Drag on the image to draw the highlight. Drag to move, use the corner to resize." : "Drag over printed labels to cover them."}
            </p>
          </>
        )}
      </section>

      <section className="mt-6 grid gap-3 sm:grid-cols-2">
        <Textarea className={area} placeholder="Origin" value={f.origin} onChange={up("origin")} />
        <Textarea className={area} placeholder="Insertion" value={f.insertion} onChange={up("insertion")} />
        <Textarea className={area} placeholder="Innervation" value={f.innervation} onChange={up("innervation")} />
        <Textarea className={area} placeholder="Function" value={f.function} onChange={up("function")} />
      </section>

      <section className="mt-6 space-y-3">
        <p className="text-sm font-semibold">Image attribution</p>
        <Input className={field} placeholder="Source (URL or book)" value={f.image_source} onChange={up("image_source")} />
        <div className="grid grid-cols-2 gap-3">
          <Input className={field} placeholder="Author" value={f.image_author} onChange={up("image_author")} />
          <Input className={field} placeholder="License" value={f.image_license} onChange={up("image_license")} />
        </div>
      </section>

      <Button size="lg" className="mt-8 w-full" onClick={save} disabled={saving}>
        {saving ? "Saving…" : "Save card"}
      </Button>
    </div>
  );
}
