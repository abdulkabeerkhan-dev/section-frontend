import { FileText, Image as ImageIcon } from "lucide-react";
import type { UserQuotaResponse } from "@/lib/api";
import { cn } from "@/lib/utils";

interface QuotaWidgetProps {
  quota: UserQuotaResponse;
  className?: string;
}

function QuotaRow({
  icon,
  label,
  remaining,
  limit,
}: {
  icon: React.ReactNode;
  label: string;
  remaining: number;
  limit: number;
}) {
  const used = Math.max(0, limit - remaining);
  const pct = limit > 0 ? Math.min(100, (used / limit) * 100) : 0;
  const depleted = remaining <= 0;

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-[12px]">
        <span className="flex items-center gap-1.5 text-muted-foreground">
          {icon}
          {label}
        </span>
        <span
          className={cn(
            "font-medium tabular-nums",
            depleted ? "text-destructive" : "text-foreground",
          )}
        >
          {remaining}/{limit} left
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={cn(
            "h-full rounded-full transition-all",
            depleted ? "bg-destructive" : "bg-primary",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export function QuotaWidget({ quota, className }: QuotaWidgetProps) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card p-3",
        className,
      )}
    >
      <p className="mb-2.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Daily usage
      </p>
      <div className="space-y-3">
        <QuotaRow
          icon={<FileText className="h-3.5 w-3.5" />}
          label="Search queries"
          remaining={quota.text_queries_remaining}
          limit={quota.text_queries_limit}
        />
        <QuotaRow
          icon={<ImageIcon className="h-3.5 w-3.5" />}
          label="Image uploads"
          remaining={quota.vision_queries_remaining}
          limit={quota.vision_queries_limit}
        />
      </div>
    </div>
  );
}
