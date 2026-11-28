import { clerkToken } from "./backend";

/** Judgment PDFs are served only with a signed link token or the user's sign-in token. */
export function isBackendPdfUrl(href: string | null | undefined): boolean {
  if (!href) return false;
  try {
    const u = new URL(href, window.location.href);
    return /\/judgment-pdf\/|\/api\/judgments\/.+\/pdf$/.test(u.pathname);
  } catch {
    return false;
  }
}

/** Fetch a judgment PDF with the sign-in token; returns an object URL for the PDF. */
export async function fetchPdfObjectUrl(url: string, signal?: AbortSignal): Promise<string> {
  const token = await clerkToken();
  const res = await fetch(url, {
    signal,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });
  if (!res.ok) throw new Error(`PDF request failed with HTTP ${res.status}.`);
  const blob = await res.blob();
  const head = await blob.slice(0, 1024).text();
  if (!head.includes("%PDF-")) throw new Error("The server response was not a PDF document.");
  return URL.createObjectURL(new Blob([blob], { type: "application/pdf" }));
}

/** Open a judgment PDF in a new tab. The tab opens at once (popup blockers allow it) and
 *  shows the PDF when the authenticated download completes. */
export async function openPdf(url: string): Promise<void> {
  const win = window.open("", "_blank");
  if (win) {
    win.document.title = "Opening judgment…";
    win.document.body.style.font = "16px system-ui, sans-serif";
    win.document.body.textContent = "Opening judgment…";
  }
  try {
    const objectUrl = await fetchPdfObjectUrl(url);
    if (win) win.location.href = objectUrl;
    else window.location.href = objectUrl;
  } catch {
    if (win)
      win.document.body.textContent =
        "Could not open this judgment PDF. Please sign in again and retry.";
  }
}

let installed = false;

/** Route every click on a backend judgment-PDF link through openPdf. */
export function installPdfLinkInterceptor(): void {
  if (installed || typeof document === "undefined") return;
  installed = true;
  document.addEventListener(
    "click",
    (e) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)
        return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || !isBackendPdfUrl(a.href)) return;
      e.preventDefault();
      void openPdf(a.href);
    },
    true,
  );
}
