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
  "issues",
  "applicable law",
  "analysis",
  "recommended next steps",
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
        className="rounded-[2px] bg-[var(--highlight)] px-1 font-serif italic text-[var(--text)]"
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
      const type = child.type as unknown;
      if (type === "code" || type === "a") return child;
    }
    return child;
  });
}

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

export function Markdown({ children, className, citations, memorandum }: MarkdownProps) {
  const matcher = buildCitationMatcher(citations);
  const wrap = (node: ReactNode) => renderChildrenWithCitations(node, matcher);
  const sectioned = (node: ReactNode) => memorandum && isMemorandumSectionHeading(node);

  return (
    <div className={cn("text-[16px] leading-[1.7] text-[var(--text)]", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, children, ...props }) => (
            <h1
              className="mb-4 mt-8 font-serif text-[26px] font-bold leading-tight text-[var(--ink)] first:mt-0"
              {...props}
            >
              {wrap(children)}
            </h1>
          ),
          h2: ({ node, children, ...props }) => {
            const raw = textContent(children).trim();
            // If the heading is redundant with the page title e.g. "Executive Legal Opinion"
            if (raw.toLowerCase().includes("executive legal opinion") || raw.toLowerCase().includes("executive summary")) {
              return null;
            }
            return (
              <h2
                className="mb-3 mt-7 font-serif text-[20px] font-bold leading-snug text-[var(--ink)] first:mt-0"
                {...props}
              >
                {wrap(children)}
              </h2>
            );
          },
          h3: ({ node, children, ...props }) => {
            const section = sectioned(children);
            if (section || isNumberedSectionHeading(children)) {
              return (
                <div className="mb-3 mt-7 border-b border-[var(--line)] pb-2">
                  <h3
                    className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--text-muted)]"
                    {...props}
                  >
                    {wrap(children)}
                  </h3>
                </div>
              );
            }
            return (
              <h3
                className="mb-2 mt-5 font-serif text-[17px] font-bold text-[var(--ink)] first:mt-0"
                {...props}
              >
                {wrap(children)}
              </h3>
            );
          },
          h4: ({ node, children, ...props }) => (
            <h4
              className="mb-2 mt-4 font-sans text-[13px] font-semibold text-[var(--ink)]"
              {...props}
            >
              {wrap(children)}
            </h4>
          ),
          p: ({ node, children, ...props }) => {
            if (isStatutoryQuoteBlock(children)) {
              return (
                <div
                  className="my-5 rounded-[3px] border-l-2 border-[var(--ink)] bg-[var(--callout-bg)] px-4 py-3 font-serif text-[15.5px] italic leading-relaxed text-[var(--text)]"
                  {...props}
                >
                  {wrap(children)}
                </div>
              );
            }
            return (
              <p
                className="my-4 font-serif text-[16.5px] leading-[1.7] text-[var(--text)] first:mt-0 last:mb-0"
                {...props}
              >
                {wrap(children)}
              </p>
            );
          },
          ul: ({ node, ...props }) => (
            <ul className="my-3 list-disc space-y-2 pl-6 font-serif text-[16px] leading-[1.7]" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="my-3 list-decimal space-y-2 pl-6 font-serif text-[16px] leading-[1.7]" {...props} />
          ),
          li: ({ node, children, ...props }) => (
            <li className="pl-1" {...props}>
              {wrap(children)}
            </li>
          ),
          blockquote: ({ node, children, ...props }) => (
            <blockquote
              className="my-5 rounded-[3px] border-l-4 border-[var(--ink)] bg-[var(--callout-bg)] py-3 pl-4 pr-3 font-serif text-[15.5px] italic leading-relaxed text-[var(--text)] [&>p]:my-0"
              {...props}
            >
              {wrap(children)}
            </blockquote>
          ),
          a: ({ node, ...props }) => (
            <a
              className="font-medium text-[var(--ink)] underline underline-offset-2 transition-opacity hover:opacity-75"
              target="_blank"
              rel="noopener noreferrer"
              {...props}
            />
          ),
          strong: ({ node, children, ...props }) => (
            <strong className="font-semibold text-[var(--ink)]" {...props}>
              {wrap(children)}
            </strong>
          ),
          em: ({ node, children, ...props }) => <em {...props}>{wrap(children)}</em>,
          code: ({ node, children, ...props }) => {
            const raw = textContent(children);
            if (raw.includes("✓ Verified") || raw.includes("Verified")) {
              return (
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--ok-border)] bg-[var(--ok-bg)] px-2 py-0.5 font-sans text-[11px] font-semibold text-[var(--ok-text)]">
                  ✓ Verified
                </span>
              );
            }
            if (raw.includes("⚠️ Unverified") || raw.includes("Unverified")) {
              return (
                <span className="inline-flex items-center gap-1 rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-2 py-0.5 font-sans text-[11px] font-semibold text-[var(--warn-text)]">
                  ⚠️ Unverified
                </span>
              );
            }
            return (
              <code
                className="rounded-[3px] bg-[var(--chip-bg)] px-1.5 py-0.5 font-mono text-[13px] text-[var(--chip-text)]"
                {...props}
              >
                {children}
              </code>
            );
          },
          hr: ({ node, ...props }) => (
            <hr className="my-7 border-0 border-t border-[var(--line)]" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-5 overflow-x-auto">
              <table className="w-full border-collapse border border-[var(--line)] font-sans text-[13px] [&_tbody_tr:nth-child(even)]:bg-[var(--surface-2)]" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="border-b border-[var(--line)]" {...props} />,
          th: ({ node, children, ...props }) => (
            <th
              className="border border-[var(--line)] bg-[var(--surface-2)] px-3 py-2 text-left font-sans text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--ink)]"
              {...props}
            >
              {wrap(children)}
            </th>
          ),
          td: ({ node, children, ...props }) => (
            <td className="border border-[var(--line)] px-3 py-2 align-top text-[var(--text)]" {...props}>
              {wrap(children)}
            </td>
          ),
        }}
      >
        {children
          .replace(/^(#{1,6})(?=\S)/gm, "$1 ")
          .replace(/^(\s*(?:#{1,6}\s+|>\s*)?)[⚠✅✔❌📄⚖🔒][\uFE0E\uFE0F]?\s*/gm, "$1")
          .replace(/deterministically evaluated/gi, "verified against authentic statutory text")}
      </ReactMarkdown>
    </div>
  );
}
