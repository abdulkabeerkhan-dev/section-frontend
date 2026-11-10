/**
 * Section Emblem: 34px square with 1px --on-ink border, "§" inside, Source Serif font.
 */

export function SectionBadge({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[3px] border border-[var(--on-ink)] bg-transparent text-[20px] font-serif font-normal leading-none text-[var(--on-ink)] select-none ${className}`}
    >
      §
    </div>
  );
}

/** Standalone § mark backward compatible export */
export function AmicusEmblem({ className = "" }: { className?: string }) {
  return <SectionBadge className={className} />;
}

export function AmicusGlyph({ className = "", animate = false }: { className?: string; animate?: boolean }) {
  return <SectionBadge className={className} />;
}
