import { useEffect, useRef } from "react";
import { Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { Mode } from "@/lib/api";

export interface FormState {
  question: string;
  mode: Mode;
  docType: string;
  court: string;
  yearFrom: string;
  yearTo: string;
  maxCases: number;
  attachments: string[];
}

export const DOC_TYPES = [
  "Civil Suit",
  "Stay Application",
  "Appeal",
  "Legal Notice",
  "Written Statement",
  "Vakalatnama",
];

interface InputPanelProps {
  form: FormState;
  onChange: (patch: Partial<FormState>) => void;
  onGenerate: () => void;
  loading: boolean;
  error: string;
}

export function InputPanel({ form, onChange, onGenerate, loading, error }: InputPanelProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const canGenerate = form.question.trim().length > 0 && !loading;

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 100)}px`;
  }, [form.question]);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files;
    if (files && files.length > 0) {
      onChange({ attachments: [...(form.attachments ?? []), ...Array.from(files).map((f) => f.name)] });
    }
    e.target.value = "";
  }

  function removeAttachment(index: number) {
    onChange({ attachments: form.attachments.filter((_, i) => i !== index) });
  }

  return (
    <section>
      <div className="group rounded-lg border-2 border-border bg-card shadow-sm transition-colors focus-within:border-gold">
        <textarea
          ref={textareaRef}
          value={form.question}
          onChange={(e) => onChange({ question: e.target.value })}
          placeholder="Ask your legal question in plain English. e.g. My client is a tenant facing eviction despite paying rent on time, what precedent protects against wrongful ejectment? When you're ready, just ask Section to draft the relevant document."
          className="min-h-[120px] w-full resize-none rounded-lg bg-card px-4 py-3.5 text-[15px] leading-relaxed text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-end gap-3">
        <input
          ref={fileRef}
          type="file"
          multiple
          accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          onChange={handleFile}
          className="hidden"
        />
        {form.attachments && form.attachments.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2">
            {form.attachments.map((name, i) => (
              <span key={`${name}-${i}`} className="flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1.5 text-[13px] text-foreground/90">
                <Paperclip className="h-3.5 w-3.5 text-gold" />
                <span className="max-w-[160px] truncate">{name}</span>
                <button
                  type="button"
                  onClick={() => removeAttachment(i)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove ${name}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
            >
              <Paperclip className="h-3.5 w-3.5" />
              Attach another
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            <Paperclip className="h-3.5 w-3.5" />
            Attach document
          </button>
        )}

        <button
          type="button"
          disabled={!canGenerate}
          onClick={onGenerate}
          className={cn(
            "flex items-center gap-1.5 rounded bg-primary px-5 py-2 text-sm font-semibold text-primary-foreground transition-opacity disabled:opacity-40",
            loading && "pulse-gold",
          )}
        >
          Ask Section
          <span aria-hidden>→</span>
        </button>
      </div>

      {error && <p className="mt-2.5 text-[13px] text-destructive">{error}</p>}
    </section>
  );
}
