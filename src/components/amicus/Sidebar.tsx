import {
  ArrowDownAZ,
  ArrowUpAZ,
  CalendarIcon,
  FileText,
  LayoutDashboard,
  ListFilter,
  LogOut,
  Moon,
  Plus,
  Search,
  Settings,
  Sun,
  X, Bookmark, BarChart3, Scale, PenLine, Gavel, BookOpen } from "lucide-react";
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
      { label: "Jurist", to: "/assistants/ark", icon: Scale, hint: "Chief Legal Research Specialist" },
      { label: "Counsel", to: "/assistants/mike", icon: PenLine, hint: "Courtroom Litigation & Drafting Specialist" },
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
  const ts = new Date(updatedAt).getTime();
  if (Number.isNaN(ts)) return true;
  if (customDate) {
    // Match matters created on the selected calendar day (local time)
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
    const q = search.trim().toLowerCase();
    const filtered = threads.filter(
      (t) =>
        withinRange(t.updatedAt, dateRange, customDate) &&
        (q === "" || t.title.toLowerCase().includes(q)),
    );
    filtered.sort((a, b) =>
      sortOrder === "newest"
        ? b.updatedAt.localeCompare(a.updatedAt)
        : a.updatedAt.localeCompare(b.updatedAt),
    );
    return filtered;
  }, [threads, sortOrder, dateRange, customDate, search]);

  const isFiltering = dateRange !== "all" || customDate !== null;

  return (
    <aside
      className={cn(
        "h-full max-h-screen w-[272px] shrink-0 flex-col overflow-hidden border-r border-sidebar-border bg-sidebar text-sidebar-foreground",
        className,
      )}
    >
      <div className="shrink-0 px-6 pb-4 pt-6">
        <button
          type="button"
          onClick={onNewMatter}
          className="cursor-pointer appearance-none bg-transparent p-0 border-0"
          aria-label="Start new chat"
        >
          <Wordmark variant="uppercase" />
        </button>
      </div>


      <div className="shrink-0 px-4">
        <button
          type="button"
          onClick={onNewMatter}
          className="flex w-full items-center gap-2 rounded-sm bg-sidebar-foreground px-2 py-2 text-[13px] font-medium text-sidebar transition-colors hover:bg-sidebar-foreground/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Plus className="h-4 w-4" />
          New matter
        </button>
</div>

      <nav className="mt-4 shrink-0 space-y-4 px-4" aria-label="Main navigation">
        {NAV.map((group) => (
          <div key={group.label}>
            <p className="px-2 pb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/75">
              {group.label}
            </p>
            {group.items.map((item) => (
              <Link
                key={item.label}
                to={item.to}
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-sidebar-foreground/10 text-sidebar-foreground" }}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                title={"hint" in item ? item.hint : undefined}
              >
                <item.icon className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 truncate">{item.label}</span>
              </Link>
            ))}
            {group.label === "Library" && (
              <Link
                to="/settings"
                activeOptions={{ exact: true }}
                activeProps={{ className: "bg-sidebar-foreground/10 text-sidebar-foreground" }}
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-sidebar-foreground/80 transition-colors hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <Settings className="h-3.5 w-3.5 shrink-0" />
                <span>Settings</span>
              </Link>
            )}
            {group.label === "Library" && isAdmin && (
              <Link
                to="/admin"
                className="flex items-center gap-2 rounded-sm px-2 py-1.5 text-[13px] text-sidebar-foreground/80 hover:bg-sidebar-foreground/5 hover:text-sidebar-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                <LayoutDashboard className="h-3.5 w-3.5" />
                <span>Admin</span>
              </Link>
            )}
          </div>
        ))}
      </nav>

      <div className="mt-4 flex min-h-[220px] flex-1 flex-col">
        <div className="flex items-center justify-between gap-2 px-6">
          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-sidebar-foreground/75">
            Recent matters
          </p>
          <div className="flex items-center gap-1">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Filter by specific date"
                  className={cn(
                     "relative rounded-sm p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
                    customDate && "text-gold",
                  )}
                >
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {customDate && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
                  )}
                </button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-auto p-3">
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground">
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
                      className="flex w-full items-center justify-center gap-1 rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                    >
                      <X className="h-3 w-3" />
                      Clear date
                    </button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Sort and filter matters"
                  className={cn(
                     "relative rounded-sm p-1.5 text-sidebar-foreground/50 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground",
                    isFiltering && "text-gold",
                  )}
                >
                  <ListFilter className="h-3.5 w-3.5" />
                  {isFiltering && (
                    <span className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-gold" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Sort by date</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={sortOrder}
                  onValueChange={(v) => setSortOrder(v as SortOrder)}
                >
                  <DropdownMenuRadioItem value="newest">
                    <ArrowDownAZ className="mr-2 h-3.5 w-3.5" />
                    Newest first
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="oldest">
                    <ArrowUpAZ className="mr-2 h-3.5 w-3.5" />
                    Oldest first
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
                <DropdownMenuSeparator />
                <DropdownMenuLabel>Filter by date</DropdownMenuLabel>
                {(Object.keys(DATE_RANGE_LABELS) as DateRange[]).map((range) => (
                  <DropdownMenuCheckboxItem
                    key={range}
                    checked={dateRange === range}
                    onCheckedChange={() => {
                      setDateRange(range);
                      setCustomDate(null);
                    }}
                  >
                    {DATE_RANGE_LABELS[range]}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="mt-3 px-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-sidebar-foreground/45" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search matters…"
             className="w-full rounded-sm border border-sidebar-border bg-sidebar-foreground/5 py-2 pl-8 pr-7 text-[13px] text-sidebar-foreground placeholder:text-sidebar-foreground/45 focus:border-sidebar-foreground/50 focus:outline-none"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                className="absolute right-1.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        <div className="sidebar-scroll mt-2 min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-3">
          {threads.length === 0 ? (
            <p className="px-3 pt-2 text-[13px] leading-relaxed text-sidebar-foreground/50">
              No matters yet. Start one with New matter.
            </p>
          ) : visibleThreads.length === 0 ? (
            <p className="px-3 pt-2 text-[13px] leading-relaxed text-sidebar-foreground/50">
              {search.trim()
                ? `No matters match “${search.trim()}”.`
                : customDate
                  ? `No matters on ${format(customDate, "MMM d, yyyy")}.`
                  : `No matters in ${DATE_RANGE_LABELS[dateRange].toLowerCase()}.`}
            </p>
          ) : (
            <TooltipProvider delayDuration={400}>
              <ul className="space-y-0.5">
                {visibleThreads.map((item) => (
                  <li key={item.id}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button
                          type="button"
                          onClick={() => onSelect(item.id)}
                          className={cn(
                            "group flex w-full items-start gap-2 border-l-2 px-2 py-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring",
                            activeId === item.id
                              ? "border-sidebar-foreground bg-sidebar-foreground/10"
                              : "border-transparent hover:border-sidebar-foreground/40 hover:bg-sidebar-foreground/5",
                          )}
                        >
                           <span className="mt-0.5 shrink-0 text-sidebar-foreground/45">
                            {item.mode === "draft" ? (
                              <FileText className="h-3.5 w-3.5" />
                            ) : (
                              <Search className="h-3.5 w-3.5" />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                             <span className="block truncate text-[13px] font-normal leading-5 text-sidebar-foreground/85">
                              {item.title}
                            </span>
                            <span
                              className={cn(
                                "mt-0.5 block text-[11px] text-sidebar-foreground/60",
                              )}
                            >
                              {item.mode === "draft" ? "Draft" : "Research"} · {format(new Date(item.updatedAt), "MMM d")}
                            </span>
                          </span>
                        </button>
                      </TooltipTrigger>
                      <TooltipContent
                        side="right"
                        className="max-w-xs bg-popover text-popover-foreground shadow-md"
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





      <div className="relative z-10 shrink-0 border-t border-sidebar-border bg-sidebar px-4 py-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-sm border border-sidebar-border bg-sidebar-foreground/10 font-sans text-sm font-semibold text-sidebar-foreground">
              {(userName || "?").charAt(0).toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-[13px] font-medium text-sidebar-foreground">
              {userName || "Signed in"}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={toggleTheme}
              title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
              aria-pressed={theme === "light"}
              className="rounded-sm p-2 text-sidebar-foreground/55 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              onClick={onLogout}
              title="Logout"
              aria-label="Logout"
              className="rounded-sm p-2 text-sidebar-foreground/55 transition-colors hover:bg-sidebar-foreground/10 hover:text-sidebar-foreground"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
}
