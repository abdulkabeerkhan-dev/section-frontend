/**
 * Helpers for cleaning raw scraper / citation artifacts out of case titles
 * returned by the backend before they are displayed on precedent cards.
 */

const CITATION_RE = /\b\d{4}\s+(SCMR|PLD|CLD|PCrLJ|CLC|MLD|YLR|PTD)\s+\d+\b/i;

/** Strip page numbers, embedded citations, bench/advocate names and court markers. */
export function cleanCaseTitle(rawTitle: string): string {
  if (!rawTitle) return "";

  return rawTitle
    .replace(/^\d+\s+/, "") // leading scraper/page numbers, e.g. "339 "
    .replace(new RegExp(CITATION_RE.source, "gi"), "") // redundant citation inside the title
    .replace(/\s*-\s*Honou?rable Justice.*$/i, "") // trailing bench/judge names
    .replace(/\s*-\s*Asghar Ali Gill.*$/i, "") // trailing advocate names
    .replace(/\s*SUPREME-COURT$/i, "") // trailing court markers
    .replace(/\bVS\b/gi, "v.") // standardise "VS"
    .replace(/\s{2,}/g, " ") // collapse extra spaces
    .replace(/^[\s.,;:–—-]+|[\s.,;:–—-]+$/g, "")
    .trim();
}

/**
 * Aggressive fallback cleaner for precedent-card titles.
 * Guarantees no scraper tokens, embedded citations, or trailing bench names
 * leak into the rendered case title.
 */
export function cleanTitle(title: string): string {
  if (!title) return "Title Unavailable";

  return title
    .replace(/^\d+\s+/, "")
    .replace(/\b(19\d\d|20\d\d)\s+(SCMR|PLD|CLD|PCrLJ|CLC|MLD|YLR|PTD)\s+\d+\b/gi, "")
    .replace(/\s*-\s*Honou?rable Justice.*$/i, "")
    .replace(/\s*-\s*[A-Z][a-z]+\s+[A-Z][a-z]+\s+Gill.*$/i, "")
    .replace(/\s*SUPREME-COURT.*$/i, "")
    .replace(/\bVS\b/gi, "v.")
    .replace(/\s{2,}/g, " ")
    .trim();
}

/** Pull a reporter citation (e.g. "2021 SCMR 2092") out of a raw title string. */
export function extractCitation(rawTitle: string): string {
  if (!rawTitle) return "";
  const match = rawTitle.match(CITATION_RE);
  return match ? match[0].replace(/\s{2,}/g, " ").trim() : "";
}
