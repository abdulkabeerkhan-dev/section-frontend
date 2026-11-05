import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  ChevronDown,
  LogOut,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from "lucide-react";

import {
  createAssociate,
  deleteAssociate,
  listAllActivity,
  listAssociates,
  listAssociatesUsage,
  setAssociateStatus,
  type AdminActivityRow,
  type UsageRow,
} from "@/lib/admin.functions";
import { useLogout } from "@/lib/useMe";
import { cn } from "@/lib/utils";
import { Wordmark } from "../Wordmark";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Tab = "associates" | "usage" | "activity";

export function AdminDashboard() {
  const [tab, setTab] = useState<Tab>("associates");
  const logout = useLogout();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <div className="flex items-center gap-5">
            <Wordmark className="[&_*]:text-[22px]" />
            <span className="hidden text-[13px] font-medium uppercase tracking-[0.16em] text-gold sm:inline">
              Admin
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/app"
              className="rounded-md border border-border px-3.5 py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              Workspace
            </Link>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 rounded-md px-3 py-2 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-8 sm:px-8">
        <h1 className="font-sans text-4xl font-semibold text-foreground">Admin Dashboard</h1>

        <div className="mt-6 flex gap-6 border-b border-border">
          {(["associates", "usage", "activity"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={cn(
                "relative pb-3 text-[13px] font-medium tracking-[0.01em] capitalize transition-colors",
                tab === t
                  ? "text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-gold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t === "associates" ? "Associates" : t === "usage" ? "Usage" : "Activity Log"}
            </button>
          ))}
        </div>

        <div className="mt-7">
          {tab === "associates" ? <AssociatesTab /> : tab === "usage" ? <UsageTab /> : <ActivityLogTab />}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------- Associates ------------------------------- */

function AssociatesTab() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);

  const {
    data: associates,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ["associates"],
    queryFn: () => listAssociates(),
    retry: 1,
  });


  const statusMutation = useMutation({
    mutationFn: (vars: { id: string; status: "active" | "inactive" }) =>
      setAssociateStatus({ data: vars }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["associates"] });
      toast.success("Account updated.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Update failed."),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteAssociate({ data: { id } }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["associates"] });
      toast.success("Account deleted.");
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Delete failed."),
  });

  return (
    <div>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {associates ? `${associates.length} associate${associates.length === 1 ? "" : "s"}` : "\u00A0"}
        </p>
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className="flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" />
          Add Associate
        </button>
      </div>

      <div className="mt-4 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Name</th>
              <th className="px-4 py-3 font-medium">Email</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">Last active</th>
              <th className="px-4 py-3 font-medium">Queries</th>
              <th className="px-4 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center">
                  <p className="text-sm text-foreground">The associate list could not be loaded.</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {error instanceof Error ? error.message : "Unknown error"}
                  </p>
                  <button
                    type="button"
                    onClick={() => refetch()}
                    className="mt-3 rounded-md border border-border px-3 py-1.5 text-xs font-medium"
                  >
                    Try again
                  </button>
                </td>
              </tr>
            ) : associates && associates.length > 0 ? (

              associates.map((a) => (
                <tr key={a.id} className="border-b border-border/60 last:border-0">
                  <td className="px-4 py-3 font-medium text-foreground">{a.fullName || "Not set"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{a.email}</td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-medium",
                        a.status === "active"
                          ? "bg-success/15 text-success"
                          : "bg-destructive/15 text-destructive",
                      )}
                    >
                      <span
                        className={cn(
                          "h-1.5 w-1.5 rounded-full",
                          a.status === "active" ? "bg-success" : "bg-destructive",
                        )}
                      />
                      {a.status === "active" ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {a.lastActiveAt ? format(new Date(a.lastActiveAt), "dd MMM yyyy, HH:mm") : "Never"}
                  </td>
                  <td className="px-4 py-3 text-foreground">{a.totalQueries}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        type="button"
                        title={a.status === "active" ? "Deactivate" : "Activate"}
                        onClick={() =>
                          statusMutation.mutate({
                            id: a.id,
                            status: a.status === "active" ? "inactive" : "active",
                          })
                        }
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                      >
                        {a.status === "active" ? (
                          <UserX className="h-4 w-4" />
                        ) : (
                          <UserCheck className="h-4 w-4" />
                        )}
                      </button>
                      <button
                        type="button"
                        title="Delete"
                        onClick={() => {
                          if (confirm(`Delete ${a.fullName || a.email}? This cannot be undone.`)) {
                            deleteMutation.mutate(a.id);
                          }
                        }}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No associates yet. Add your first one.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <AddAssociateModal
        open={addOpen}
        onOpenChange={setAddOpen}
        onCreated={() => queryClient.invalidateQueries({ queryKey: ["associates"] })}
      />
    </div>
  );
}

const inputClass =
  "mt-1.5 h-10 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none";

function AddAssociateModal({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({ fullName: "", email: "", password: "" });

  const mutation = useMutation({
    mutationFn: () => createAssociate({ data: form }),
    onSuccess: () => {
      toast.success("Associate account created.");
      onCreated();
      onOpenChange(false);
      setForm({ fullName: "", email: "", password: "" });
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Could not create account."),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="font-sans text-3xl">Add Associate</DialogTitle>
          <DialogDescription>
            Create a new associate account. They sign in with this email and password.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
          className="mt-2 space-y-4"
        >
          <div>
            <label className="text-[13px] font-medium text-foreground">Full name</label>
            <input
              required
              value={form.fullName}
              onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))}
              className={inputClass}
              placeholder="Ayesha Khan"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground">Email</label>
            <input
              required
              type="email"
              value={form.email}
              onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              className={inputClass}
              placeholder="ayesha@firm.com"
            />
          </div>
          <div>
            <label className="text-[13px] font-medium text-foreground">Password</label>
            <input
              required
              type="text"
              minLength={8}
              value={form.password}
              onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
              className={inputClass}
              placeholder="At least 8 characters"
            />
          </div>
          <button
            type="submit"
            disabled={mutation.isPending}
            className="w-full rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {mutation.isPending ? "Creating…" : "Create account"}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------ Activity Log ------------------------------ */

function ActivityLogTab() {
  const [associateId, setAssociateId] = useState<string>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const { data: associates } = useQuery({
    queryKey: ["associates"],
    queryFn: () => listAssociates(),
  });

  const filters = useMemo(
    () => ({
      associateId: associateId === "all" ? undefined : associateId,
      from: from ? new Date(from).toISOString() : undefined,
      to: to ? new Date(`${to}T23:59:59`).toISOString() : undefined,
    }),
    [associateId, from, to],
  );

  const { data: rows, isLoading } = useQuery({
    queryKey: ["activity", filters],
    queryFn: () => listAllActivity({ data: filters }),
  });

  const applyPreset = (days: number | null) => {
    if (days === null) {
      setFrom("");
      setTo("");
      return;
    }
    const now = new Date();
    const start = new Date(now);
    start.setDate(start.getDate() - days + 1);
    const fmt = (d: Date) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };
    setFrom(fmt(start));
    setTo(fmt(now));
  };

  const presets: Array<{ label: string; days: number | null }> = [
    { label: "24h", days: 1 },
    { label: "7d", days: 7 },
    { label: "30d", days: 30 },
    { label: "90d", days: 90 },
    { label: "All time", days: null },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Associate
          </label>
          <Select value={associateId} onValueChange={setAssociateId}>
            <SelectTrigger className="mt-1.5 h-9 w-52 border-border bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All associates</SelectItem>
              {(associates ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.fullName || a.email}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="mt-1.5 h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="mt-1.5 h-9 rounded-md border border-border bg-card px-3 text-sm text-foreground focus:border-gold focus:outline-none"
          />
        </div>
        {(associateId !== "all" || from || to) && (
          <button
            type="button"
            onClick={() => {
              setAssociateId("all");
              setFrom("");
              setTo("");
            }}
            className="h-9 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {presets.map((p) => (
          <button
            key={p.label}
            type="button"
            onClick={() => applyPreset(p.days)}
            className="h-8 rounded-md border border-border bg-card px-3 text-[12px] text-muted-foreground transition-colors hover:border-gold hover:text-foreground"
          >
            {p.label}
          </button>
        ))}
      </div>


      <div className="mt-5 overflow-hidden rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Associate</th>
              <th className="px-4 py-3 font-medium">Time</th>
              <th className="px-4 py-3 font-medium">Type</th>
              <th className="px-4 py-3 font-medium">Question</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            ) : rows && rows.length > 0 ? (
              rows.map((row) => <ActivityRow key={row.id} row={row} />)
            ) : (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-muted-foreground">
                  No activity for these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ActivityRow({ row }: { row: AdminActivityRow }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <tr
        onClick={() => setOpen((o) => !o)}
        className="cursor-pointer border-b border-border/60 transition-colors last:border-0 hover:bg-accent/30"
      >
        <td className="px-4 py-3 font-medium text-foreground">{row.associateName}</td>
        <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
          {format(new Date(row.createdAt), "dd MMM yyyy, HH:mm")}
        </td>
        <td className="px-4 py-3">
          <span className="rounded-sm bg-gold/15 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-gold">
            {row.mode === "draft" ? "Draft" : "Research"}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground">
          <div className="flex items-center gap-2">
            <ChevronDown
              className={cn("h-3.5 w-3.5 shrink-0 transition-transform", open && "rotate-180")}
            />
            <span className="line-clamp-1">{row.question.slice(0, 100)}</span>
          </div>
        </td>
      </tr>
      {open && (
        <tr className="border-b border-border/60 bg-muted/20 last:border-0">
          <td colSpan={4} className="px-6 py-5">
            <div className="space-y-4">
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Full question
                </p>
                <p className="mt-1.5 whitespace-pre-wrap text-[14px] leading-relaxed text-foreground">
                  {row.question}
                </p>
              </div>
              <div>
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Result
                </p>
                <ActivityResult response={row.response} />
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}

function ActivityResult({ response }: { response: unknown }) {
  if (!response || typeof response !== "object") {
    return <p className="mt-1.5 text-sm text-muted-foreground">No result recorded.</p>;
  }
  const r = response as {
    issues?: string[];
    cases?: { title?: string; citation?: string; court?: string; year?: number }[];
    document_text?: string | null;
  };

  return (
    <div className="mt-2 space-y-3 text-[14px] leading-relaxed text-foreground/90">
      {r.issues && r.issues.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-foreground">Issues</p>
          <ul className="mt-1 list-disc pl-5">
            {r.issues.map((i, idx) => (
              <li key={idx}>{i}</li>
            ))}
          </ul>
        </div>
      )}
      {r.cases && r.cases.length > 0 && (
        <div>
          <p className="text-[12px] font-semibold text-foreground">Cases ({r.cases.length})</p>
          <ul className="mt-1 space-y-1">
            {r.cases.map((c, idx) => (
              <li key={idx} className="text-muted-foreground">
                <span className="text-foreground">{c.title}</span>
                {c.citation ? `, ${c.citation}` : ""}
                {c.court ? `, ${c.court}` : ""}
                {c.year ? ` (${c.year})` : ""}
              </li>
            ))}
          </ul>
        </div>
      )}
      {r.document_text && (
        <div>
          <p className="text-[12px] font-semibold text-foreground">Document</p>
          <pre className="mt-1 max-h-80 overflow-auto whitespace-pre-wrap rounded-md border border-border bg-card p-3 font-document text-[13px] leading-relaxed text-foreground/90">
            {r.document_text}
          </pre>
        </div>
      )}
      {!r.issues?.length && !r.cases?.length && !r.document_text && (
        <p className="text-sm text-muted-foreground">No result recorded.</p>
      )}
    </div>
  );
}

/* --------------------------------- Usage --------------------------------- */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

function QuotaBar({ used, limit }: { used: number; limit: number }) {
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const tone =
    pct >= 90
      ? "bg-destructive"
      : pct >= 70
        ? "bg-muted-foreground"
        : "bg-gold";
  const label =
    pct >= 90 ? "text-destructive" : "text-muted-foreground";
  return (
    <div className="min-w-[160px]">
      <div className="flex items-center justify-between text-[12px]">
        <span className="font-medium text-foreground">
          {used} / {limit || "∞"}
        </span>
        <span className={cn("tabular-nums", label)}>{limit > 0 ? `${pct}%` : "n/a"}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", tone)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function UsageTab() {
  const [search, setSearch] = useState("");
  const [role, setRole] = useState<string>("all");

  const { data, isLoading, error } = useQuery({
    queryKey: ["associates-usage"],
    queryFn: () => listAssociatesUsage(),
    refetchOnWindowFocus: false,
  });

  const filtered = useMemo(() => {
    const rows = data ?? [];
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (role !== "all" && r.role !== role) return false;
      if (!q) return true;
      return (
        r.fullName.toLowerCase().includes(q) || r.email.toLowerCase().includes(q)
      );
    });
  }, [data, search, role]);

  const totals = useMemo(() => {
    const rows = data ?? [];
    return rows.reduce(
      (acc, r) => ({
        users: acc.users + 1,
        text: acc.text + r.textUsed,
        vision: acc.vision + r.visionUsed,
        tokens: acc.tokens + r.totalTokens,
      }),
      { users: 0, text: 0, vision: 0, tokens: 0 },
    );
  }, [data]);

  const roles = useMemo(() => {
    const set = new Set<string>();
    (data ?? []).forEach((r) => set.add(r.role));
    return Array.from(set);
  }, [data]);

  return (
    <div>
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          { label: "Users", value: String(totals.users) },
          { label: "Text queries (24h)", value: String(totals.text) },
          { label: "Vision queries (24h)", value: String(totals.vision) },
          { label: "Total tokens (24h)", value: formatTokens(totals.tokens) },
        ].map((s) => (
          <div
            key={s.label}
            className="rounded-lg border border-border bg-card/40 px-4 py-3"
          >
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
              {s.label}
            </p>
            <p className="mt-1 font-sans text-2xl font-semibold text-foreground tabular-nums">
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="mt-6 flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[220px]">
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Search
          </label>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Name or email"
            className="mt-1.5 h-9 w-full rounded-md border border-border bg-card px-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-gold focus:outline-none"
          />
        </div>
        <div>
          <label className="text-[11px] uppercase tracking-wide text-muted-foreground">
            Role
          </label>
          <Select value={role} onValueChange={setRole}>
            <SelectTrigger className="mt-1.5 h-9 w-44 border-border bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              {roles.map((r) => (
                <SelectItem key={r} value={r} className="capitalize">
                  {r}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {(search || role !== "all") && (
          <button
            type="button"
            onClick={() => {
              setSearch("");
              setRole("all");
            }}
            className="h-9 rounded-md px-3 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="mt-5 overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-[12px] uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">User</th>
              <th className="px-4 py-3 font-medium">Role</th>
              <th className="px-4 py-3 font-medium">Text queries</th>
              <th className="px-4 py-3 font-medium">Vision uploads</th>
              <th className="px-4 py-3 text-right font-medium">Input</th>
              <th className="px-4 py-3 text-right font-medium">Output</th>
              <th className="px-4 py-3 text-right font-medium">Total tokens</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  Loading usage…
                </td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-destructive">
                  {error instanceof Error ? error.message : "Could not load usage."}
                </td>
              </tr>
            ) : filtered.length > 0 ? (
              filtered.map((r) => <UsageRowItem key={r.id} row={r} />)
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                  No users match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UsageRowItem({ row }: { row: UsageRow }) {
  return (
    <tr className="border-b border-border/60 last:border-0">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{row.fullName || "Not set"}</div>
        <div className="text-[12px] text-muted-foreground">{row.email}</div>
      </td>
      <td className="px-4 py-3">
        <span className="inline-flex rounded-full border border-border bg-muted/40 px-2.5 py-1 text-[11px] font-medium capitalize tracking-wide text-foreground">
          {row.role}
        </span>
      </td>
      <td className="px-4 py-3">
        <QuotaBar used={row.textUsed} limit={row.textLimit} />
      </td>
      <td className="px-4 py-3">
        <QuotaBar used={row.visionUsed} limit={row.visionLimit} />
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {formatTokens(row.inputTokens)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">
        {formatTokens(row.outputTokens)}
      </td>
      <td className="px-4 py-3 text-right tabular-nums font-medium text-foreground">
        {formatTokens(row.totalTokens)}
      </td>
    </tr>
  );
}
