/**
 * SectionEmblem — the Section identity mark.
 * A standalone § (section sign) set in the brand's editorial serif.
 *
 * Export names are kept as Amicus* for backwards-compatibility with existing imports.
 */

function EmblemSvg({ animated }: { animated: boolean }) {
  return (
    <svg
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="h-full w-full"
    >
      <defs>
        <linearGradient id="amicus-blade" x1="50" y1="18" x2="50" y2="82">
          <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.85" />
          <stop offset="50%" stopColor="var(--primary)" />
          <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.75" />
        </linearGradient>
      </defs>

      {/* the section sign — set in the same editorial serif as the Section wordmark */}
      <text
        x="50"
        y="51"
        textAnchor="middle"
        dominantBaseline="central"
        fontFamily="'Source Serif 4', Georgia, 'Times New Roman', serif"
        fontWeight="400"
        fontSize="66"
        fill="url(#amicus-blade)"
      >
        §
      </text>

    </svg>
  );
}

/** Large animated mark for the landing page. Size with h-/w- classes. */
export function AmicusEmblem({ className = "" }: { className?: string }) {
  return (
    <span aria-hidden className={`amicus-emblem inline-flex ${className}`}>
      <EmblemSvg animated />
    </span>
  );
}

/** Inline glyph that scales with font-size — used inside the wordmark. */
export function AmicusGlyph({
  className = "",
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return (
    <span
      aria-hidden
      className={`inline-flex ${animate ? "amicus-emblem" : ""} ${className}`}
      style={{ width: "1.05em", height: "1.05em" }}
    >
      <EmblemSvg animated={animate} />
    </span>
  );
}
