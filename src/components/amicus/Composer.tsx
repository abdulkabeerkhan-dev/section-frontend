import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BackendMode, JurisprudenceEra } from "@/lib/api";

export type BackendModeChoice = BackendMode | "auto";

export const BACKEND_MODE_OPTIONS: { value: BackendModeChoice; label: string }[] = [
  { value: "auto", label: "Auto (detect)" },
  { value: "simple_query", label: "Simple Query" },
  { value: "caselaw_search", label: "Case Law Search" },
  { value: "judgment_lookup", label: "Judgment Lookup" },
  { value: "drafting", label: "Drafting" },
  { value: "document_analysis", label: "Document Analysis" },
];

export const ERA_OPTIONS: { value: JurisprudenceEra; label: string }[] = [
  { value: "all", label: "All Authorities" },
  { value: "modern", label: "Modern Jurisprudence (2018–Present)" },
  { value: "apex", label: "Apex Precedents Only (Supreme Court)" },
];

export interface ComposerAttachment {
  name: string;
  image_base64?: string;
  image_mime_type?: string;
  /** Base64 payload for non-image documents (PDF, DOCX). */
  file_base64?: string;
  /** MIME type of the non-image document. */
  file_mime_type?: string;
}

// Hard cap on the original upload before we even try to read it (25 MB).
const MAX_RAW_BYTES = 25 * 1024 * 1024;
// Downscale very large scans so vision OCR payloads stay well under timeouts.
const MAX_DIMENSION = 2200;
const JPEG_QUALITY = 0.82;
// Skip re-encoding small images that are already lightweight.
const COMPRESS_THRESHOLD_BYTES = 900 * 1024;
// Prompt limits: ~30,000 words or about 120,000 characters.
const MAX_PROMPT_CHARS = 120_000;
const MAX_PROMPT_WORDS = 30_000;

interface ComposerProps {
  onSend: (question: string, attachments: ComposerAttachment[]) => void;
  loading: boolean;
  error: string;
  autoFocus?: boolean;
  compact?: boolean;
  /** Populate the input externally (e.g. from an example prompt chip). */
  seed?: { text: string; nonce: number } | null;
  /** Cancel the in-flight query. When provided and loading, shows a Stop button. */
  onStop?: () => void;
  /** Currently selected backend mode (or "auto" to let the backend infer). */
  modeChoice?: BackendModeChoice;
  /** Called when the user picks a mode from the dropdown. */
  onModeChoiceChange?: (mode: BackendModeChoice) => void;
  /** Currently selected jurisprudence era filter. */
  era?: JurisprudenceEra;
  /** Called when the user picks a jurisprudence era. */
  onEraChange?: (era: JurisprudenceEra) => void;
}

const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

/** Strip the `data:...;base64,` prefix, leaving the raw base64 payload. */
function stripDataPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

/** Count whitespace-separated words in a string. */
function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

/** Read a file as a data URL. */
function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

/** Load a data URL into an HTMLImageElement so we can draw it to a canvas. */
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

/**
 * Read an image as a clean base64 string, compressing/downscaling large scans
 * to keep the vision OCR payload small enough to avoid request timeouts.
 */
async function imageToPayload(file: File): Promise<{ base64: string; mime: string }> {
  const dataUrl = await readAsDataURL(file);
  const fallbackMime = file.type || "image/jpeg";

  // Small, already-light images can be sent as-is.
  if (file.size <= COMPRESS_THRESHOLD_BYTES) {
    try {
      const img = await loadImage(dataUrl);
      if (Math.max(img.width, img.height) <= MAX_DIMENSION) {
        return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
      }
    } catch {
      return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
    }
  }

  try {
    const img = await loadImage(dataUrl);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
    // White matte so transparent PNGs don't turn black when flattened to JPEG.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);
    const out = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { base64: stripDataPrefix(out), mime: "image/jpeg" };
  } catch {
    return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
  }
}

export function Composer({
  onSend,
  loading,
  error,
  autoFocus,
  compact,
  seed,
  onStop,
  modeChoice = "auto",
  onModeChoiceChange,
  era = "all",
  onEraChange,
}: ComposerProps) {
  const [question, setQuestion] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const charCount = question.length;
  const wordCount = countWords(question);
  const overChar = charCount > MAX_PROMPT_CHARS;
  const overWord = wordCount > MAX_PROMPT_WORDS;
  const nearLimit = charCount > MAX_PROMPT_CHARS * 0.9 || wordCount > MAX_PROMPT_WORDS * 0.9;
  const canSend = question.trim().length > 0 && !loading && !processing && !overChar && !overWord;

  // Keep the composer focused for a fluid chat feel.
  useEffect(() => {
    if (autoFocus) textareaRef.current?.focus();
  }, [autoFocus, loading]);

  // Apply an externally seeded prompt (example chips) and focus the field.
  useEffect(() => {
    if (!seed) return;
    setQuestion(seed.text);
    requestAnimationFrame(() => {
      const el = textareaRef.current;
      if (el) {
        el.focus();
        el.setSelectionRange(el.value.length, el.value.length);
      }
    });
  }, [seed]);

  function submit() {
    if (!canSend) return;
    onSend(question.trim(), attachments);
    setQuestion("");
    setAttachments([]);
    requestAnimationFrame(() => textareaRef.current?.focus());
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    // Snapshot the files BEFORE resetting the input — `e.target.files` is a live
    // reference, so clearing the value first would empty it and drop the upload.
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = "";
    if (fileList.length === 0) return;

    setUploadError("");
    setProcessing(true);
    const rejected: string[] = [];

    try {
      const processed = await Promise.all(
        fileList.map(async (file): Promise<ComposerAttachment | null> => {
          const isImage = IMAGE_MIME.test(file.type) || IMAGE_EXT.test(file.name);
          if (file.size > MAX_RAW_BYTES) {
            rejected.push(file.name);
            return null;
          }
          if (!isImage) {
            // Wait for the full base64 conversion before the attachment is usable,
            // so a send can never fire with an empty document payload.
            try {
              const dataUrl = await readAsDataURL(file);
              return {
                name: file.name,
                file_base64: stripDataPrefix(dataUrl),
                file_mime_type: file.type || "application/octet-stream",
              };
            } catch {
              rejected.push(file.name);
              return null;
            }
          }
          try {
            const { base64, mime } = await imageToPayload(file);
            return { name: file.name, image_base64: base64, image_mime_type: mime };
          } catch {
            return { name: file.name };
          }
        }),
      );

      const kept = processed.filter((a): a is ComposerAttachment => a !== null);
      if (kept.length > 0) setAttachments((prev) => [...prev, ...kept]);
      if (rejected.length > 0) {
        setUploadError(
          `${rejected.join(", ")} ${rejected.length > 1 ? "are" : "is"} too large (max 25 MB). Please upload a smaller scan.`,
        );
      }
    } finally {
      setProcessing(false);
    }
  }

  function removeAttachment(index: number) {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <section>
      <input
        ref={fileRef}
        type="file"
        multiple
        accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={handleFile}
        className="hidden"
      />

      <PromptInput
        accept="image/*,.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        multiple
        onSubmit={(_, event) => {
          event.preventDefault();
          submit();
        }}
        className="rounded-sm border-input bg-card shadow-none transition-colors focus-within:border-primary"
      >
        {attachments.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 px-3 pt-2.5">
            {attachments.map((att, i) => (
              <span
                key={`${att.name}-${i}`}
                className="flex items-center gap-2 rounded-md border border-border bg-muted/40 py-1 pl-2.5 pr-1 text-[12px] text-foreground/90"
              >
                <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <span className="max-w-[180px] truncate">{att.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAttachment(i)}
                  className="h-6 w-6 rounded-sm text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${att.name}`}
                >
                  <X className="h-3 w-3" />
                </Button>
              </span>
            ))}
          </div>
        )}

        <PromptInputTextarea
          ref={textareaRef}
          value={question}
          maxLength={MAX_PROMPT_CHARS}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={compact ? "Ask a follow-up…" : "Ask a legal question or request a draft…"}
          className={cn("max-h-44 px-5 py-5 text-[15px] leading-6 text-foreground placeholder:text-muted-foreground", compact ? "min-h-14" : "min-h-28")}
        />

        <PromptInputFooter className="border-t border-border px-3 py-2">
          <PromptInputTools>
            <PromptInputButton
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              aria-label="Attach document"
              tooltip="Attach document"
              className="text-muted-foreground hover:text-foreground"
            >
              {processing ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </PromptInputButton>

            {onModeChoiceChange && (
              <Select
                value={modeChoice}
                onValueChange={(v) => onModeChoiceChange(v as BackendModeChoice)}
              >
                <SelectTrigger
                  aria-label="Query mode"
                  className="h-8 w-auto min-w-0 max-w-[180px] gap-1 rounded-sm border-0 bg-transparent px-2 text-[12px] font-medium text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring shadow-none hover:bg-muted hover:text-foreground focus:ring-0 focus:ring-offset-0 sm:max-w-none"
                >
                  <span className="truncate">
                    <span className="text-muted-foreground/80">Mode: </span><SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[200px]">
                  {BACKEND_MODE_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {onEraChange && (
              <Select value={era} onValueChange={(v) => onEraChange(v as JurisprudenceEra)}>
                <SelectTrigger
                  aria-label="Jurisprudence era"
                  className={cn(
                    "h-8 w-auto min-w-0 max-w-[220px] gap-1 rounded-sm border-0 bg-transparent px-2 text-[12px] font-medium shadow-none focus-visible:ring-1 focus-visible:ring-ring hover:bg-muted hover:text-foreground focus:ring-0 focus:ring-offset-0 sm:max-w-none",
                    era === "all" ? "text-muted-foreground" : "bg-muted text-foreground",
                  )}
                >
                  <span className="truncate">
                    <span className="text-muted-foreground/80">Sources: </span><SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent align="start" className="min-w-[230px]">
                  {ERA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-[13px]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </PromptInputTools>

          <div className="flex shrink-0 items-center gap-2">
            <span
              className={cn(
                "hidden whitespace-nowrap text-[11px] tabular-nums transition-colors sm:inline",
                !nearLimit && "sm:hidden",
                overChar || overWord
                  ? "text-destructive"
                  : nearLimit
                    ? "text-muted-foreground"
                    : "text-muted-foreground",
              )}
              aria-live="polite"
            >
              {wordCount.toLocaleString()} / {MAX_PROMPT_WORDS.toLocaleString()} words
            </span>

            <span className="hidden text-[11px] text-muted-foreground md:inline">Enter to send</span>
            <PromptInputSubmit
              aria-label={loading ? "Stop" : "Send"}
              status={loading ? "streaming" : error ? "error" : "ready"}
              onStop={onStop}
              disabled={!loading && !canSend}
              className={cn(
                "size-8 rounded-sm",
                !loading && (canSend ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground opacity-60"),
                loading &&
                  "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20",
              )}
            />
          </div>
        </PromptInputFooter>
      </PromptInput>

      {(uploadError || error || overChar || overWord) && (
        <p className="mt-2.5 text-[13px] text-destructive">
          {uploadError ||
            error ||
            (overChar
              ? `Prompt exceeds the ${MAX_PROMPT_CHARS.toLocaleString()} character limit.`
              : `Prompt exceeds the ${MAX_PROMPT_WORDS.toLocaleString()} word limit.`)}
        </p>
      )}
    </section>
  );
}
