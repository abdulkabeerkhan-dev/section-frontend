import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarIcon,
  FileText,
  LayoutDashboard,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X,
  Bookmark,
  BarChart3,
  Scale,
  PenLine,
  Gavel,
  BookOpen,
} from "lucide-react";
import { useTheme } from "@/lib/theme";
import { Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { format } from "date-fns";

import { Wordmark } from "./Wordmark";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { UserQuotaResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

const NAV = [
  {
    label: "Assistants",
    items: [
      { label: "Jurist", to: "/assistants/ark", icon: Scale, hint: "Legal Research Specialist" },
      { label: "Counsel", to: "/assistants/mike", icon: PenLine, hint: "Courtroom Drafting Specialist" },
    ],
  },
  {
    label: "Research",
    items: [
      { label: "Judgment Search", to: "/judgments", icon: Gavel },
      { label: "Statute Search", to: "/statutes", icon: BookOpen },
    ],
  },
  {
    label: "Library",
    items: [
      { label: "Bookmarks", to: "/library", icon: Bookmark },
      { label: "History & Insights", to: "/research", icon: BarChart3 },
    ],
  },
] as const;

type SortOrder = "newest" | "oldest";
type DateRange = "all" | "today" | "7d" | "30d";

const DATE_RANGE_LABELS: Record<DateRange, string> = {
  all: "All time",
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
};

function withinRange(updatedAt: string, range: DateRange, customDate: Date | null): boolean {
  if (!updatedAt) return true;
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return true;
  if (customDate) {
    const start = new Date(
      customDate.getFullYear(),
      customDate.getMonth(),
      customDate.getDate(),
      0, 0, 0, 0,
    ).getTime();
    const end = start + 24 * 60 * 60 * 1000;
    return ts >= start && ts < end;
  }
  if (range === "all") return true;
  const now = Date.now();
  if (range === "today") {
    const d = new Date();
    const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    return ts >= start;
  }
  const days = range === "7d" ? 7 : 30;
  return ts >= now - days * 24 * 60 * 60 * 1000;
}

export interface SidebarThread {
  id: string;
  title: string;
  mode: "research" | "draft";
  updatedAt: string;
}

interface SidebarProps {
  threads: SidebarThread[];
  activeId: string | null;
  userName: string;
  isAdmin: boolean;
  quota?: UserQuotaResponse | null;
  onSelect: (id: string) => void;
  onNewMatter: () => void;
  onLogout: () => void;
}

export function Sidebar({
  threads,
  activeId,
  userName,
  isAdmin,
  onSelect,
  onNewMatter,
  onLogout,
  className,
}: SidebarProps & { className?: string }) {
  const { theme, toggle: toggleTheme } = useTheme();
  const [sortOrder, setSortOrder] = useState<SortOrder>("newest");
  const [dateRange, setDateRange] = useState<DateRange>("all");
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [search, setSearch] = useState("");

  const visibleThreads = useMemo(() => {
    const q = (search || "").trim().toLowerCase();
    const filtered = threads.filter(
      (t) =>
        t &&
        withinRange(t.updatedAt, dateRange, customDate) &&
        (q === "" || (t.title || "").toLowerCase().includes(q)),
    );
    filtered.sort((a, b) =>
      sortOrder === "newest"
        ? (b.updatedAt || "").localeCompare(a.updatedAt || "")
        : (a.updatedAt || "").localeCompare(b.updatedAt || ""),
    );
    return filtered;
  }, [threads, sortOrder, dateRange, customDate, search]);

  return (
    <aside
      className={cn(
        "h-full max-h-screen w-[248px] shrink-0 flex-col overflow-hidden border-r border-[#333333] bg-[#121212] text-[#D0D0CC]",
        className,
      )}
    >
      {/* Brand Header: 34px Logo + "Section" in Source Serif 22px */}
      <div className="shrink-0 px-5 pt-6 pb-4">
        <button
          type="button"
          onClick={onNewMatter}
          className="cursor-pointer appearance-none bg-transparent p-0 border-0 focus:outline-none"
          aria-label="Start new matter"
        >
          <Wordmark variant="default" />
        </button>
      </div>

      {/* Primary New Matter button: background --on-ink, text --ink, 44px min height */}
      <div className="shrink-0 px-4">
        <button
          type="button"
          onClick={onNewMatter}
          className="flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[3px] bg-[#F6F2EA] px-4 font-sans text-[13px] font-medium text-[#121212] transition-colors hover:bg-[#F6F2EA]/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F6F2EA]"
          aria-label="Create new matter"
        >
          <Plus className="h-4 w-4" />
          New matter
        </button>
      </div>

      {/* Main navigation */}
      <nav className="mt-5 shrink-0 space-y-4 px-3" aria-label="Main navigation">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A3A39E]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => (
                <Link
                  key={item.label}
                  to={item.to}
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "!bg-[#262626] !border-l-2 !border-[#F6F2EA] !text-[#F6F2EA]" }}
                  className="flex min-h-[38px] items-center gap-2.5 rounded-[3px] border-l-2 border-transparent px-2.5 py-1.5 font-sans text-[13px] font-medium text-[#D0D0CC] transition-colors hover:bg-[#262626] hover:text-[#F6F2EA] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#F6F2EA]"
                  title={"hint" in item ? item.hint : undefined}
                >
                  <item.icon className="h-3.5 w-3.5 shrink-0 text-[#A3A39E]" />
                  <span className="min-w-0 truncate">{item.label}</span>
                </Link>
              ))}
              {group.label === "Library" && (
                <Link
                  to="/settings"
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "!bg-[#262626] !border-l-2 !border-[#F6F2EA] !text-[#F6F2EA]" }}
                  className="flex min-h-[38px] items-center gap-2.5 rounded-[3px] border-l-2 border-transparent px-2.5 py-1.5 font-sans text-[13px] font-medium text-[#D0D0CC] transition-colors hover:bg-[#262626] hover:text-[#F6F2EA] focus-visible:outline-none"
                >
                  <Settings className="h-3.5 w-3.5 shrink-0 text-[#A3A39E]" />
                  <span>Settings</span>
                </Link>
              )}
              {group.label === "Library" && isAdmin && (
                <Link
                  to="/admin"
                  activeOptions={{ exact: true }}
                  activeProps={{ className: "!bg-[#262626] !border-l-2 !border-[#F6F2EA] !text-[#F6F2EA]" }}
                  className="flex min-h-[38px] items-center gap-2.5 rounded-[3px] border-l-2 border-transparent px-2.5 py-1.5 font-sans text-[13px] font-medium text-[#D0D0CC] transition-colors hover:bg-[#262626] hover:text-[#F6F2EA] focus-visible:outline-none"
                >
                  <LayoutDashboard className="h-3.5 w-3.5 text-[#A3A39E]" />
                  <span>Admin</span>
                </Link>
              )}
            </div>
          </div>
        ))}
      </nav>

      {/* Recent Matters list */}
      <div className="mt-4 flex min-h-[180px] flex-1 flex-col border-t border-[#333333] pt-3">
        <div className="flex items-center justify-between gap-2 px-5 pb-2">
          <p className="font-sans text-[11px] font-semibold uppercase tracking-[0.14em] text-[#A3A39E]">
            Recent matters
          </p>
          <div className="flex items-center gap-1">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter matters by date"
                  className={cn(
                    "rounded-[3px] p-1.5 text-[#A3A39E] transition-colors hover:bg-[#262626] hover:text-[#F6F2EA]",
                    customDate && "text-[#F6F2EA]",
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto border border-[#333333] bg-[#121212] p-3 text-[#F6F2EA]">
                <div className="space-y-2">
                  <p className="font-sans text-[11px] font-medium text-[#A3A39E]">
                    Matters on this day
                  </p>
                  <Calendar
                    mode="single"
                    selected={customDate ?? undefined}
                    onSelect={(d) => {
                      setCustomDate(d ?? null);
                      if (d) setCalendarOpen(false);
                    }}
                    initialFocus
                    className="p-0 pointer-events-auto"
                  />
                  {customDate && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomDate(null);
                        setCalendarOpen(false);
                      }}
                      className="flex w-full items-center justify-center gap-1 rounded-[3px] border border-[#333333] px-2 py-1.5 font-sans text-[11px] text-[#A3A39E] hover:bg-[#262626] hover:text-[#F6F2EA]"
                    >
                      <X className="h-3 w-3" /> Clear date
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {threads.length === 0 ? (
            <p className="px-2 pt-2 font-sans text-[13px] leading-relaxed text-[#A3A39E]">
              No matters recorded.
            </p>
          ) : visibleThreads.length === 0 ? (
            <p className="px-2 pt-2 font-sans text-[13px] leading-relaxed text-[#A3A39E]">
              No matters match criteria.
            </p>
          ) : (
            <TooltipProvider delayDuration={400}>
              <ul className="space-y-1">
                {visibleThreads.map((item, idx) => (
                  <li key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={cn(
                            "group flex w-full items-start gap-2 rounded-[3px] border-l-2 px-2.5 py-2 text-left transition-colors focus-visible:outline-none",
                            activeId === item.id
                              ? "border-[#F6F2EA] bg-[#262626] text-[#F6F2EA]"
                              : "border-transparent text-[#D0D0CC] hover:bg-[#262626] hover:text-[#F6F2EA]",
                          )}
                        >
                          <span className="mt-0.5 shrink-0 text-[#A3A39E]">
                            {item.mode === "draft" ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-sans text-[13px] font-normal leading-snug">
                              {item.title}
                            </span>
                            <span className="mt-0.5 block font-sans text-[11px] text-[#A3A39E]">
                              Matter {visibleThreads.length - idx} • {item.mode === "draft" ? "Draft" : "Research"}
                            </span>
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs border border-[#333333] bg-[#262626] text-[#F6F2EA]"
                      >
                        {item.title}
                      </TooltipContent>
                    </Tooltip>
                  </li>
                ))}
              </ul>
            </TooltipProvider>
          )}
        </div>
      </div>

      {/* User Footer: avatar border --ink-4 (#444444), logout */}
      <div className="shrink-0 border-t border-[#333333] bg-[#121212] px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[3px] border border-[#444444] bg-[#262626] font-sans text-[12px] font-semibold text-[#F6F2EA]">
              {(userName || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 truncate font-sans text-[13px] font-medium text-[#F6F2EA]">
              {userName || "Advocate"}
            </span>
          </div>
          <button
            type="button"
            onClick={onLogout}
            aria-label="Sign out"
            className="rounded-[3px] p-2 text-[#A3A39E] transition-colors hover:bg-[#262626] hover:text-[#F6F2EA]"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
