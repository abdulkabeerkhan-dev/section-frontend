/**
 * Ambient backdrop for the chat workspace empty state.
 * Deliberately distinct from the auth page's law-library video — a calm,
 * warm animated aurora that matches the brand's amber/orange palette.
 */
export function HeroVideo() {
  return (
    <div className="pointer-events-none absolute inset-0 border-y border-border/60 bg-background" />
  );
}
