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
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <SectionBadge
        className={"border-[var(--text)] text-[var(--text)]"}
      />
      <span
        className={`font-serif text-[22px] font-normal tracking-[-0.01em] leading-none text-[var(--text)]`}
      >
        Section
      </span>
    </div>
  );
}
