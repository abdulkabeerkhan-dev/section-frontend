import { BookOpen, FileText, Gavel, PenLine, Scale } from "lucide-react";

/** Small, static app screens shown next to each feature tab on the homepage. */
export function FeatureScreen({ name }: { name: string }) {
  return (
    <div className="h-full rounded-lg border border-border bg-card p-6 text-sm md:p-8">
      <div className="mb-6 flex items-center gap-2 text-muted-foreground">
        {icon(name)} <span className="label-caps">{name}</span>
      </div>
      {name === "Jurist" && (
        <div className="space-y-4">
          <p className="ml-auto max-w-xs rounded-lg bg-primary px-4 py-3 text-primary-foreground">Can a tenant be ejected for default in rent under the Punjab Rented Premises Act 2009?</p>
          <p className="label-caps">Jurist</p>
          <p className="leading-relaxed">Yes. Section 15 allows the Rent Tribunal to order ejectment where the tenant fails to pay rent within the time agreed. The Tribunal must first be satisfied the default is established.</p>
          <div className="flex flex-wrap gap-2"><span className="chip">Section 15, PRPA 2009</span><span className="chip">2016 SCMR 1</span></div>
        </div>
      )}
      {name === "Counsel" && (
        <div className="rounded border border-border bg-background p-6 font-serif">
          <p className="text-center text-sm uppercase tracking-wide">In the Court of the Rent Controller, Lahore</p>
          <p className="mt-3 text-center text-xl italic">Ejectment Petition under Section 15</p>
          <p className="mt-4 text-base leading-relaxed text-muted-foreground">1. That the Petitioner is the owner of the premises situated at ... and the Respondent is a tenant at a monthly rent of ...</p>
        </div>
      )}
      {name === "Judgment Search" && (
        <ul className="divide-y divide-border">
          {[["PLD 2019 SC 675", "Supreme Court, 3 member bench"], ["2023 SCMR 1012", "Supreme Court"], ["2021 YLR 388", "Lahore High Court"]].map(([c, b]) => (
            <li key={c} className="flex justify-between py-3"><span>{c}</span><span className="text-muted-foreground">{b}</span></li>
          ))}
        </ul>
      )}
      {name === "Statute Search" && (
        <div className="space-y-3">
          <p className="font-serif text-2xl">Code of Criminal Procedure, 1898</p>
          <p className="label-caps">Section 498</p>
          <p className="rounded bg-secondary p-4 leading-relaxed">Power to direct admission to bail or reduction of bail. The amount of every bond executed under this Chapter shall be fixed with due regard to the circumstances of the case.</p>
        </div>
      )}
      {name === "Summaries" && (
        <dl className="space-y-3">
          {[["Facts", "Cheque issued as security for a business deal was dishonoured."], ["Issues", "Whether Section 489-F applies to a security cheque."], ["Holding", "Not ordinarily, absent an existing obligation."], ["Ratio", "Dishonesty and an existing liability are both required."]].map(([k, v]) => (
            <div key={k}><dt className="label-caps">{k}</dt><dd className="mt-1">{v}</dd></div>
          ))}
        </dl>
      )}
    </div>
  );
}

function icon(name: string) {
  const c = "size-4";
  if (name === "Jurist") return <Scale className={c} />;
  if (name === "Counsel") return <PenLine className={c} />;
  if (name === "Judgment Search") return <Gavel className={c} />;
  if (name === "Statute Search") return <BookOpen className={c} />;
  return <FileText className={c} />;
}
