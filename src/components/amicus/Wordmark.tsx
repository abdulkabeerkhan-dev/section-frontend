import { AmicusGlyph } from "./AmicusEmblem";

export function AmicusMark({
  className = "",
  animate = false,
}: {
  className?: string;
  animate?: boolean;
}) {
  return <AmicusGlyph className={className} animate={animate} />;
}

export function Wordmark({
  className = "",
  animateMark = false,
  variant = "default",
}: {
  className?: string;
  animateMark?: boolean;
  variant?: "default" | "uppercase" | "light";
}) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <AmicusMark className="text-[26px]" animate={animateMark} />
      {variant === "uppercase" ? (
        <span
          className="font-serif text-[24px] font-normal leading-none text-sidebar-foreground"
        >
          Section
        </span>
      ) : variant === "light" ? (
        <span
          className="font-serif text-[28px] font-normal leading-none text-foreground"
        >
          Section
        </span>
      ) : (
        <span
          className="font-serif text-[24px] font-normal leading-none text-foreground"
        >
          Section
        </span>
      )}
    </div>
  );
}
