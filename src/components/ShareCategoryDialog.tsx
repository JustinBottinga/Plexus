import { useEffect, useState, type ReactNode } from "react";
import { Check, Copy, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getOrCreateInvite, inviteUrl, revokeInvites, type Invite } from "@/lib/invites";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const dateFormat = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "long" });

export function ShareCategoryDialog({ categoryId, categoryName, trigger }: { categoryId: string; categoryName: string; trigger: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState<Invite | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [copied, setCopied] = useState(false);

  // The link is created when the dialog opens, so it only exists when someone wants to share
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setState("loading");
    setCopied(false);
    getOrCreateInvite(categoryId)
      .then((i) => !cancelled && (setInvite(i), setState("ready")))
      .catch(() => !cancelled && setState("error"));
    return () => {
      cancelled = true;
    };
  }, [open, categoryId]);

  const url = invite ? inviteUrl(invite.token) : "";

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Kopiëren lukt niet. Selecteer de link en kopieer hem zelf.");
    }
  }

  async function share() {
    try {
      await navigator.share({ title: categoryName, text: `Ik deel “${categoryName}” met je`, url });
    } catch {
      /* closed the share sheet */
    }
  }

  async function revoke() {
    try {
      await revokeInvites(categoryId);
      toast.success("Link ingetrokken");
      setOpen(false);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="rounded-[30px] bg-card text-card-foreground">
        <DialogHeader>
          <DialogTitle>“{categoryName}” delen</DialogTitle>
          <DialogDescription>
            Iedereen met deze link kan een eigen kopie van de categorie en alle kaarten toevoegen. Je kaarten blijven van
            jou en je eigen planning verandert niet.
          </DialogDescription>
        </DialogHeader>

        {state === "loading" && <div className="h-12 animate-pulse rounded-full bg-muted" />}
        {state === "error" && <p className="text-sm text-destructive">De link kon niet worden gemaakt. Probeer het opnieuw.</p>}
        {state === "ready" && invite && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input readOnly value={url} aria-label="Uitnodigingslink" className="h-12 rounded-full px-5" onFocus={(e) => e.currentTarget.select()} />
              <Button size="icon" variant="outline" onClick={copy} aria-label="Link kopiëren">
                {copied ? <Check /> : <Copy />}
              </Button>
            </div>
            {typeof navigator !== "undefined" && "share" in navigator && (
              <Button size="lg" className="w-full" onClick={share}>
                <Share2 /> Delen via…
              </Button>
            )}
            <p className="text-center text-xs text-muted-foreground">
              Geldig tot {dateFormat.format(new Date(invite.expires_at))}
            </p>
            <Button size="lg" variant="ghost" className="w-full text-destructive" onClick={revoke}>
              Link intrekken
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
