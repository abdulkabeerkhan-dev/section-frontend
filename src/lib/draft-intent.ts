/**
 * What Counsel is being asked to draft, and for which court. When either is missing, Counsel asks
 * before drafting instead of guessing. Only the advocate's own instruction is read: research
 * handed over from Jurist (after RESEARCH_MARKER) mentions petitions and courts of its own.
 */
export const RESEARCH_MARKER = "RESEARCH MEMORANDUM:";

export const DRAFT_DOCUMENTS: { label: string; pattern: RegExp }[] = [
  {
    label: "Pre-arrest bail petition (s.498 CrPC)",
    pattern: /pre[-\s]?arrest bail|bail before arrest|\b498\b/i,
  },
  {
    label: "Post-arrest bail petition (s.497 CrPC)",
    pattern: /post[-\s]?arrest bail|bail after arrest|\b497\b|bail (?:petition|application)/i,
  },
  { label: "Quashment petition (s.561-A CrPC)", pattern: /quash|561[-\s]?a/i },
  {
    label: "Writ petition (Article 199)",
    pattern: /\bwrit\b|constitutional petition|article 199/i,
  },
  {
    label: "Plaint / civil suit",
    pattern:
      /\bplaint\b|civil suit|suit for (?:declaration|recovery|specific performance|partition|possession|injunction|damages)/i,
  },
  { label: "Written statement", pattern: /written statement/i },
  { label: "Appeal", pattern: /\b(?:first |second |regular |criminal |civil )?appeal\b/i },
  { label: "Civil revision (s.115 CPC)", pattern: /\brevision\b/i },
  {
    label: "Stay / temporary injunction application",
    pattern: /\bstay\b|temporary injunction|order xxxix|interim injunction/i,
  },
  { label: "Ejectment petition (Rented Premises Act)", pattern: /eject(?:ment)?|evict(?:ion)?/i },
  {
    label: "Family suit (khula / maintenance / custody)",
    pattern: /khula|dissolution of marriage|maintenance suit|custody|guardian/i,
  },
  { label: "Execution petition", pattern: /execution petition|\bexecution\b/i },
  { label: "Legal notice", pattern: /legal notice/i },
  { label: "Affidavit", pattern: /\baffidavit\b/i },
  { label: "Vakalatnama", pattern: /vakalat/i },
];

export const COURTS: { label: string; pattern: RegExp }[] = [
  { label: "Supreme Court of Pakistan", pattern: /supreme court/i },
  { label: "Federal Constitutional Court", pattern: /federal constitutional court/i },
  { label: "High Court", pattern: /high court|\blhc\b|\bshc\b|\bphc\b|\bihc\b|\bbhc\b/i },
  {
    label: "Sessions Court",
    pattern: /sessions? (?:court|judge)|court of sessions?|additional sessions/i,
  },
  { label: "Civil Court", pattern: /civil (?:court|judge)|senior civil judge/i },
  { label: "Family Court", pattern: /family court/i },
  { label: "Rent Tribunal", pattern: /rent (?:tribunal|controller)/i },
  { label: "Banking Court", pattern: /banking court/i },
  { label: "Magistrate", pattern: /magistrate/i },
  { label: "Service Tribunal", pattern: /service tribunal/i },
];

/** The advocate's own instruction, without research handed over from Jurist. */
export function instructionPart(text: string): string {
  const i = text.indexOf(RESEARCH_MARKER);
  return i >= 0 ? text.slice(0, i) : text;
}

export function detectDocument(text: string): string | null {
  const t = instructionPart(text);
  return DRAFT_DOCUMENTS.find((d) => d.pattern.test(t))?.label ?? null;
}

export function detectCourt(text: string): string | null {
  const t = instructionPart(text);
  return COURTS.find((c) => c.pattern.test(t))?.label ?? null;
}

/** The request Counsel sends once the document and court are known. */
export function withDraftChoice(text: string, document: string, court: string): string {
  return `${text.trim()}\n\nDocument to draft: ${document}\nCourt: ${court}`;
}
