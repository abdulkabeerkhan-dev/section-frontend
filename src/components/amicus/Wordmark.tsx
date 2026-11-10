import { SectionBadge } from "./AmicusEmblem";

export function AmicusMark({
  className = "",
}: {
  className?: string;
  animate?: boolean;
}) {
  return <SectionBadge className={className} />;
}

export function Wordmark({
  className = "",
  variant = "default",
}: {
  className?: string;
  animateMark?: boolean;
  variant?: "default" | "uppercase" | "light";
}) {
  const isLight = variant === "light";
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SectionBadge
        className={isLight ? "border-[var(--ink)] text-[var(--ink)]" : "border-[var(--on-ink)] text-[var(--on-ink)]"}
      />
      <span
        className={`font-serif text-[22px] font-normal tracking-[-0.01em] leading-none ${
          isLight ? "text-[var(--text)]" : "text-[var(--on-ink)]"
        }`}
      >
        Section
      </span>
    </div>
  );
}
