import { useEffect, useState } from "react";
import { ArrowUp, BookOpen, Gavel, Paperclip, PenLine, Plus, Scale, Search } from "lucide-react";

const QUESTION = "Is a cheque given as security enforceable under Section 489-F PPC?";
const ANSWER =
  "Generally no. The Supreme Court has held that Section 489-F requires dishonest issuance towards repayment of a loan or fulfilment of an obligation. A cheque handed over purely as security, with no existing liability at the time, does not ordinarily attract criminal liability.";
const steps = ["Searching Supreme Court judgments", "Checking Section 489-F PPC", "Verifying citations"];
const tabs = ["Research", "Draft", "Summarize"];

export function ChatDemo() {
  const [typedQ, setTypedQ] = useState(0);
  const [step, setStep] = useState(0);
  const [typed, setTyped] = useState(0);

  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    if (typedQ < QUESTION.length) t = setTimeout(() => setTypedQ((n) => n + 2), 25);
    else if (step < steps.length) t = setTimeout(() => setStep((s) => s + 1), 800);
    else if (typed < ANSWER.length) t = setTimeout(() => setTyped((n) => Math.min(ANSWER.length, n + 3)), 18);
    else t = setTimeout(() => { setTypedQ(0); setStep(0); setTyped(0); }, 6000);
    return () => clearTimeout(t);
  }, [typedQ, step, typed]);

  const asked = typedQ >= QUESTION.length;
  const nav: [typeof Scale, string, boolean][] = [[Scale, "Jurist", true], [PenLine, "Counsel", false], [Gavel, "Judgments", false], [BookOpen, "Statutes", false]];

  return (
    <div className="site overflow-hidden rounded-lg border border-border bg-background text-foreground ">
      <div className="grid md:grid-cols-[210px_1fr]">
        <aside className="hidden border-r border-border bg-card p-4 text-sm md:block">
          <div className="mb-5 flex items-center gap-2">
            <span className="flex items-baseline gap-1.5 font-serif text-xl"><span>§</span><span>Section</span></span>
          </div>
          <div className="mb-6 flex items-center justify-center gap-2 rounded bg-primary py-2 text-xs font-medium text-primary-foreground"><Plus className="size-3.5" /> New matter</div>
          {nav.map(([I, label, active]) => (
            <div key={label} className={`mb-1 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-xs ${active ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>
              <I className={`size-3.5 ${active ? "text-foreground" : ""}`} /> {label}
            </div>
          ))}
          <p className="mb-2 mt-6 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">Recent matters</p>
          {["Pre-Arrest Bail, Section 498", "Banking Court Appeal"].map((r) => (
            <p key={r} className="truncate py-1 text-xs text-muted-foreground">{r}</p>
          ))}
        </aside>

        <div className="flex min-h-[480px] flex-col p-5 md:p-8">
          <div className="flex-1 space-y-6">
            {asked ? (
              <>
                <div className="anim-fade-up ml-auto max-w-md rounded bg-primary px-4 py-3 text-sm text-primary-foreground">{QUESTION}</div>
                <div className="flex gap-3">
                  
                  <div className="flex-1 text-sm"><p className="label-caps mb-2">Jurist</p>
                    <div className="mb-3 flex flex-wrap gap-2">
                      {steps.map((s, i) => (
                        <span key={s} className={`rounded border border-border px-2.5 py-1 text-[11px] text-muted-foreground transition-opacity duration-500 ${i < step ? "opacity-100" : "opacity-0"}`}>✓ {s}</span>
                      ))}
                    </div>
                    {step >= steps.length && (
                      <p className="leading-relaxed text-foreground/90">
                        {ANSWER.slice(0, typed)}
                        {typed < ANSWER.length && <span className="caret ml-0.5 inline-block h-4 w-1.5 translate-y-0.5 bg-foreground" />}
                      </p>
                    )}
                    {typed >= ANSWER.length && (
                      <div className="anim-fade-up mt-4 flex flex-wrap gap-2">
                        {["2023 SCMR 1012", "PLD 2019 SC 675", "§ 489-F PPC"].map((c) => (
                          <span key={c} className="rounded border border-border/50 px-3 py-1 text-xs text-foreground">{c}</span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="pt-6">
                <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">Good afternoon</p>
                <h3 className="mt-2 font-serif text-4xl">What are we working on?</h3>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[["Statute", "Banking Court appeals"], ["Case law", "Cheque dishonour, 489-F"], ["Remedies", "Pre-arrest bail"]].map(([k, t]) => (
                    <div key={k} className="rounded border border-border p-3">
                      <p className="text-[10px] uppercase tracking-[0.2em] text-foreground">{k}</p>
                      <p className="mt-1 font-serif text-base">{t}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="mt-8 rounded-lg border border-border bg-card">
            <div className="flex gap-1 border-b border-border p-2">
              {tabs.map((t, i) => (
                <span key={t} className={`rounded-md px-3 py-1 text-xs ${i === 0 ? "bg-secondary text-foreground" : "text-muted-foreground"}`}>{t}</span>
              ))}
            </div>
            <div className="flex items-end gap-3 p-3">
              <Paperclip className="mb-2 size-4 text-muted-foreground" />
              <p className="min-h-10 flex-1 py-1.5 text-sm">
                {asked ? <span className="text-muted-foreground">Ask a follow-up</span> : typedQ === 0 ? <span className="text-muted-foreground">Ask a legal question, or search Pakistani case law and statutes</span> : <>{QUESTION.slice(0, typedQ)}<span className="caret ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 bg-foreground" /></>}
              </p>
              <span className="grid size-8 place-items-center rounded bg-primary text-primary-foreground"><ArrowUp className="size-4" /></span>
            </div>
            <div className="flex items-center gap-2 border-t border-border px-3 py-2 text-[11px] text-muted-foreground">
              <Search className="size-3" /> All authorities, 1947 to 2026
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
