import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Brain,
  Check,
  LogOut,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Sparkles,
  Sun,
  Trash2,
  User,
  X,
} from "lucide-react";
import { Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useUser } from "@clerk/clerk-react";

import {
  addMemory,
  deleteMemory,
  listMyMemory,
  updateMemory,
  MEMORY_CATEGORIES,
  type MemoryCategory,
  type MemoryRecord,
} from "@/lib/memory.functions";
import { setMyName } from "@/lib/me.functions";
import { useLogout, useMe, type MeResult } from "@/lib/useMe";
import { useTheme, type Theme } from "@/lib/theme";
import { Wordmark } from "./Wordmark";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS: Record<MemoryCategory, string> = {
  practice_area: "Practice areas",
  court: "Courts & jurisdictions",
  drafting_style: "Drafting style",
  personal: "Personal & professional",
  other: "Other",
};

const ADD_CATEGORIES: { value: MemoryCategory; label: string }[] = MEMORY_CATEGORIES.map((c) => ({
  value: c,
  label: CATEGORY_LABELS[c],
}));

type TabId = "profile" | "appearance" | "memory" | "account";

const TABS: { id: TabId; label: string; icon: typeof User }[] = [
  { id: "profile", label: "Profile", icon: User },
  { id: "appearance", label: "Appearance", icon: Sun },
  { id: "memory", label: "Memory", icon: Brain },
  { id: "account", label: "Account", icon: LogOut },
];

export function SettingsPage() {
  const [tab, setTab] = useState<TabId>("profile");
  const { data: me } = useMe();

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-sidebar-border">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-5 py-4 sm:px-8">
          <Wordmark className="[&_*]:text-[20px]" />
          <Link
            to="/app"
            className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[13px] font-medium tracking-[0.01em] text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to workspace
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
        <h1 className="font-sans text-3xl font-semibold text-foreground">Settings</h1>
        <p className="mt-1 text-[14px] text-muted-foreground">
          Manage your profile, appearance and what Section remembers about you.
        </p>

        <div className="mt-8 grid gap-8 md:grid-cols-[200px_1fr]">
          {/* Tab nav */}
          <nav className="flex gap-1 overflow-x-auto md:flex-col md:overflow-visible">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={cn(
                  "flex shrink-0 items-center gap-2.5 rounded-md px-3.5 py-2.5 text-left text-[13px] font-medium tracking-[0.01em] transition-colors",
                  tab === id
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </nav>

          {/* Content */}
          <div className="min-w-0">
            {tab === "profile" && <ProfileTab />}
            {tab === "appearance" && <AppearanceTab />}
            {tab === "memory" && <MemoryTab />}
            {tab === "account" && <AccountTab status={me?.status} />}
          </div>
        </div>
      </main>
    </div>
  );
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        {title}
      </p>
      {description && <p className="mt-1 text-[13px] text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function ProfileTab() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();
  const { user } = useUser();
  const [editing, setEditing] = useState(false);
  const [first, setFirst] = useState(me?.firstName ?? "");
  const [last, setLast] = useState(me?.lastName ?? "");

  const saveMut = useMutation({
    mutationFn: async (v: { firstName: string; lastName: string }) => {
      // Update Clerk first so it's the source of truth, then mirror to backend.
      if (user) {
        await user.update({ firstName: v.firstName, lastName: v.lastName });
        // Make sure the local Clerk user object reflects the new name before
        // any subsequent /users/sync call reads user.fullName from it.
        await user.reload();
      }
      return setMyName({ data: v });
    },
    onSuccess: (result, vars) => {
      setEditing(false);
      // Patch the cache directly — invalidating would re-run /users/sync
      // with a possibly stale Clerk user and overwrite the new name.
      queryClient.setQueryData<MeResult | undefined>(
        ["me", user?.id ?? null],
        (prev) =>
          prev
            ? {
                ...prev,
                firstName: vars.firstName,
                lastName: vars.lastName,
                fullName: result.fullName,
                needsName: false,
              }
            : prev,
      );
    },
    onError: (err) => {
      console.error("[ProfileTab] save failed:", err);
    },
  });

  const start = () => {
    setFirst(me?.firstName ?? "");
    setLast(me?.lastName ?? "");
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Your profile" description="This is how Section addresses you.">
        {editing ? (
          <div className="space-y-3">
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-medium text-foreground">
                First name
                <input
                  value={first}
                  onChange={(e) => setFirst(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none"
                />
              </label>
              <label className="text-[13px] font-medium text-foreground">
                Last name
                <input
                  value={last}
                  onChange={(e) => setLast(e.target.value)}
                  className="mt-1.5 w-full rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none"
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={!first.trim() || !last.trim() || saveMut.isPending}
                onClick={() => saveMut.mutate({ firstName: first.trim(), lastName: last.trim() })}
                className="rounded-md bg-primary px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                {saveMut.isPending ? "Saving…" : "Save changes"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="rounded-md border border-border px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-foreground transition-colors hover:bg-accent"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-4">
            <div className="grid gap-1.5 text-[14px]">
              <p className="text-foreground">
                <span className="text-muted-foreground">Name: </span>
                {me?.fullName || "Not set"}
              </p>
              <p className="text-foreground">
                <span className="text-muted-foreground">Email: </span>
                {me?.email || "Not set"}
              </p>
            </div>
            <button
              type="button"
              onClick={start}
              className="flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-accent"
            >
              <Pencil className="h-3.5 w-3.5" />
              Edit
            </button>
          </div>
        )}
      </SectionCard>
    </div>
  );
}

function AppearanceTab() {
  const { theme, setTheme } = useTheme();

  const options: { value: Theme; label: string; icon: typeof Sun; preview: string }[] = [
    { value: "dark", label: "Dark", icon: Moon, preview: "bg-foreground" },
    { value: "light", label: "Light", icon: Sun, preview: "bg-background" },
  ];

  return (
    <div className="space-y-6">
      <SectionCard title="Theme" description="Choose how Section looks. Your choice is saved on this device.">
        <div className="grid grid-cols-2 gap-3">
          {options.map(({ value, label, icon: Icon, preview }) => (
            <button
              key={value}
              type="button"
              onClick={() => setTheme(value)}
              className={cn(
                "group flex flex-col gap-3 rounded-lg border p-3 text-left transition-colors",
                theme === value
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-primary/40",
              )}
            >
              <div
                className={cn(
                  "flex h-20 items-center justify-center rounded-md border border-border",
                  preview,
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6",
                    value === "dark" ? "text-background" : "text-foreground",
                  )}
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-foreground">{label}</span>
                {theme === value && (
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </div>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard
        title="System preference"
        description="Match your device's appearance automatically."
      >
        <button
          type="button"
          onClick={() => {
            const prefersDark =
              typeof window !== "undefined" &&
              window.matchMedia("(prefers-color-scheme: dark)").matches;
            setTheme(prefersDark ? "dark" : "light");
          }}
          className="flex items-center gap-2 rounded-md border border-border px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-foreground transition-colors hover:bg-accent"
        >
          <Monitor className="h-4 w-4" />
          Use system theme
        </button>
      </SectionCard>
    </div>
  );
}

function AccountTab({ status }: { status?: string }) {
  const logout = useLogout();
  return (
    <div className="space-y-6">
      <SectionCard title="Account">
        <div className="flex items-center gap-2 text-[14px] text-foreground">
          <span className="text-muted-foreground">Status:</span>
          <span className="rounded-sm bg-success/15 px-2 py-0.5 text-[12px] font-medium capitalize text-success">
            {status || "active"}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
          Section is an invitation-only workspace. Contact your administrator to change your access
          level.
        </p>
      </SectionCard>

      <SectionCard title="Session">
        <button
          type="button"
          onClick={logout}
          className="flex items-center gap-2 rounded-md border border-destructive/40 px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-destructive transition-colors hover:bg-destructive/10"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </SectionCard>
    </div>
  );
}

function MemoryTab() {
  const queryClient = useQueryClient();
  const { data: me } = useMe();

  const { data: memories } = useQuery({
    queryKey: ["myMemory"],
    queryFn: () => listMyMemory(),
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState("");
  const [newCategory, setNewCategory] = useState<MemoryCategory>("practice_area");
  const [newContent, setNewContent] = useState("");

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["myMemory"] });

  const addMut = useMutation({
    mutationFn: (v: { category: MemoryCategory; content: string }) => addMemory({ data: v }),
    onSuccess: () => {
      setNewContent("");
      refresh();
    },
  });

  const updateMut = useMutation({
    mutationFn: (v: { id: string; content: string }) => updateMemory({ data: v }),
    onSuccess: () => {
      setEditingId(null);
      refresh();
    },
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => deleteMemory({ data: { id } }),
    onSuccess: refresh,
  });

  const grouped = useMemo(() => {
    const map = new Map<MemoryCategory, MemoryRecord[]>();
    for (const m of memories ?? []) {
      const arr = map.get(m.category) ?? [];
      arr.push(m);
      map.set(m.category, arr);
    }
    return MEMORY_CATEGORIES.map((c) => ({ category: c, items: map.get(c) ?? [] })).filter(
      (g) => g.items.length > 0,
    );
  }, [memories]);

  return (
    <div className="space-y-6">
      <SectionCard
        title="What Section remembers"
        description={`${
          me?.firstName ? `${me.firstName}, this` : "This"
        } is everything Section keeps in mind to personalise your research and drafts.`}
      >
        <div className="flex flex-col gap-3 sm:flex-row">
          <select
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value as MemoryCategory)}
            className="rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground focus:border-primary focus:outline-none"
          >
            {ADD_CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
          <input
            value={newContent}
            onChange={(e) => setNewContent(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newContent.trim()) {
                addMut.mutate({ category: newCategory, content: newContent.trim() });
              }
            }}
            placeholder="e.g. I mostly appear before the Lahore High Court"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          />
          <button
            type="button"
            disabled={!newContent.trim() || addMut.isPending}
            onClick={() => addMut.mutate({ category: newCategory, content: newContent.trim() })}
            className="flex items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </SectionCard>

      <div className="space-y-6">
        {grouped.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border bg-card/50 px-5 py-10 text-center">
            <p className="text-[14px] text-muted-foreground">
              Section hasn't learned anything yet. As you chat, it will remember your practice areas,
              preferred courts and drafting style, or add something above.
            </p>
          </div>
        ) : (
          grouped.map((group) => (
            <div key={group.category}>
              <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
                {CATEGORY_LABELS[group.category]}
              </p>
              <ul className="mt-3 space-y-2">
                {group.items.map((m) => (
                  <li
                    key={m.id}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card px-4 py-3"
                  >
                    {editingId === m.id ? (
                      <>
                        <input
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          autoFocus
                          className="flex-1 rounded border border-border bg-background px-2.5 py-1.5 text-[14px] text-foreground focus:border-primary focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            editText.trim() && updateMut.mutate({ id: m.id, content: editText.trim() })
                          }
                          className="rounded p-1.5 text-primary hover:bg-accent"
                          aria-label="Save"
                        >
                          <Check className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingId(null)}
                          className="rounded p-1.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                          aria-label="Cancel"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-[14px] leading-relaxed text-foreground/90">
                          {m.content}
                        </span>
                        {m.source === "learned" && (
                          <span
                            title="Learned automatically"
                            className="mt-0.5 flex shrink-0 items-center gap-1 rounded-sm bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                          >
                            <Sparkles className="h-3 w-3" />
                            Learned
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setEditingId(m.id);
                            setEditText(m.content);
                          }}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                          aria-label="Edit"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteMut.mutate(m.id)}
                          className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-destructive/15 hover:text-destructive"
                          aria-label="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
