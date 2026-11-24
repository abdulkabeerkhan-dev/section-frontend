import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Moon, Sun } from "lucide-react";
import marble from "@/assets/section-marble.jpg";
import { ChatDemo } from "@/components/site/ChatDemo";
import { FeatureScreen } from "@/components/site/FeatureScreen";
import { useAuth } from "@clerk/clerk-react";
import { useTheme } from "@/lib/theme";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Section, Pakistani Law Answered With Authority" },
      { name: "description", content: "AI research and drafting for advocates, chambers and legal teams across Pakistan." },
      { property: "og:title", content: "Section, Pakistani Law Answered With Authority" },
      { property: "og:description", content: "AI research and drafting for advocates, chambers and legal teams across Pakistan." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const features = [
  { name: "Jurist", body: "Ask complex legal questions and get precise answers with every authority cited." },
  { name: "Counsel", body: "Draft petitions, notices and replies built on your research." },
  { name: "Judgment Search", body: "Find judgments by issue, court, bench or year." },
  { name: "Statute Search", body: "Federal and provincial law, section by section." },
  { name: "Summaries", body: "Facts, issues, holding and ratio of any judgment on one page." },
];

function Index() {
  const [active, setActive] = useState(0);
  const { isLoaded, isSignedIn } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const dark = theme === "dark";
  const current = features[active] ?? features[0]!;

  return (
    <main className="site bg-background text-foreground">
      <section className="relative min-h-screen overflow-hidden">
        <nav className="relative z-30 mx-auto flex max-w-7xl items-center justify-between px-6 py-6 text-[15px] font-medium">
          <div className="flex items-center gap-8">
            <span className="font-serif text-2xl text-foreground">§</span>
            <a href="#product" className="link hidden sm:inline">Product</a>
            <a href="#security" className="link hidden sm:inline">Security</a>
            <a href="#pricing" className="link hidden sm:inline">Pricing</a>
          </div>
          <div className="flex items-center gap-5">
            <button
              onClick={toggleTheme}
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              className="grid size-9 place-items-center rounded border border-input bg-background text-foreground transition-colors hover:bg-accent"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            {isLoaded && isSignedIn ? (
              <Link to="/app" className="btn-primary">Open workspace</Link>
            ) : (
              <>
                <Link to="/auth" className="link">Sign in</Link>
                <Link to="/auth" className="btn-primary">Get started</Link>
              </>
            )}
          </div>
        </nav>

        <h1 className="hero-word anim-rise pointer-events-none absolute inset-x-0 top-[14vh] z-0 select-none text-center font-display text-[22vw] font-black leading-none tracking-tighter">
          SECTION
        </h1>

        <img
          src={marble}
          alt="Marble sculpture of the section symbol"
          width={1024}
          height={1280}
          className="fade-edges anim-float relative z-10 mx-auto -mt-6 h-[88vh] w-auto object-contain invert mix-blend-darken dark:invert-0 dark:mix-blend-lighten"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-[50vh] bg-gradient-to-t from-background via-background/85 to-transparent" />

        <div className="anim-fade-up absolute inset-x-0 bottom-12 z-20 mx-auto flex max-w-3xl flex-col items-center gap-4 px-6 text-center [animation-delay:.8s]">
          <p className="font-condensed text-2xl uppercase tracking-wide md:text-3xl">Pakistani law. Answered with authority.</p>
          <p className="body-copy">AI research and drafting for advocates, chambers and legal teams across Pakistan.</p>
          <Link to="/auth" className="btn-primary mt-2">Get started</Link>
        </div>
      </section>

      <section id="product" className="section-pad">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 pb-16 md:grid-cols-2 md:items-end">
          <h2 className="h-section">Research at the speed of <em>a question.</em></h2>
          <div className="md:max-w-sm md:justify-self-end">
            <p className="body-copy">Section reads Pakistani case law and statutes from 1947 to today, then turns what it finds into drafts you can file.</p>
            <Link to="/auth" className="btn-primary mt-6">Get started</Link>
          </div>
        </div>
        <div className="mx-auto max-w-7xl px-6"><ChatDemo /></div>
      </section>

      <section className="section-pad border-t border-border">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="h-section text-center">Two agents. <em>One matter.</em></h2>
          <p className="body-copy mx-auto mt-6 max-w-xl text-center">Jurist does the reading. Counsel does the writing. Both work inside the same matter.</p>
          <div className="mt-16 grid gap-4 md:grid-cols-2">
            {[["Jurist, the researcher", "Ask in plain language. Get an answer with every authority it relied on."], ["Counsel, the drafter", "Give it the facts, forum and relief. Get a petition, notice or reply in the form the court expects."]].map(([t, b]) => (
              <div key={t} className="flex min-h-72 flex-col justify-end rounded-lg border border-border bg-card p-8">
                <h3 className="h-card">{t}</h3>
                <p className="body-copy mt-3 max-w-sm">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad border-t border-border">
        <div className="mx-auto max-w-7xl px-6">
          <h2 className="h-section">Built for <em>how you practise.</em></h2>
          <div className="mt-16 grid gap-4 md:grid-cols-3">
            {[["Advocates", "Research at night without a library or a junior."], ["Chambers and firms", "Shared matters and consistent drafts across your team."], ["In-house teams", "Clear answers on Pakistani law before you brief outside counsel."]].map(([t, b]) => (
              <div key={t} className="rounded-lg border border-border bg-card p-8">
                <h3 className="h-card">{t}</h3>
                <p className="body-copy mt-3">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-pad border-t border-border">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 md:grid-cols-[1fr_1.4fr]">
          <div>
            <h2 className="h-section">Everything <em>a matter needs.</em></h2>
            <div className="mt-12" role="tablist">
              {features.map((f, i) => (
                <button key={f.name} role="tab" aria-selected={active === i} onClick={() => setActive(i)} className="block w-full border-t border-border py-4 text-left">
                  <span className={`text-[15px] font-medium ${active === i ? "text-foreground" : "text-muted-foreground"}`}>{f.name}</span>
                  {active === i && <p className="body-copy mt-2">{f.body}</p>}
                </button>
              ))}
            </div>
          </div>
          <FeatureScreen name={current.name} />
        </div>
      </section>

      <section id="pricing" className="section-pad border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col items-start gap-10 px-6">
          <h2 className="h-statement">Bring Section to <em>your practice.</em></h2>
          <Link to="/auth" className="btn-primary">Get started</Link>
        </div>
      </section>

      <footer id="security" className="border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col justify-between gap-10 md:flex-row md:items-end">
            <div className="max-w-md">
              <p className="font-serif text-3xl leading-tight md:text-4xl">Privileged <em>stays privileged.</em></p>
              <p className="body-copy mt-4">Your matters belong to you. Client information is never used to train models, and you can delete a matter at any time.</p>
            </div>
            <div className="flex gap-6 text-[15px]">
              <a href="mailto:hello@section.pk" className="link">Privacy</a>
              <a href="mailto:hello@section.pk" className="link">Terms</a>
              <a href="mailto:hello@section.pk" className="link">Contact</a>
            </div>
          </div>
          <div className="mt-16 flex flex-col justify-between gap-6 border-t border-border pt-10 md:flex-row md:items-end">
            <span className="font-display text-7xl font-black tracking-tighter md:text-9xl">SECTION</span>
            <p className="text-sm text-muted-foreground md:text-right">© 2026 Section.<br />Review all generated work before filing or relying on it.</p>
          </div>
        </div>
      </footer>
    </main>
  );
}
