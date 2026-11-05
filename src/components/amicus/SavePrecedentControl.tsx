import { useEffect, useState } from "react";
import { Bookmark, BookmarkCheck } from "lucide-react";
import { toast } from "sonner";

import type { PrecedentCard } from "@/lib/api";
import { precedentKey, useLibrary } from "@/lib/useLibrary";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export function SavePrecedentControl({ card }: { card: PrecedentCard }) {
  const lib = useLibrary();
  const key = precedentKey(card);
  const existing = lib.byKey.get(key);
  const [open, setOpen] = useState(false);
  const [tags, setTags] = useState("");
  const [matter, setMatter] = useState("");
  const [note, setNote] = useState("");

  useEffect(() => {
    if (!open) return;
    setTags(existing?.tags.join(", ") ?? "");
    setMatter(existing?.matter ?? "");
    setNote(existing?.note ?? "");
  }, [open, existing]);

  const matters = Array.from(new Set(lib.rows.map((r) => r.matter).filter(Boolean)));

  async function onSave() {
    try {
      await lib.save.mutateAsync({
        card,
        tags: Array.from(new Set(tags.split(",").map((t) => t.trim()).filter(Boolean))),
        matter: matter.trim(),
        note: note.trim(),
      });
      toast.success(existing ? "Library entry updated" : "Saved to your library");
      setOpen(false);
    } catch {
      toast.error("Could not save this precedent. Please try again.");
    }
  }

  async function onRemove() {
    try {
      await lib.remove.mutateAsync(key);
      toast.success("Removed from your library");
      setOpen(false);
    } catch {
      toast.error("Could not remove this precedent.");
    }
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-9 gap-2 px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          {existing ? <BookmarkCheck className="h-3.5 w-3.5" /> : <Bookmark className="h-3.5 w-3.5" />}
          {existing ? "Saved" : "Save to Library"}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <p className="text-sm font-semibold text-foreground">Citation library</p>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Tags (comma separated)</span>
          <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="bail, limitation" />
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Matter</span>
          <Input
            value={matter}
            onChange={(e) => setMatter(e.target.value)}
            placeholder="e.g. State v. Khan"
            list={`matters-${key}`}
          />
          <datalist id={`matters-${key}`}>
            {matters.map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
        <label className="block space-y-1">
          <span className="text-xs text-muted-foreground">Note</span>
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} />
        </label>
        <div className="flex justify-between gap-2">
          {existing ? (
            <Button variant="ghost" size="sm" onClick={onRemove} disabled={lib.remove.isPending}>
              Remove
            </Button>
          ) : (
            <span />
          )}
          <Button size="sm" onClick={onSave} disabled={lib.save.isPending}>
            {existing ? "Update" : "Save"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
