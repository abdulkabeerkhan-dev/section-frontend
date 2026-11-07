import { Children, Fragment, isValidElement, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { cn } from "@/lib/utils";
import type { CaseResult } from "@/lib/api";
import { CitationLink } from "./CitationLink";

interface MarkdownProps {
  children: string;
  className?: string;
  citations?: CaseResult[];
  /** When true, extra vertical spacing is applied to legal-memorandum section headings. */
  memorandum?: boolean;
}

const MEMORANDUM_SECTIONS = new Set([
  "short direct answer",
  "statutory framework",
  "essential ingredients from case law",
  "application to litigation",
  "executive summary legal opinion",
  "controlling statutory architecture",
  "controlling judicial precedents appellate ratio",
  "procedural strategic litigation playbook",
  "sources provenance",
]);

function textContent(node: ReactNode): string {
  if (typeof node === "string") return node;
  if (typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(textContent).join("");
  if (isValidElement(node)) {
    const props = node.props as { children?: ReactNode };
    return textContent(props.children);
  }
  return "";
}

function isMemorandumSectionHeading(children: ReactNode): boolean {
  const normalized = textContent(children)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const withoutNumber = normalized.replace(/^(?:[ivxlc]+|\d+)\s+/i, "").trim();
  return MEMORANDUM_SECTIONS.has(normalized) || MEMORANDUM_SECTIONS.has(withoutNumber);
}

/** e.g. "I. EXECUTIVE SUMMARY", "IV. LITIGATION PLAYBOOK", "2. STATUTORY MANDATE". */
function isNumberedSectionHeading(children: ReactNode): boolean {
  const raw = textContent(children).trim();
  if (!raw || raw.length > 140) return false;
  return /^(?:[IVXLC]{1,5}|\d{1,2})\s*[.)]\s+\S/.test(raw);
}

interface CitationMatcher {
  regex: RegExp;
  map: Map<string, CaseResult>;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCitationMatcher(cases: CaseResult[] | undefined): CitationMatcher | null {
  if (!cases || cases.length === 0) return null;
  const map = new Map<string, CaseResult>();
  for (const c of cases) {
    for (const raw of [c.citation, c.case_id]) {
      const key = raw?.trim();
      if (key && key.length >= 3) {
        map.set(key.toLowerCase(), c);
      }
    }
  }
  if (map.size === 0) return null;
  const keys = Array.from(map.keys())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegex);
  return { regex: new RegExp(`(${keys.join("|")})`, "gi"), map };
}

const QUOTE_RE = /[“"]([^“”"]{8,400})[”"]/g;

/** Wraps quoted statutory / judicial language so it stands out for advocates. */
function renderQuotedText(text: string, keyPrefix: string): ReactNode {
  QUOTE_RE.lastIndex = 0;
  const out: ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  let i = 0;
  while ((match = QUOTE_RE.exec(text)) !== null) {
    if (match.index > last) out.push(text.slice(last, match.index));
    out.push(
      <span
        key={`${keyPrefix}-q-${i++}`}
        className="border-b border-authority/30 font-document italic text-foreground"
      >
        &ldquo;{match[1]}&rdquo;
      </span>,
    );
    last = match.index + match[0].length;
  }
  if (last === 0) return text;
  if (last < text.length) out.push(text.slice(last));
  return (
    <>
      {out.map((n, k) => (
        <Fragment key={k}>{n}</Fragment>
      ))}
    </>
  );
}

function renderStringWithCitations(text: string, matcher: CitationMatcher): ReactNode {
  matcher.regex.lastIndex = 0;
  const out: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;
  while ((match = matcher.regex.exec(text)) !== null) {
    const start = match.index;
    const end = start + match[0].length;
    if (start > lastIndex) out.push(renderQuotedText(text.slice(lastIndex, start), `s${start}`));
    const data = matcher.map.get(match[0].toLowerCase());
    if (data) {
      out.push(<CitationLink key={`cite-${start}-${key++}`} text={match[0]} data={data} />);
    } else {
      out.push(match[0]);
    }
    lastIndex = end;
    // Guard against zero-length matches.
    if (matcher.regex.lastIndex === start) matcher.regex.lastIndex += 1;
  }
  if (lastIndex < text.length) out.push(renderQuotedText(text.slice(lastIndex), `e${lastIndex}`));
  return out.length === 1 ? (
    out[0]
  ) : (
    <>
      {out.map((n, i) => (
        <Fragment key={i}>{n}</Fragment>
      ))}
    </>
  );
}

function renderChildrenWithCitations(
  children: ReactNode,
  matcher: CitationMatcher | null,
): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") {
      return matcher ? renderStringWithCitations(child, matcher) : renderQuotedText(child, "p");
    }
    if (isValidElement(child)) {
      // Skip code/anchor children — don't munge code blocks or rewrite hyperlinks.
      const type = child.type as unknown;
      if (type === "code" || type === "a") return child;
    }
    return child;
  });
}

/**
 * True when a paragraph is entirely italic statutory text, e.g.
 * *Section 9 of the Act provides: "…"* — rendered as a quoted provision block.
 */
function isStatutoryQuoteBlock(children: ReactNode): boolean {
  const nodes = Children.toArray(children).filter(
    (c) => !(typeof c === "string" && c.trim() === ""),
  );
  if (nodes.length !== 1) return false;
  const only = nodes[0];
  if (!isValidElement(only) || only.type !== "em") return false;
  const text = textContent(only).trim();
  if (text.length < 24) return false;
  return /\b(section|sections|article|rule|order|clause|s\.|art\.)\b/i.test(text);
}

/**
 * Renders backend markdown (headings, blockquotes, GFM tables, lists, etc.)
 * into themed HTML using the app's semantic tokens. When `citations` is
 * provided, occurrences of each citation string within body text become
 * clickable inline links that open the case preview modal.
 */
export function Markdown({ children, className, citations, memorandum }: MarkdownProps) {
  const matcher = buildCitationMatcher(citations);
  const wrap = (node: ReactNode) => renderChildrenWithCitations(node, matcher);
  const sectioned = (node: ReactNode) => memorandum && isMemorandumSectionHeading(node);
  return (
    <div className={cn("amicus-markdown text-[15px] leading-7 text-foreground/90", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <h1
              className="mb-4 mt-8 font-serif text-2xl font-normal leading-snug text-foreground first:mt-0"
              {...props}
            >
              {wrap(children)}
            </h1>
          ),
          h2: ({ node, children, ...props }) => (
            <h2
               className="mb-2 mt-6 font-sans text-xl font-semibold leading-snug text-foreground first:mt-0"
              {...props}
            >
              {wrap(children)}
            </h2>
          ),
          h3: ({ node, children, ...props }) => {
            const section = sectioned(children);
            // Numbered / roman-numeral memorandum parts read as document sections,
            // not as individual case cards, so they get a formal rule instead of a gavel.
            if (section || isNumberedSectionHeading(children)) {
              const raw = textContent(children).trim();
              const parts = /^([IVXLC]+|\d+)\s*[.)]\s*(.+)$/i.exec(raw);
              return (
                <h3
                    className="mb-2 mt-6 font-sans text-lg font-semibold leading-snug text-foreground first:mt-0"
                  {...props}
                >
                  {parts ? (
                    <span className="flex items-baseline gap-3">
                       <span className="font-sans text-[11px] font-semibold text-authority">{parts[1]}.</span>
                      <span>{parts[2]}</span>
                    </span>
                  ) : (
                    wrap(children)
                  )}
                </h3>
              );
            }
            return (
              <h3
                  className="mb-2 mt-6 font-sans text-lg font-semibold leading-snug text-foreground first:mt-0"
                {...props}
              >
                {wrap(children)}
              </h3>
            );
          },
          h4: ({ node, children, ...props }) => {
            const section = sectioned(children);
            return (
              <h4
                className={cn(
                   "mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-foreground first:mt-0",
                  section ? "mt-10" : "mt-4",
                )}
                {...props}
              >
                {wrap(children)}
              </h4>
            );
          },
          p: ({ node, children, ...props }) => {
            const section = sectioned(children);
            if (isStatutoryQuoteBlock(children)) {
              return (
                <div
                  className="my-5 border-l-2 border-gold bg-muted/30 px-4 py-3 font-serif text-[15px] italic leading-7 text-foreground/90"
                  {...props}
                >
                  {wrap(children)}
                </div>
              );
            }
            return (
              <p
                className={cn(
                  "text-[15px] leading-7 first:mt-0 last:mb-0",
                   section ? "mb-3 mt-8 font-sans text-[11px] font-semibold uppercase tracking-[0.1em] text-authority" : "my-4",
                )}
                {...props}
              >
                {wrap(children)}
              </p>
            );
          },

          ul: ({ node, ...props }) => (
            <ul className="my-3 list-disc space-y-1.5 pl-5 text-[15px] leading-7" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-3 list-decimal space-y-1.5 pl-5 text-[15px] leading-7" {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li className="pl-1" {...props}>
              {wrap(children)}
            </li>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
               className="my-5 space-y-2 border-l-4 border-precedent-link bg-muted/30 py-2 pl-4 pr-3 text-[15px] italic leading-7 text-foreground/90 [&>p]:my-0"
              {...props}
            >
              {wrap(children)}
            </blockquote>
          ),
          a: ({ node, ...props }) => (
            <a
              className="text-gold underline-offset-2 transition-colors hover:underline"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          strong: ({ node, children, ...props }) => (
            <strong className="font-semibold text-foreground" {...props}>
              {wrap(children)}
            </strong>
          ),
          em: ({ node, children, ...props }) => <em {...props}>{wrap(children)}</em>,
          code: ({ node, children, ...props }) => {
            const raw = textContent(children);
            if (raw.includes("✓ Verified") || raw.includes("Verified")) {
              return (
                <span className="inline-flex items-center gap-1 rounded-sm border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-xs font-semibold text-emerald-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {children}
                </span>
              );
            }
            if (raw.includes("⚠️ Unverified") || raw.includes("Unverified")) {
              return (
                <span className="inline-flex items-center gap-1 rounded-sm border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-xs font-semibold text-amber-600">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                  {children}
                </span>
              );
            }
            return (
              <code
                className="rounded-sm bg-muted px-1.5 py-0.5 font-mono text-[13px] text-foreground"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: ({ node, ...props }) => (
            <hr className="my-7 border-0 border-t border-border/70" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto">
               <table className="w-full border-collapse border border-border text-sm [&_tbody_tr:nth-child(even)]:bg-muted/40" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="border-b border-border" {...props} />,
          th: ({ node, children, ...props }) => (
            <th
               className="border border-border bg-muted/50 px-3 py-2 text-left font-semibold text-foreground"
              {...props}
            >
              {wrap(children)}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="border border-border px-3 py-2 align-top text-foreground/85" {...props}>
              {wrap(children)}
            </td>
          ),
        }}
      >
         {children
           .replace(/^(#{1,6})(?=\S)/gm, "$1 ")
           .replace(/^(\s*(?:#{1,6}\s+|>\s*)?)[⚠✅✔❌📄⚖🔒][\uFE0E\uFE0F]?\s*/gm, "$1")}
      </ReactMarkdown>
    </div>
  );
}
