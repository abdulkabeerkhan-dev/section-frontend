import {
  AlignmentType,
  Document,
  HeadingLevel,
  Packer,
  Paragraph,
  TextRun,
} from "docx";

/**
 * Parses a single line of lightweight markdown into docx TextRuns,
 * supporting **bold** and *italic* inline emphasis.
 */
function parseInline(line: string): TextRun[] {
  const runs: TextRun[] = [];
  const regex = /(\*\*([^*]+)\*\*|\*([^*]+)\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(line)) !== null) {
    if (match.index > lastIndex) {
      runs.push(new TextRun({ text: line.slice(lastIndex, match.index) }));
    }
    if (match[2] !== undefined) {
      runs.push(new TextRun({ text: match[2], bold: true }));
    } else if (match[3] !== undefined) {
      runs.push(new TextRun({ text: match[3], italics: true }));
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < line.length) {
    runs.push(new TextRun({ text: line.slice(lastIndex) }));
  }

  if (runs.length === 0) {
    runs.push(new TextRun({ text: "" }));
  }

  return runs;
}

function buildParagraphs(text: string): Paragraph[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  return lines.map((raw) => {
    const line = raw.trimEnd();

    // Headings (#, ##, ###)
    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level =
        heading[1].length === 1
          ? HeadingLevel.HEADING_1
          : heading[1].length === 2
            ? HeadingLevel.HEADING_2
            : HeadingLevel.HEADING_3;
      return new Paragraph({
        heading: level,
        spacing: { before: 240, after: 120 },
        children: parseInline(heading[2]),
      });
    }

    // Bullet list items
    const bullet = /^\s*[-*]\s+(.*)$/.exec(line);
    if (bullet) {
      return new Paragraph({
        bullet: { level: 0 },
        spacing: { after: 80 },
        children: parseInline(bullet[1]),
      });
    }

    // Blank line
    if (line.trim() === "") {
      return new Paragraph({ children: [new TextRun({ text: "" })] });
    }

    return new Paragraph({
      alignment: AlignmentType.JUSTIFIED,
      spacing: { after: 120, line: 312 },
      children: parseInline(line),
    });
  });
}

/**
 * Generates a .docx file from drafted text entirely in the browser and
 * triggers a download — no backend endpoint required.
 */
export async function downloadDocxFromText(
  text: string,
  fileName: string,
): Promise<void> {
  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: "Calibri", size: 22 } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
          },
        },
        children: buildParagraphs(text),
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName.endsWith(".docx") ? fileName : `${fileName}.docx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
