import { useState } from "react";
import { useAuth } from "@clerk/clerk-react";
import { FileSignature, Loader2, X, FileText } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { MAX_PINS, unpin, usePins } from "@/lib/pleading-pins";

const COURTS = [
  "Supreme Court of Pakistan",
  "Lahore High Court",
  "Sindh High Court",
  "Islamabad High Court",
  "Peshawar High Court",
  "Balochistan High Court",
];

const TEMPLATES = [
  { id: "bail_pre_arrest_498", label: "Pre-Arrest Bail Petition (Section 498 CrPC)" },
  { id: "bail_post_arrest_497", label: "Post-Arrest Bail Petition (Section 497 CrPC)" },
  { id: "writ_petition_199", label: "Constitutional Writ Petition (Article 199)" },
  { id: "application_12_2_cpc", label: "Application u/s 12(2) CPC (Fraud Decree)" },
  { id: "stay_application_o39", label: "Temporary Injunction (Order XXXIX Rules 1 & 2 CPC)" },
  { id: "legal_notice", label: "Statutory Legal Notice (Section 80 CPC)" },
  { id: "custom", label: "Custom Freeform Court Pleading" },
];

const BACKEND_URL = (import.meta.env.VITE_BACKEND_URL as string | undefined)?.replace(/\/$/, "");

export function PleadingCanvas() {
  const pins = usePins();
  const { getToken } = useAuth();
  const [open, setOpen] = useState(false);
  const [court, setCourt] = useState(COURTS[1]);
  const [templateId, setTemplateId] = useState(TEMPLATES[0].id);
  const [title, setTitle] = useState("");
  const [facts, setFacts] = useState("");
  const [busy, setBusy] = useState(false);

  async function generate() {
    if (!title.trim()) return toast.error("Please enter a cause title or petitioner name.");
    if (!facts.trim()) return toast.error("Please enter chronological facts.");
    if (!BACKEND_URL) return toast.error("Drafting service is not configured.");
    setBusy(true);

    try {
      const token = await getToken();
      let res: Response;

      if (templateId !== "custom") {
        res = await fetch(`${BACKEND_URL}/api/v1/drafting/generate`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            template_id: templateId,
            slots: {
              court_name: court,
              petitioner: title.trim(),
              facts: facts.trim(),
            },
            selected_case_ids: pins.map((p) => p.id),
            export_format: "docx",
          }),
        });
      } else {
        res = await fetch(`${BACKEND_URL}/generate-pleading`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            court_name: court,
            case_title: title.trim(),
            facts: facts.trim(),
            selected_case_ids: pins.map((p) => p.id),
          }),
        });
      }

      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new Error(`Generation failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const safe = title.trim().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").slice(0, 60);
      a.download = `${safe || "court-pleading"}.docx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success("Court pleading generated with 1.5\" margins & downloaded successfully.");
      setOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate the pleading.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      {pins.length > 0 && (
        <div className="fixed bottom-24 right-6 z-40">
          <Button onClick={() => setOpen(true)} className="gap-2 shadow-lg bg-primary text-primary-foreground hover:bg-authority">
            <FileSignature className="h-4 w-4" />
            Draft Court Pleading · Pinned {pins.length}/{MAX_PINS}
          </Button>
        </div>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-serif text-2xl flex items-center gap-2">
              <FileText className="h-6 w-6 text-authority" />
              Court Pleading Drafter
            </DialogTitle>
            <DialogDescription>
              Draft Pakistani High Court-compliant pleadings with 1.5" left margins and verified Article 189 precedent bindings.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Pleading Template</Label>
              <Select value={templateId} onValueChange={setTemplateId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {TEMPLATES.map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Target Court / Forum</Label>
              <Select value={court} onValueChange={setCourt}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {COURTS.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="cause-title">Petitioner / Cause Title</Label>
              <Input
                id="cause-title"
                placeholder="Muhammad Asif v. The State"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="facts">Chronological Facts (Dates, FIR No., Impugned Order)</Label>
              <Textarea
                id="facts"
                rows={6}
                placeholder="1. On 12.04.2024, the complainant lodged false FIR No. 12/2024 due to business rivalry.&#10;2. On 25.04.2024, the Sessions Judge dismissed the application..."
                value={facts}
                onChange={(e) => setFacts(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Pinned Judicial Precedents ({pins.length}/{MAX_PINS})</Label>
              <div className="flex flex-wrap gap-2">
                {pins.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No authorities pinned. Search cases in Jurist or Counsel and click "Pin to Drafter" to bind precedent into grounds.
                  </p>
                )}
                {pins.map((p) => (
                  <span
                    key={p.id}
                    className="inline-flex items-center gap-1.5 rounded-sm border border-authority/30 bg-authority/10 px-2.5 py-1 text-xs font-medium text-foreground"
                  >
                    {p.label}
                    <button
                      type="button"
                      aria-label={`Remove ${p.label}`}
                      onClick={() => unpin(p.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={generate} disabled={busy} className="gap-2 bg-primary text-primary-foreground hover:bg-authority">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}
              {busy ? "Compiling Pleading…" : "Generate & Download .docx"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
