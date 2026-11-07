import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, Loader2, ShieldCheck, BookOpen, FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";

import { getJudgmentDetails, resolvePdfUrl, type PrecedentCard, type JudgmentDetails } from "@/lib/api";
import { cleanCaseTitle } from "@/lib/case-title";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

/** Monochrome tone classes for case outcome / disposition badges. */
export function outcomeTone(outcome: string): string {
  const o = outcome.toLowerCase();
  if (/(allow|accept|grant|confirm|uphold|succeed|acquit)/.test(o)) {
    return "border-foreground bg-foreground text-background";
  }
  if (/(dismiss|reject|refus|deny|convict|fail)/.test(o)) {
    return "border-foreground bg-background text-foreground";
  }
  if (/(quash|set aside|vacat|annul)/.test(o)) {
    return "border-foreground bg-muted text-foreground";
  }
  return "border-border bg-muted text-muted-foreground";
}

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "judgment"
  );
}

function CopyIconButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      aria-label={label}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="mt-0.5 shrink-0 rounded p-1.5 text-muted-foreground opacity-60 transition-opacity transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring group-hover:opacity-100"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-gold" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}

function Empty({ children }: { children: string }) {
  return <p className="text-[13px] text-muted-foreground">{children}</p>;
}

function Block({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </p>
      <p className="mt-1.5 whitespace-pre-line text-[14px] leading-relaxed text-foreground/90">
        {value}
      </p>
    </div>
  );
}

interface JudgmentReaderDrawerProps {
  card: PrecedentCard;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function JudgmentReaderDrawer({ card, open, onOpenChange }: JudgmentReaderDrawerProps) {
  const { getToken } = useAuth();
  const [fullText, setFullText] = useState<string>("");
  const [details, setDetails] = useState<JudgmentDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>("ratio");
  const [pdfLoading, setPdfLoading] = useState(true);
  const [pdfTimedOut, setPdfTimedOut] = useState(false);
  const [pdfRetryKey, setPdfRetryKey] = useState(0);

  // Strictly bind to a stable identifier — never the title string.
  const idToFetch = useMemo(
    () => card.judgment_id || card.case_id || "",
    [card.judgment_id, card.case_id],
  );

  const fallbackText = useMemo(() => {
    return card.raw_judgment_text || card.holding || "";
  }, [card.raw_judgment_text, card.holding]);

  const activePdfUrl = useMemo(
    () => resolvePdfUrl(card.pdf_url || details?.pdf_url, card.judgment_id || card.case_id),
    [card.pdf_url, details?.pdf_url, card.judgment_id, card.case_id],
  );

  const holdingText =
    card.holding ||
    card.ratio_decidendi ||
    details?.holding ||
    details?.ratio_decidendi ||
    "";

  const issueText =
    card.issue ||
    details?.legal_issue ||
    details?.issue ||
    "";

  const effectiveStatutes =
    card.statutes_invoked && card.statutes_invoked.length > 0
      ? card.statutes_invoked
      : (details?.statutes_invoked || []);

  useEffect(() => {
    if (open) {
      setActiveTab("ratio");
    }
  }, [open, idToFetch]);

  useEffect(() => {
    if (activeTab !== "pdf" || !activePdfUrl) return;
    setPdfLoading(true);
    setPdfTimedOut(false);
    const timer = window.setTimeout(() => {
      setPdfTimedOut(true);
      setPdfLoading(false);
      console.warn("[PDF_LOAD_TIMEOUT] Case:", idToFetch, "Url:", activePdfUrl);
    }, 15000);
    return () => window.clearTimeout(timer);
  }, [activeTab, activePdfUrl, pdfRetryKey, idToFetch]);

  // Fetch the complete judgment record every time the drawer opens.
  useEffect(() => {
    if (!open || !idToFetch) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    setFullText("");
    setDetails(null);
    (async () => {
      try {
        let token: string | undefined;
        try {
          token = (await getToken({ skipCache: true })) || undefined;
        } catch {
          // Token is optional for public judgment reader
        }
        const data = await getJudgmentDetails(idToFetch, token);
        if (!cancelled) {
          setFullText(data.full_text || fallbackText);
          setDetails(data);
        }
      } catch (err) {
        if (!cancelled) {
          // On failure, surface fallback content silently.
          setFullText(fallbackText);
          setError(
            err instanceof Error && err.message.includes("404")
              ? null
              : "Could not load the full judgment text; showing available summary.",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, idToFetch]);

  const orderText = fullText;

  const paragraphs = useMemo(
    () =>
      orderText
        .split(/\n\s*\n+/)
        .map((p) => p.trim())
        .filter(Boolean),
    [orderText],
  );

  const download = () => {
    const parts = [
      card.case_name,
      [card.citation, card.date && `(${card.date})`].filter(Boolean).join(" "),
      card.outcome && `Outcome: ${card.outcome}`,
      "",
      card.issue && `LEGAL ISSUE\n${card.issue}`,
      card.holding && `RATIO DECIDENDI\n${card.holding}`,
      card.why_relevant && `WHY IT IS RELEVANT\n${card.why_relevant}`,
      card.statutes_invoked.length > 0 &&
        `STATUTES INVOKED\n${card.statutes_invoked
          .map((s) => `- ${s.name}${s.explanation ? `: ${s.explanation}` : ""}`)
          .join("\n")}`,
      orderText && `FULL ORDER TEXT\n${orderText}`,
    ].filter(Boolean) as string[];

    const blob = new Blob([parts.join("\n\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${slugify(card.citation || card.case_name)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 p-0 sm:max-w-xl md:max-w-2xl"
      >
        <SheetHeader className="space-y-3 border-b border-border px-5 py-4 pr-12 text-left">
          <SheetTitle className="font-serif text-[19px] leading-snug">
            {card.source_url ? (
              <a
                href={card.source_url}
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-gold/50 decoration-dotted underline-offset-4 transition-colors hover:text-gold"
              >
                {cleanCaseTitle(card.case_name) || "Untitled case"}
              </a>
            ) : (
              cleanCaseTitle(card.case_name) || "Untitled case"
            )}
          </SheetTitle>
          <SheetDescription asChild>
            <div className="flex flex-wrap items-center gap-2">
              {(card.citation || card.date) && (
                <span className="inline-flex items-center rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11.5px] font-semibold text-primary">
                  {card.citation}
                  {card.citation && card.date ? " " : ""}
                  {card.date ? `(${card.date})` : ""}
                </span>
              )}
              {card.outcome && (
                <span
                  className={cn(
                    "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11.5px] font-semibold capitalize",
                    outcomeTone(card.outcome),
                  )}
                >
                  {card.outcome}
                </span>
              )}
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium",
                  card.verified_source
                    ? "border-gold/40 bg-gold/10 text-gold"
                    : "border-border bg-muted text-muted-foreground",
                )}
              >
                {card.verified_source ? (
                  <ShieldCheck className="h-3 w-3" aria-hidden />
                ) : (
                  <BookOpen className="h-3 w-3" aria-hidden />
                )}
                {card.verified_source ? "Verified Source" : "General Reference"}
              </span>
              {activePdfUrl && (
                <a
                  href={activePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-7 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/10 px-3 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/20"
                >
                  <FileText className="h-3.5 w-3.5" aria-hidden />
                  View PDF
                </a>
              )}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={download}
                disabled={loading}
                className="ml-auto h-7 gap-1.5 text-[12px]"
              >
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
                ) : (
                  <Download className="h-3.5 w-3.5" aria-hidden />
                )}
                Download
              </Button>
            </div>
          </SheetDescription>
        </SheetHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex min-h-0 flex-1 flex-col">
          <div className="border-b border-border px-5 py-3">
            <TabsList className="flex h-auto w-full flex-wrap justify-start gap-1">
              <TabsTrigger value="ratio" className="text-[12.5px]">
                Ratio Decidendi
              </TabsTrigger>
              <TabsTrigger value="issue" className="text-[12.5px]">
                Legal Issue &amp; Scope
              </TabsTrigger>
              <TabsTrigger value="statutes" className="text-[12.5px]">
                Statutes Invoked
              </TabsTrigger>
              <TabsTrigger value="order" className="text-[12.5px]">
                Full Order Text
              </TabsTrigger>
              <TabsTrigger value="pdf" className="text-[12.5px]">
                Official PDF
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
            <TabsContent value="ratio" className="mt-0 space-y-5">
              {holdingText ? (
                <Block label="Holding / Ratio Decidendi" value={holdingText} />
              ) : (
                <div className="rounded-md border border-dashed border-border p-5 text-center">
                  <p className="text-[13px] text-muted-foreground">Ratio not available for this case.</p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("order")}
                    className="mt-3 h-8 gap-1.5 text-[12px] border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    View Full Order Text
                  </Button>
                </div>
              )}
              <Block label="Why it's relevant" value={card.why_relevant} />
            </TabsContent>

            <TabsContent value="issue" className="mt-0 space-y-5">
              {issueText ? (
                <Block label="Legal Issue & Scope" value={issueText} />
              ) : (
                <Empty>No legal issue recorded for this judgment.</Empty>
              )}
              <Block label="Outcome / Disposition" value={card.outcome} />
            </TabsContent>

            <TabsContent value="statutes" className="mt-0">
              {effectiveStatutes.length === 0 ? (
                <Empty>No statutes were recorded for this judgment.</Empty>
              ) : (
                <ul className="space-y-3">
                  {effectiveStatutes.map((s, i) => (
                    <li
                      key={`${s.name}-${i}`}
                      className="rounded-md border border-border bg-muted/30 px-3.5 py-3"
                    >
                      <p className="text-[13.5px] font-semibold text-foreground">{s.name}</p>
                      {s.explanation && (
                        <p className="mt-1 text-[13px] leading-relaxed text-foreground/80">
                          {s.explanation}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>

            <TabsContent value="order" className="mt-0">
              {loading && paragraphs.length === 0 ? (
                <div className="flex items-center justify-center gap-2 py-16 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span className="text-[13px]">Loading full judgment text…</span>
                </div>
              ) : error && paragraphs.length === 0 ? (
                <Empty>{error}</Empty>
              ) : paragraphs.length === 0 ? (
                <Empty>Full order text is not available for this judgment.</Empty>
              ) : (
                <ol className="space-y-3">
                  {paragraphs.map((p, i) => (
                    <li
                      key={i}
                      className="group flex items-start gap-2 rounded-md border border-transparent px-2 py-1.5 transition-colors hover:border-border hover:bg-muted/30"
                    >
                      <span className="mt-1 w-6 shrink-0 text-right text-[11px] font-medium tabular-nums text-muted-foreground">
                        {i + 1}
                      </span>
                      <p className="flex-1 whitespace-pre-line text-[13.5px] leading-relaxed text-foreground/90">
                        {p}
                      </p>
                      <CopyIconButton text={p} label={`Copy paragraph ${i + 1}`} />
                    </li>
                  ))}
                </ol>
              )}
            </TabsContent>

            <TabsContent value="pdf" className="mt-0 space-y-4">
              {activePdfUrl ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 p-3.5">
                    <div className="space-y-0.5">
                      <p className="text-[13px] font-semibold text-foreground">
                        Authentic Law Reporter Scanned PDF
                      </p>
                      <p className="text-[11.5px] text-muted-foreground">
                        Official publication scan from superior court law reporter (SCMR / PLD / CLC).
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <a
                        href={activePdfUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/15 px-3 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/25"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                        Open in New Tab
                      </a>
                      <a
                        href={activePdfUrl}
                        download
                        className="inline-flex h-8 items-center gap-1.5 rounded-md border border-border bg-background px-3 text-[12px] font-medium text-foreground transition-colors hover:bg-muted"
                      >
                        <Download className="h-3.5 w-3.5" aria-hidden />
                        Download PDF
                      </a>
                    </div>
                  </div>

                  {pdfTimedOut ? (
                    <div className="rounded-md border border-border bg-muted/30 p-6 text-center">
                      <p className="text-[13.5px] font-medium text-foreground">
                        PDF viewer timed out (15-second response limit reached).
                      </p>
                      <p className="mt-1 text-[12.5px] text-muted-foreground">
                        The court report scan is taking longer than expected to display inline.
                      </p>
                      <div className="mt-4 flex flex-wrap justify-center gap-2.5">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setPdfRetryKey((k) => k + 1)}
                          className="h-8 gap-1.5 text-[12px]"
                        >
                          Retry Loading PDF
                        </Button>
                        <a
                          href={activePdfUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex h-8 items-center gap-1.5 rounded-md border border-gold/40 bg-gold/15 px-3 text-[12px] font-semibold text-gold transition-colors hover:bg-gold/25"
                        >
                          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
                          Open Direct PDF
                        </a>
                        <Button
                          type="button"
                          variant="secondary"
                          size="sm"
                          onClick={() => setActiveTab("order")}
                          className="h-8 gap-1.5 text-[12px]"
                        >
                          <FileText className="h-3.5 w-3.5" aria-hidden />
                          Read Full Order Text
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="relative min-h-[28rem] w-full flex-1 overflow-hidden rounded-md border border-border bg-muted/20">
                      {pdfLoading && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-2 bg-background/80 backdrop-blur-xs">
                          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden />
                          <span className="text-[12.5px] text-muted-foreground">
                            Loading official court report scan…
                          </span>
                        </div>
                      )}
                      <iframe
                        key={`${activePdfUrl}-${pdfRetryKey}`}
                        src={activePdfUrl}
                        title="Official judgment PDF"
                        onLoad={() => setPdfLoading(false)}
                        className="h-full min-h-[28rem] w-full rounded-md border-0"
                      />
                    </div>
                  )}
                </>
              ) : (
                <div className="rounded-md border border-dashed border-border p-6 text-center">
                  <p className="text-[13px] text-muted-foreground">
                    Official court report PDF is not available in the database for this judgment.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setActiveTab("order")}
                    className="mt-3 h-8 gap-1.5 text-[12px] border-primary/40 text-primary hover:bg-primary/10"
                  >
                    <FileText className="h-3.5 w-3.5" aria-hidden />
                    View Full Order Text
                  </Button>
                </div>
              )}
            </TabsContent>

          </div>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
}
