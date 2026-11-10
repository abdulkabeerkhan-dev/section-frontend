import { useEffect, useRef, useState } from "react";
import { Loader2, Paperclip, X, ArrowUp } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { BackendMode, JurisprudenceEra } from "@/lib/api";

export type BackendModeChoice = BackendMode | "auto";

export const ERA_OPTIONS: { value: JurisprudenceEra; label: string }[] = [
  { value: "all", label: "All Authorities (1947–2026)" },
  { value: "apex", label: "Apex Precedents Only (Supreme Court)" },
  { value: "modern", label: "Modern Jurisprudence (2018–Present)" },
];

export interface ComposerAttachment {
  name: string;
  image_base64?: string;
  image_mime_type?: string;
  file_base64?: string;
  file_mime_type?: string;
}

const MAX_RAW_BYTES = 25 * 1024 * 1024;
const MAX_DIMENSION = 2200;
const JPEG_QUALITY = 0.82;
const COMPRESS_THRESHOLD_BYTES = 900 * 1024;
const MAX_PROMPT_CHARS = 120_000;
const MAX_PROMPT_WORDS = 30_000;

interface ComposerProps {
  onSend: (question: string, attachments: ComposerAttachment[]) => void;
  loading: boolean;
  error: string;
  autoFocus?: boolean;
  compact?: boolean;
  seed?: { text: string; nonce: number } | null;
  onStop?: () => void;
  modeChoice?: BackendModeChoice;
  onModeChoiceChange?: (mode: BackendModeChoice) => void;
  era?: JurisprudenceEra;
  onEraChange?: (era: JurisprudenceEra) => void;
}

const IMAGE_MIME = /^image\/(jpeg|jpg|png|webp)$/i;
const IMAGE_EXT = /\.(jpe?g|png|webp)$/i;

function stripDataPrefix(dataUrl: string): string {
  const comma = dataUrl.indexOf(",");
  return comma >= 0 ? dataUrl.slice(comma + 1) : dataUrl;
}

function countWords(s: string): number {
  const trimmed = s.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function readAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not decode image"));
    img.src = src;
  });
}

async function imageToPayload(file: File): Promise<{ base64: string; mime: string }> {
  const dataUrl = await readAsDataURL(file);
  const fallbackMime = file.type || "image/jpeg";

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
    let { width, height } = img;
    if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
      if (width > height) {
        height = Math.round((height * MAX_DIMENSION) / width);
        width = MAX_DIMENSION;
      } else {
        width = Math.round((width * MAX_DIMENSION) / height);
        height = MAX_DIMENSION;
      }
    }
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
    ctx.drawImage(img, 0, 0, width, height);
    const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
    return { base64: stripDataPrefix(compressed), mime: "image/jpeg" };
  } catch {
    return { base64: stripDataPrefix(dataUrl), mime: fallbackMime };
  }
}

async function fileToPayload(file: File): Promise<ComposerAttachment> {
  if (IMAGE_MIME.test(file.type) || IMAGE_EXT.test(file.name)) {
    const { base64, mime } = await imageToPayload(file);
    return { name: file.name, image_base64: base64, image_mime_type: mime };
  }
  const dataUrl = await readAsDataURL(file);
  const mime = file.type || "application/octet-stream";
  return { name: file.name, file_base64: stripDataPrefix(dataUrl), file_mime_type: mime };
}

export function Composer({
  onSend,
  loading,
  error,
  autoFocus = false,
  compact = false,
  seed = null,
  onStop,
  modeChoice = "auto",
  onModeChoiceChange,
  era = "all",
  onEraChange,
}: ComposerProps) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<ComposerAttachment[]>([]);
  const [processing, setProcessing] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [segmentedMode, setSegmentedMode] = useState<"research" | "draft" | "summarize">("research");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (seed?.text) {
      setText(seed.text);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(seed.text.length, seed.text.length);
        }
      }, 50);
    }
  }, [seed]);

  // Auto-grow textarea with a minimum 2-row height and maximum 240px
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      const scrollH = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollH, 56), 240)}px`;
    }
  }, [text]);

  const wordCount = countWords(text);
  const charCount = text.length;
  const overChar = charCount > MAX_PROMPT_CHARS;
  const overWord = wordCount > MAX_PROMPT_WORDS;
  const canSend = (text.trim().length > 0 || attachments.length > 0) && !overChar && !overWord && !loading && !processing;

  function handleSend() {
    if (!canSend) return;
    const q = text.trim();
    const atts = [...attachments];
    setText("");
    setAttachments([]);
    onSend(q, atts);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setProcessing(true);
    setUploadError("");
    try {
      const added: ComposerAttachment[] = [];
      for (const f of files) {
        if (f.size > MAX_RAW_BYTES) {
          setUploadError(`"${f.name}" exceeds the 25 MB file limit.`);
          continue;
        }
        added.push(await fileToPayload(f));
      }
      setAttachments((prev) => [...prev, ...added]);
    } catch {
      setUploadError("Could not process attached file.");
    } finally {
      setProcessing(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="w-full">
      {/* Hidden file input */}
      <input
        ref={fileRef}
        type="file"
        multiple
        accept=".pdf,.docx,.doc,.txt,image/*"
        className="hidden"
        onChange={handleFileSelect}
        aria-label="Upload document or scan"
      />

      {/* Ask Box: --surface, 1px --ink border, soft shadow, radius 3px */}
      <div className="overflow-hidden rounded-[3px] border border-[var(--ink)] bg-[var(--surface)] shadow-[0_1px_4px_rgba(18,18,18,0.06)]">
        {/* Segmented Control on top row: Research | Draft | Summarize */}
        <div className="flex items-center justify-between border-b border-[var(--line)] bg-[var(--surface-2)] px-4 py-2">
          <div className="flex items-center gap-1 rounded-[3px] bg-[var(--chip-bg)] p-0.5">
            <button
              type="button"
              onClick={() => {
                setSegmentedMode("research");
                onModeChoiceChange?.("caselaw_search");
              }}
              className={cn(
                "rounded-[3px] px-3 py-1 font-sans text-[12px] font-semibold transition-all",
                segmentedMode === "research"
                  ? "bg-[var(--ink)] text-[var(--on-ink)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              Research
            </button>
            <button
              type="button"
              onClick={() => {
                setSegmentedMode("draft");
                onModeChoiceChange?.("drafting");
              }}
              className={cn(
                "rounded-[3px] px-3 py-1 font-sans text-[12px] font-semibold transition-all",
                segmentedMode === "draft"
                  ? "bg-[var(--ink)] text-[var(--on-ink)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              Draft
            </button>
            <button
              type="button"
              onClick={() => {
                setSegmentedMode("summarize");
                onModeChoiceChange?.("document_analysis");
              }}
              className={cn(
                "rounded-[3px] px-3 py-1 font-sans text-[12px] font-semibold transition-all",
                segmentedMode === "summarize"
                  ? "bg-[var(--ink)] text-[var(--on-ink)] shadow-sm"
                  : "text-[var(--text-muted)] hover:text-[var(--text)]",
              )}
            >
              Summarize
            </button>
          </div>

          <span className="font-sans text-[11px] text-[var(--text-muted)]">
            Press Enter ↵ to submit
          </span>
        </div>

        {/* Attachments preview */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-b border-[var(--line)] bg-[var(--surface-2)] p-2.5">
            {attachments.map((att, idx) => (
              <span
                key={idx}
                className="inline-flex items-center gap-1.5 rounded-[3px] border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1 font-sans text-[12px] text-[var(--text)]"
              >
                <Paperclip className="h-3 w-3 text-[var(--text-muted)]" />
                <span className="max-w-[200px] truncate">{att.name}</span>
                <button
                  type="button"
                  onClick={() => setAttachments((prev) => prev.filter((_, i) => i !== idx))}
                  className="text-[var(--text-muted)] hover:text-[var(--text)]"
                  aria-label={`Remove attachment ${att.name}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {/* Textarea Input Field */}
        <div className="p-4">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus={autoFocus}
            rows={2}
            placeholder="Ask a legal question, draft a pleading, or search across Pakistani case law and statutes..."
            className="w-full resize-none border-0 bg-transparent font-sans text-[15px] leading-relaxed text-[var(--text)] placeholder:text-[var(--text-muted)] focus:outline-none"
            aria-label="Legal query or drafting prompt"
          />
        </div>

        {/* Bottom controls row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--line)] bg-[var(--surface-2)] px-4 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={processing}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[3px] p-2 text-[var(--text-muted)] transition-colors hover:bg-[var(--chip-bg)] hover:text-[var(--ink)]"
              aria-label="Attach judgment or document file"
              title="Attach judgment or document file"
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Paperclip className="h-4 w-4" />
              )}
            </button>

            {onEraChange && (
              <Select value={era} onValueChange={(v) => onEraChange(v as JurisprudenceEra)}>
                <SelectTrigger
                  aria-label="Sources repository filter"
                  className="h-9 min-h-[36px] w-auto gap-1 rounded-[3px] border border-[var(--line)] bg-[var(--surface)] px-2.5 font-sans text-[12px] font-medium text-[var(--text)] focus:ring-0"
                >
                  <span className="text-[var(--text-muted)]">Sources: </span>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="rounded-[3px] border border-[var(--line)] bg-[var(--surface)]">
                  {ERA_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="font-sans text-[13px] text-[var(--text)]">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="flex items-center gap-3">
            {loading ? (
              <Button
                type="button"
                onClick={onStop}
                className="min-h-[44px] rounded-[3px] border border-[var(--warn-border)] bg-[var(--warn-bg)] px-5 font-sans text-[13px] font-medium text-[var(--warn-text)] hover:opacity-90"
                aria-label="Stop current query"
              >
                Stop
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleSend}
                disabled={!canSend}
                className={cn(
                  "min-h-[44px] min-w-[96px] gap-2 rounded-[3px] px-5 font-sans text-[13px] font-medium transition-all",
                  canSend
                    ? "bg-[var(--ink)] text-[var(--on-ink)] hover:bg-[var(--ink-2)]"
                    : "bg-[var(--chip-bg)] text-[var(--text-muted)] cursor-not-allowed opacity-60",
                )}
                aria-label="Submit query"
              >
                <span>Submit</span>
                <ArrowUp className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {(uploadError || error || overChar || overWord) && (
        <p className="mt-2 text-[13px] text-[var(--warn-text)]">
          {uploadError ||
            error ||
            (overChar
              ? `Prompt exceeds character limit (${MAX_PROMPT_CHARS.toLocaleString()}).`
              : `Prompt exceeds word limit (${MAX_PROMPT_WORDS.toLocaleString()}).`)}
        </p>
      )}
    </div>
  );
}
