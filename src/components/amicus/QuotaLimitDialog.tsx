import { AlertTriangle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface QuotaLimitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  resetTimeIso: string | null;
}

function formatReset(iso: string | null): string {
  if (!iso) return "tomorrow";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "tomorrow";
  return d.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function QuotaLimitDialog({ open, onOpenChange, resetTimeIso }: QuotaLimitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-full bg-destructive/10">
            <AlertTriangle className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle className="font-sans text-2xl">Daily usage limit reached</DialogTitle>
          <DialogDescription className="text-[14px] leading-relaxed">
            Your quota will refresh on {formatReset(resetTimeIso)}.
          </DialogDescription>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
}
