import { Fragment, useMemo, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, ExternalLink } from "lucide-react";

import type { AnswerBrief as Brief, BriefAuthority } from "@/lib/api";
import { RESEARCH_MARKER } from "@/lib/draft-intent";
import { cn } from "@/lib/utils";

interface AnswerBriefProps {
  brief: Brief;
  /** Full answer text, handed to Counsel as research. */
  answerText: string;
  onFollowUp?: (question: string) => void;
  onOpenPdf?: (url: string, citation: string) => void;
}

const label =
  "font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-[var(--text-muted)]";
const card = "rounded-[8px] border border-[var(--line)] bg-[var(--surface)]";

/** Answer as a brief: key facts, short answer, points, checklist, and an authorities panel. */
export function AnswerBrief({ brief, answerText, onFollowUp, onOpenPdf }: AnswerBriefProps) {
  const cases = brief.authorities.filter((a) => a.kind === "case");
  const statutes = brief.authorities.filter((a) => a.kind === "statute");
  const [tab, setTab] = useState<"case" | "statute">(cases.length ? "case" : "statute");
  const [selected, setSelected] = useState<number | null>(null);
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [done, setDone] = useState<Record<number, boolean>>({});
  const byN = useMemo(() => new Map(brief.authorities.map((a) => [a.n, a])), [brief.authorities]);

  function pick(n: number) {
    const a = byN.get(n);
    if (!a) return;
    setSelected(n);
    setTab(a.kind);
    requestAnimationFrame(() =>
      document
        .getElementById(`authority-${n}`)
        ?.scrollIntoView({ behavior: "smooth", block: "nearest" }),
    );
  }

  function Cite({ n }: { n: number }) {
    if (!byN.has(n)) return null;
    const on = selected === n;
    return (
      <button
        type="button"
        onClick={() => pick(n)}
        aria-label={`Source ${n}`}
        className={cn(
          "mx-[2px] inline-grid h-[22px] min-w-[22px] place-items-center rounded-[5px] border px-[5px] align-[2px] font-sans text-[12px] font-semibold transition-colors",
          on
            ? "border-[var(--ink)] bg-[var(--ink)] text-[var(--on-ink)]"
            : "border-[var(--line)] bg-[var(--chip-bg)] text-[var(--ink)] hover:border-[var(--ink)]",
        )}
      >
        {n}
      </button>
    );
  }

  /** Text with [n] markers turned into source buttons. */
  function withCites(text: string): ReactNode {
    const parts = text.split(/(\[\d+\])/g);
    return parts.map((p, i) => {
      const m = /^\[(\d+)\]$/.exec(p);
      return m ? <Cite key={i} n={Number(m[1])} /> : <Fragment key={i}>{p}</Fragment>;
    });
  }

  const doneCount = brief.checklist.filter((_, i) => done[i]).length;
  const counselHref = () => {
    try {
      const prompt = `Prepare the court document for this matter using the research below.\n\n${RESEARCH_MARKER}\n${answerText.trim()}`;
      sessionStorage.setItem("section_counsel_handoff", JSON.stringify({ prompt }));
    } catch {
      // storage blocked: Counsel opens empty
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {brief.key_facts.length > 0 && (
        <div
          className="grid gap-3"
          style={{ gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))" }}
        >
          {brief.key_facts.map((f, i) => (
            <div
              key={i}
              className="rounded-[8px] border border-[var(--line)] bg-[var(--surface-2)] px-4 py-3"
            >
              <div className={label}>{f.label}</div>
              <div className="mt-0.5 font-serif text-[18px] font-semibold leading-snug text-[var(--ink)]">
                {f.value}
              </div>
              {f.sources.length > 0 && (
                <div className="mt-1">
                  {f.sources.map((n) => (
                    <Cite key={n} n={n} />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="flex flex-col gap-7 min-[1100px]:flex-row min-[1100px]:items-start">
        <div className="flex min-w-0 flex-col gap-5" style={{ flex: "999 1 560px" }}>
          <section className={cn(card, "px-6 py-5")}>
            <h3 className={cn(label, "mb-2")}>Short answer</h3>
            <p className="m-0 font-serif text-[19px] leading-[1.6] text-[var(--text)]">
              {withCites(brief.summary)}
            </p>
          </section>

          {brief.points.length > 0 && (
            <section className={cn(card, "px-6 py-5")}>
              <h3 className={cn(label, "mb-3")}>How the law applies</h3>
              <ol className="m-0 flex list-none flex-col gap-4 p-0">
                {brief.points.map((pt, i) => (
                  <li key={i} className="flex gap-3.5">
                    <span className="grid h-7 w-7 flex-none place-items-center rounded-full bg-[var(--ink)] font-sans text-[13px] font-semibold text-[var(--on-ink)]">
                      {i + 1}
                    </span>
                    <div className="min-w-0">
                      {pt.heading && (
                        <div className="font-sans font-semibold text-[var(--ink)]">
                          {pt.heading}
                        </div>
                      )}
                      <div className="text-[15px] leading-relaxed text-[var(--text)]">
                        {withCites(pt.text)}
                        {pt.sources
                          .filter((n) => !pt.text.includes(`[${n}]`))
                          .map((n) => (
                            <Cite key={n} n={n} />
                          ))}
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {brief.checklist.length > 0 && (
            <section className={cn(card, "px-6 py-5")}>
              <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className={label}>Before you proceed</h3>
                <span className="font-sans text-[13px] text-[var(--text-muted)]">
                  {doneCount} of {brief.checklist.length} done
                </span>
              </div>
              <div className="flex flex-col gap-1.5">
                {brief.checklist.map((q, i) => (
                  <label
                    key={i}
                    className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[6px] bg-[var(--surface-2)] px-3 py-2.5"
                  >
                    <input
                      type="checkbox"
                      checked={!!done[i]}
                      onChange={() => setDone((d) => ({ ...d, [i]: !d[i] }))}
                      className="mt-1 h-[18px] w-[18px] accent-[var(--ink)]"
                    />
                    <span
                      className={cn(
                        "text-[15px]",
                        done[i] ? "text-[var(--text-muted)] line-through" : "text-[var(--text)]",
                      )}
                    >
                      {q}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          )}

          {(brief.verify.length > 0 || brief.gaps.length > 0) && (
            <section className={cn(card, "px-6 py-5")}>
              {brief.verify.length > 0 && (
                <>
                  <h3 className={cn(label, "mb-2")}>Points to verify</h3>
                  <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] text-[var(--text)]">
                    {brief.verify.map((v, i) => (
                      <li key={i}>{withCites(v)}</li>
                    ))}
                  </ul>
                </>
              )}
              {brief.gaps.length > 0 && (
                <>
                  <h3 className={cn(label, "mb-2", brief.verify.length > 0 && "mt-4")}>
                    Not covered by the sources found
                  </h3>
                  <ul className="m-0 flex flex-col gap-1.5 pl-5 text-[15px] text-[var(--text-muted)]">
                    {brief.gaps.map((g, i) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </>
              )}
            </section>
          )}

          <section className="flex flex-col gap-2.5">
            <h3 className={label}>Next</h3>
            <div className="flex flex-wrap gap-2">
              <Link
                to="/assistants/mike"
                onClick={counselHref}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-full bg-[var(--ink)] px-4 font-sans text-[14px] font-semibold text-[var(--on-ink)] no-underline"
              >
                Draft with Counsel <ArrowRight className="h-4 w-4" />
              </Link>
              {brief.follow_ups.map((q, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => onFollowUp?.(q)}
                  className="inline-flex min-h-[44px] items-center rounded-full border border-[var(--line)] bg-[var(--surface)] px-4 text-left font-sans text-[14px] text-[var(--ink)] hover:border-[var(--ink)]"
                >
                  {q}
                </button>
              ))}
            </div>
          </section>
        </div>

        {brief.authorities.length > 0 && (
          <aside
            aria-label="Authorities"
            className="flex min-w-0 flex-col gap-3 min-[1100px]:sticky min-[1100px]:top-4 min-[1100px]:max-h-[calc(100vh-2rem)] min-[1100px]:overflow-y-auto"
            style={{ flex: "1 1 360px", maxWidth: 460 }}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="m-0 font-serif text-[20px] font-semibold text-[var(--ink)]">
                Authorities
              </h3>
              <span className="font-sans text-[12px] text-[var(--text-muted)]">
                Click a number in the answer
              </span>
            </div>
            <div role="tablist" className="flex gap-1 rounded-[8px] bg-[var(--chip-bg)] p-1">
              {(
                [
                  ["case", `Judgments · ${cases.length}`],
                  ["statute", `Statutes · ${statutes.length}`],
                ] as const
              ).map(([k, text]) => (
                <button
                  key={k}
                  type="button"
                  role="tab"
                  aria-selected={tab === k}
                  onClick={() => setTab(k)}
                  className={cn(
                    "min-h-[40px] flex-1 rounded-[6px] font-sans text-[13px] font-semibold",
                    tab === k
                      ? "bg-[var(--surface)] text-[var(--ink)] shadow-sm"
                      : "text-[var(--text-muted)]",
                  )}
                >
                  {text}
                </button>
              ))}
            </div>
            {(tab === "case" ? cases : statutes).map((a) => (
              <AuthorityCard
                key={a.n}
                a={a}
                selected={selected === a.n}
                open={!!open[a.n]}
                onToggle={() => {
                  setSelected(a.n);
                  setOpen((o) => ({ ...o, [a.n]: !o[a.n] }));
                }}
                onOpenPdf={onOpenPdf}
              />
            ))}
            {(tab === "case" ? cases : statutes).length === 0 && (
              <p className="font-sans text-[13px] text-[var(--text-muted)]">
                {tab === "case"
                  ? "No judgment was relied on for this answer."
                  : "No statute was relied on for this answer."}
              </p>
            )}
          </aside>
        )}
      </div>
    </div>
  );
}

function AuthorityCard({
  a,
  selected,
  open,
  onToggle,
  onOpenPdf,
}: {
  a: BriefAuthority;
  selected: boolean;
  open: boolean;
  onToggle: () => void;
  onOpenPdf?: (url: string, citation: string) => void;
}) {
  const sub =
    "mt-3 font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-muted)]";
  return (
    <article
      id={`authority-${a.n}`}
      className={cn(
        "rounded-[10px] bg-[var(--surface)] px-4 py-4 transition-shadow",
        selected ? "border-2 border-[var(--ink)] shadow-md" : "border border-[var(--line)]",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {a.kind === "case" ? (
            <>
              <div className="font-mono text-[14px] font-medium text-[var(--ink)]">
                {a.citation}
              </div>
              {a.title && <div className="text-[13px] text-[var(--text)]">{a.title}</div>}
              <div className="text-[12px] text-[var(--text-muted)]">
                {[a.court, a.year].filter(Boolean).join(" · ")}
              </div>
            </>
          ) : (
            <>
              <div className="font-sans font-semibold text-[var(--ink)]">
                {a.label}
                {a.heading ? ` · ${a.heading}` : ""}
              </div>
              <div className="text-[12px] text-[var(--text-muted)]">{a.act}</div>
            </>
          )}
        </div>
        <span className="grid h-[26px] min-w-[26px] flex-none place-items-center rounded-[6px] bg-[var(--chip-bg)] font-sans text-[12px] font-semibold text-[var(--ink)]">
          {a.n}
        </span>
      </div>

      {a.kind === "case" ? (
        <>
          {a.relevant_part && (
            <>
              <div className={sub}>Relevant part of the judgment</div>
              <blockquote className="mx-0 mb-0 mt-1 rounded-[6px] bg-[#FFF7D6] px-3 py-2 font-serif text-[15px] leading-normal text-[#3A3320] dark:bg-[#3A3420] dark:text-[#F3E9C6]">
                “{a.relevant_part}”
              </blockquote>
            </>
          )}
          {a.why && (
            <>
              <div className={sub}>Why it matters for you</div>
              <p className="m-0 mt-0.5 text-[14px] text-[var(--text)]">{a.why}</p>
            </>
          )}
          {open && a.held && (
            <>
              <div className={sub}>What the court held</div>
              <p className="m-0 mt-0.5 text-[13px] text-[var(--text)]">{a.held}</p>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {a.held && (
              <button
                type="button"
                onClick={onToggle}
                className="min-h-[36px] rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 font-sans text-[13px] text-[var(--ink)]"
              >
                {open ? "Hide holding" : "What the court held"}
              </button>
            )}
            {a.pdf_url && (
              <button
                type="button"
                onClick={() => onOpenPdf?.(a.pdf_url, a.citation)}
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-[6px] px-3 font-sans text-[13px] text-[var(--ink)] underline-offset-4 hover:underline"
              >
                Open judgment <ExternalLink className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          {(a.period || a.trigger) && (
            <div className="mt-2 text-[13px] text-[var(--text)]">
              {a.period && (
                <div>
                  Limitation: <strong>{a.period}</strong>
                </div>
              )}
              {a.trigger && <div>Time runs from: {a.trigger}</div>}
            </div>
          )}
          {a.text && (
            <p
              className={cn(
                "mb-0 mt-2 whitespace-pre-line rounded-[6px] border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2.5 font-serif text-[15px] leading-relaxed text-[var(--text)]",
                !open && "line-clamp-4",
              )}
            >
              {a.text}
            </p>
          )}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
            {a.text.length > 260 && (
              <button
                type="button"
                onClick={onToggle}
                className="min-h-[36px] rounded-[6px] border border-[var(--line)] bg-[var(--surface)] px-3 font-sans text-[13px] text-[var(--ink)]"
              >
                {open ? "Show less" : "Full text"}
              </button>
            )}
            <span className="font-sans text-[12px] text-[var(--text-muted)]">
              {a.verified ? "Verified official text" : "Pakistan Code text · verify before filing"}
            </span>
          </div>
        </>
      )}
    </article>
  );
}
