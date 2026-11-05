/**
 * Presentation-level clean-up for model answers.
 *
 * The backend template can emit sections that end up empty for a given query
 * ("Legal Landscape", "Sources", "Next Steps" …), repeat the same disclaimer
 * several times, or get cut off mid-sentence when the answer runs long. None of
 * that should reach the reader, so we normalise the markdown before rendering.
 */

export interface CleanedAnswer {
  /** Markdown ready to render. */
  text: string;
  /** True when the answer appears to stop mid-sentence / mid-section. */
  truncated: boolean;
  /** Rough size signal used to pick a compact vs. full layout. */
  size: "short" | "long";
}

const CAVEAT_PATTERNS = [
  /not (?:constitute |be construed as )?legal advice/i,
  /consult (?:a |an |with )?(?:qualified |licensed )?(?:lawyer|attorney|advocate|counsel)/i,
  /for informational purposes only/i,
  /verify (?:the )?(?:citation|authorit|source)/i,
  /independent(?:ly)? (?:verify|review)/i,
];

const HEADING_RE = /^(#{1,6})\s+(.*)$/;

function isCaveat(paragraph: string): boolean {
  return CAVEAT_PATTERNS.some((re) => re.test(paragraph));
}

function fingerprint(paragraph: string): string {
  return paragraph
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Drops headings whose section body is empty (or only punctuation / "N/A"). */
function removeEmptySections(lines: string[]): string[] {
  const out: string[] = [];
  for (let i = 0; i < lines.length; i++) {
    const m = HEADING_RE.exec(lines[i].trim());
    if (!m) {
      out.push(lines[i]);
      continue;
    }
    const level = m[1].length;
    // Look ahead for real content before the next heading of same/higher level.
    let hasContent = false;
    for (let j = i + 1; j < lines.length; j++) {
      const next = HEADING_RE.exec(lines[j].trim());
      if (next && next[1].length <= level) break;
      const body = lines[j].trim();
      if (!body) continue;
      if (next) {
        // A nested heading counts only if it survives its own check later.
        hasContent = true;
        break;
      }
      if (/^(n\/?a|none|-{1,}|—|\*|•)$/i.test(body)) continue;
      hasContent = true;
      break;
    }
    if (hasContent) out.push(lines[i]);
  }
  return out;
}

/** Keeps the first caveat/disclaimer paragraph and removes later repeats. */
function dedupeParagraphs(text: string): string {
  const blocks = text.split(/\n{2,}/);
  const seen = new Set<string>();
  let caveatSeen = false;
  const kept: string[] = [];
  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;
    const fp = fingerprint(trimmed);
    if (fp && seen.has(fp)) continue;
    if (isCaveat(trimmed) && !HEADING_RE.test(trimmed)) {
      if (caveatSeen) continue;
      caveatSeen = true;
    }
    seen.add(fp);
    kept.push(trimmed);
  }
  return kept.join("\n\n");
}

function looksTruncated(text: string): boolean {
  const lines = text.split("\n").filter((l) => l.trim().length > 0);
  const last = lines[lines.length - 1]?.trim();
  if (!last) return false;
  if (HEADING_RE.test(last)) return true; // heading with nothing under it
  if (/^\|/.test(last)) return false; // table row
  if (/[.!?:;)"'”’\]]$/.test(last)) return false;
  if (/^[-*>]\s*$/.test(last)) return true;
  // A dangling line of prose with no terminal punctuation.
  return last.split(/\s+/).length > 2;
}

export function cleanAnswerMarkdown(input: string | null | undefined): CleanedAnswer {
  const raw = (input ?? "").replace(/\r\n/g, "\n").trim();
  if (!raw) return { text: "", truncated: false, size: "short" };

  let lines = raw.split("\n");
  lines = removeEmptySections(lines);
  // Second pass: parents can become empty once empty children are gone.
  lines = removeEmptySections(lines);

  let text = lines.join("\n").replace(/\n{3,}/g, "\n\n");
  text = dedupeParagraphs(text).trim();
  // Plain-text answers can carry stray markers; drop unpaired ** so the
  // reader never sees raw markdown syntax.
  text = text
    .split("\n")
    .map((line) => ((line.match(/\*\*/g)?.length ?? 0) % 2 === 1 ? line.replace(/\*\*/g, "") : line))
    .join("\n");

  const words = text.split(/\s+/).length;
  return {
    text,
    truncated: looksTruncated(text),
    size: words > 220 || /^#{1,6}\s/m.test(text) ? "long" : "short",
  };
}
