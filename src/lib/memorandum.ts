/**
 * Parses the backend's four-part legal memorandum into named sections so the
 * answer can be presented as tabs instead of one long wall of text.
 *
 * Backend headings look like:
 *   1. EXECUTIVE SUMMARY & SHORT DIRECT ANSWER:
 *   2. STATUTORY MANDATE & EXACT PROVISIONS (QUOTED IN ITALICS):
 *   3. STATUTORY & PRECEDENT ANALYSIS (EVERY KEY POINT CITED & QUOTED):
 *   4. PRACTICAL BOTTOM LINE & LITIGATION DIRECTIVES FOR ADVOCATES:
 *
 * They may arrive with or without markdown hashes/bold markers.
 */

export type MemoKey = "summary" | "statutes" | "analysis" | "strategy" | "sources";

export interface MemoSection {
  key: MemoKey;
  /** Short tab label. */
  label: string;
  /** Full heading text as written by the backend. */
  heading: string;
  /** Markdown body of the section. */
  body: string;
}

export interface ParsedMemorandum {
  /** Anything before the first recognised section heading. */
  preamble: string;
  sections: MemoSection[];
}

const MATCHERS: { key: MemoKey; label: string; re: RegExp }[] = [
  {
    key: "summary",
    label: "Executive Summary",
    re: /executive summary|short direct answer|legal opinion/i,
  },
  {
    key: "statutes",
    label: "Statutory Text",
    re: /statutory mandate|exact provisions|statutory framework|statutory architecture/i,
  },
  {
    key: "analysis",
    label: "Case Precedents",
    re: /precedent analysis|statutory & precedent|judicial precedent|appellate ratio|essential ingredients|case law analysis/i,
  },
  {
    key: "strategy",
    label: "Litigation Strategy",
    re: /bottom line|litigation directive|litigation playbook|application to litigation|procedural & strategic|practical/i,
  },
  { key: "sources", label: "Sources", re: /sources? (?:&|and) provenance|^sources$|provenance/i },
];

const ROMAN = /^([IVXLC]+)[.)]\s+(.+?):?\s*$/i;

/** Strips markdown decoration and the leading "N." from a candidate heading. */
function cleanHeading(line: string): string {
  return line
    .replace(/^#{1,6}\s*/, "")
    .replace(/\*\*/g, "")
    .replace(/^[*_`]+|[*_`]+$/g, "")
    .trim();
}

function matchSection(line: string): { key: MemoKey; label: string; heading: string } | null {
  const cleaned = cleanHeading(line);
  if (!cleaned || cleaned.length > 120) return null;
  const numbered = /^([1-9])[.)]\s+(.+?):?\s*$/.exec(cleaned) ?? ROMAN.exec(cleaned);
  const bare = /^([A-Z0-9][A-Z0-9 &(),.'"/-]{8,})\s*:?\s*$/.test(cleaned);
  if (!numbered && !bare && !/^#{1,6}\s/.test(line)) return null;
  const title = (numbered ? numbered[2] : cleaned).replace(/:$/, "").trim();
  const found = MATCHERS.find((m) => m.re.test(title));
  if (!found) return null;
  return { key: found.key, label: found.label, heading: title };
}

export function parseMemorandum(text: string): ParsedMemorandum {
  const lines = text.split("\n");
  const preamble: string[] = [];
  const sections: MemoSection[] = [];
  let current: MemoSection | null = null;
  let buffer: string[] = [];

  const flush = () => {
    if (current) {
      current.body = buffer.join("\n").trim();
      const existing = sections.find((s) => s.key === current!.key);
      if (existing) {
        // Same logical section repeated (e.g. numbered + roman variants):
        // merge the bodies instead of creating a duplicate tab.
        existing.body = [existing.body, current.body].filter(Boolean).join("\n\n");
      } else {
        sections.push(current);
      }
    }
    buffer = [];
  };

  for (const line of lines) {
    const hit = line.trim() ? matchSection(line.trim()) : null;
    const alreadySeen =
      hit && (current?.key === hit.key || sections.some((s) => s.key === hit.key));
    if (hit && !alreadySeen) {
      flush();
      current = { key: hit.key, label: hit.label, heading: hit.heading, body: "" };
    } else if (current) {
      buffer.push(line);
    } else {
      preamble.push(line);
    }
  }
  flush();

  return {
    preamble: preamble.join("\n").trim(),
    sections: sections.filter((s) => s.body.length > 0),
  };

}
