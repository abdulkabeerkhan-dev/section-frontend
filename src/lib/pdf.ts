import { jsPDF } from "jspdf";

/**
 * Generate a text-based PDF (selectable, searchable) from the drafted
 * markdown-ish text and trigger a browser download. Supports headings
 * (#, ##, ###), bullets (- / *), and **bold** / *italic* inline emphasis.
 */
export async function downloadPdfFromText(
  text: string,
  fileName: string,
): Promise<void> {
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 56; // ~0.78"
  const marginTop = 64;
  const marginBottom = 64;
  const contentWidth = pageWidth - marginX * 2;

  const baseSize = 11;
  const lineGap = 4;
  let cursorY = marginTop;

  function ensureSpace(lineHeight: number) {
    if (cursorY + lineHeight > pageHeight - marginBottom) {
      doc.addPage();
      cursorY = marginTop;
    }
  }

  function setFont(style: "normal" | "bold" | "italic" | "bolditalic") {
    doc.setFont("helvetica", style);
  }

  // Split a line into [text, style] segments based on **bold** / *italic*.
  function parseInline(
    line: string,
  ): Array<{ text: string; style: "normal" | "bold" | "italic" }> {
    const segs: Array<{ text: string; style: "normal" | "bold" | "italic" }> = [];
    const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
    let last = 0;
    let m: RegExpExecArray | null;
    while ((m = regex.exec(line)) !== null) {
      if (m.index > last) segs.push({ text: line.slice(last, m.index), style: "normal" });
      if (m[2] !== undefined) segs.push({ text: m[2], style: "bold" });
      else if (m[3] !== undefined) segs.push({ text: m[3], style: "italic" });
      last = regex.lastIndex;
    }
    if (last < line.length) segs.push({ text: line.slice(last), style: "normal" });
    if (segs.length === 0) segs.push({ text: line, style: "normal" });
    return segs;
  }

  // Word-wrap a sequence of styled segments into visual lines.
  function wrapSegments(
    segs: Array<{ text: string; style: "normal" | "bold" | "italic" }>,
    maxWidth: number,
    fontSize: number,
    bold = false,
  ): Array<Array<{ text: string; style: "normal" | "bold" | "italic" }>> {
    doc.setFontSize(fontSize);
    const lines: Array<Array<{ text: string; style: "normal" | "bold" | "italic" }>> = [[]];
    let lineWidth = 0;

    for (const seg of segs) {
      const effectiveStyle = bold && seg.style === "normal" ? "bold" : seg.style;
      const words = seg.text.split(/(\s+)/);
      for (const word of words) {
        if (word === "") continue;
        setFont(effectiveStyle);
        const w = doc.getTextWidth(word);
        if (lineWidth + w > maxWidth && lineWidth > 0) {
          lines.push([]);
          lineWidth = 0;
          if (/^\s+$/.test(word)) continue;
        }
        lines[lines.length - 1].push({ text: word, style: effectiveStyle });
        lineWidth += w;
      }
    }
    return lines;
  }

  function renderLine(
    parts: Array<{ text: string; style: "normal" | "bold" | "italic" }>,
    x: number,
    y: number,
    fontSize: number,
  ) {
    doc.setFontSize(fontSize);
    let cx = x;
    for (const p of parts) {
      setFont(p.style);
      doc.text(p.text, cx, y);
      cx += doc.getTextWidth(p.text);
    }
  }

  const rawLines = text.replace(/\r\n/g, "\n").split("\n");

  for (const raw of rawLines) {
    const line = raw.trimEnd();

    if (line.trim() === "") {
      cursorY += baseSize * 0.6;
      continue;
    }

    // Heading
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const size = level === 1 ? 18 : level === 2 ? 15 : 13;
      const segs = parseInline(heading[2]);
      const wrapped = wrapSegments(segs, contentWidth, size, true);
      cursorY += size * 0.6; // top spacing
      for (const ln of wrapped) {
        ensureSpace(size + lineGap);
        renderLine(ln, marginX, cursorY + size, size);
        cursorY += size + lineGap;
      }
      cursorY += 4;
      continue;
    }

    // Bullet
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      const segs = parseInline(bullet[1]);
      const indent = 18;
      const wrapped = wrapSegments(segs, contentWidth - indent, baseSize);
      let first = true;
      for (const ln of wrapped) {
        ensureSpace(baseSize + lineGap);
        if (first) {
          setFont("normal");
          doc.setFontSize(baseSize);
          doc.text("•", marginX, cursorY + baseSize);
        }
        renderLine(ln, marginX + indent, cursorY + baseSize, baseSize);
        cursorY += baseSize + lineGap;
        first = false;
      }
      continue;
    }

    // Paragraph
    const segs = parseInline(line);
    const wrapped = wrapSegments(segs, contentWidth, baseSize);
    for (const ln of wrapped) {
      ensureSpace(baseSize + lineGap);
      renderLine(ln, marginX, cursorY + baseSize, baseSize);
      cursorY += baseSize + lineGap;
    }
    cursorY += 2;
  }

  const name = fileName.endsWith(".pdf") ? fileName : `${fileName}.pdf`;
  doc.save(name);
}
