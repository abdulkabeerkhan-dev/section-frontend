import { Button } from "@/components/ui/button";

interface PrecedentWarningProps {
  status?: string;
  warningText?: string;
  supersedingCitation?: string;
  supersedingName?: string;
  onCitationClick?: (citation: string) => void;
}

export function PrecedentWarning({
  status,
  supersedingCitation,
  supersedingName,
  onCitationClick,
}: PrecedentWarningProps) {
  if (!status) return null;

  const normalizedStatus = status.trim().toLowerCase();
  const statusLabel = normalizedStatus.replaceAll("_", " ");

  return (
    <aside
      className="mt-4 text-sm leading-6 text-muted-foreground"
      aria-label={`Precedent status: ${statusLabel}`}
    >
      <div className="min-w-0 flex-1">
        <p><span className="font-medium text-foreground">Subsequent treatment:</span> {statusLabel}.</p>

        {supersedingCitation && (
          <div className="mt-1">
            <p className="text-xs font-medium">Controlling authority</p>
            <Button
              type="button"
              variant="link"
              onClick={() => onCitationClick?.(supersedingCitation)}
              disabled={!onCitationClick}
              className="mt-1 h-auto max-w-full justify-start whitespace-normal p-0 text-left text-sm font-medium text-foreground"
              aria-label={`Research controlling authority ${supersedingName || supersedingCitation}`}
            >
              <span>
                {supersedingName ? `${supersedingName} (${supersedingCitation})` : supersedingCitation}
              </span>
            </Button>
          </div>
        )}
      </div>
    </aside>
  );
}