import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { useEffect, type ReactNode } from "react";

import { installPdfLinkInterceptor } from "@/lib/pdf-open";

import appCss from "../styles.css?url";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/lib/theme";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

// Automatically reload on Vite preload failures (e.g. after a new deployment or on transient network interruption)
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", (event) => {
    event.preventDefault();
    const retryKey = "chunk_retry_attempted";
    const alreadyRetried = sessionStorage.getItem(retryKey) === "true";
    if (!alreadyRetried) {
      sessionStorage.setItem(retryKey, "true");
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
      const url = new URL(window.location.href);
      url.searchParams.set("_v", String(Date.now()));
      window.location.replace(url.toString());
    }
  });
}

function ErrorComponent({ error }: ErrorComponentProps): any {
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  const errorMessage =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "An unexpected error occurred.";

  const errorStack = error instanceof Error ? error.stack : null;

  const isChunkLoadError =
    errorMessage.includes("dynamically imported module") ||
    errorMessage.includes("Failed to fetch") ||
    errorMessage.includes("Loading chunk") ||
    errorMessage.includes("error loading dynamically imported module");

  // Auto-recover from dynamic module import network failures (retry once only to prevent infinite reload loops)
  useEffect(() => {
    if (isChunkLoadError && typeof window !== "undefined") {
      const retryKey = "chunk_retry_attempted";
      const alreadyRetried = sessionStorage.getItem(retryKey) === "true";
      if (!alreadyRetried) {
        sessionStorage.setItem(retryKey, "true");
        if ("caches" in window) {
          caches.keys().then((keys) => {
            keys.forEach((key) => caches.delete(key));
          }).catch(() => {});
        }
        const url = new URL(window.location.href);
        url.searchParams.set("_v", String(Date.now()));
        window.location.replace(url.toString());
      }
    }
  }, [errorMessage, isChunkLoadError]);

  const handleHardReload = () => {
    try {
      sessionStorage.removeItem("chunk_retry_attempted");
      sessionStorage.clear();
      if ("caches" in window) {
        caches.keys().then((keys) => {
          keys.forEach((key) => caches.delete(key));
        }).catch(() => {});
      }
    } catch {}
    const url = new URL(window.location.href);
    url.searchParams.set("_v", String(Date.now()));
    window.location.replace(url.toString());
  };

  return (
    <TooltipProvider>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            {isChunkLoadError ? "New Version Available" : "This page didn't load"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {isChunkLoadError
              ? "Section was updated. Tap below to reload and fetch the latest version."
              : "Something went wrong on our end. You can try refreshing or head back to the workspace."}
          </p>
          {errorMessage && (
            <div className="mt-4 rounded-md border border-destructive/20 bg-destructive/10 p-3 text-left">
              <p className="text-xs font-mono text-destructive break-all">{errorMessage}</p>
              {errorStack && (
                <details className="mt-2 text-[11px] text-muted-foreground">
                  <summary className="cursor-pointer font-medium hover:text-foreground">
                    Technical details
                  </summary>
                  <pre className="mt-1 max-h-40 overflow-auto whitespace-pre-wrap font-mono text-[10px]">
                    {errorStack}
                  </pre>
                </details>
              )}
            </div>
          )}
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={handleHardReload}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              {isChunkLoadError ? "Reload latest version" : "Try again"}
            </button>
            <button
              onClick={() => {
                try {
                  sessionStorage.clear();
                } catch {}
                window.location.href = "/app?t=" + Date.now();
              }}
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-foreground transition-colors hover:bg-accent"
            >
              Go to workspace
            </button>
            <button
              onClick={() => {
                try {
                  localStorage.clear();
                  sessionStorage.clear();
                } catch {}
                window.location.href = "/auth";
              }}
              className="inline-flex items-center justify-center rounded-md border border-border px-4 py-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Reset session
            </button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Section: AI Legal Research & Drafting for Pakistani Lawyers" },
      {
        name: "description",
        content:
          "Section helps Pakistani lawyers find real, cited case law and generate court-ready drafts. Real precedent. Court-ready drafts. No invented cases.",
      },
      { name: "author", content: "Section" },
      {
        property: "og:title",
        content: "Section: AI Legal Research & Drafting for Pakistani Lawyers",
      },
      {
        property: "og:description",
        content: "Real precedent. Court-ready drafts. No invented cases.",
      },
      { property: "og:type", content: "website" },
      { property: "og:site_name", content: "Section" },
      { name: "twitter:card", content: "summary" },
      {
        name: "twitter:title",
        content: "Section: AI Legal Research & Drafting for Pakistani Lawyers",
      },
      {
        name: "twitter:description",
        content:
          "AI legal assistant for Pakistani lawyers, providing real case law and court-ready document drafts.",
      },
      {
        property: "og:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cbb05485-9bbd-4325-9cc3-728c6ba3c74c/id-preview-2c93a741--1f723590-af88-4977-9e0f-b0be0f5b7ef9.lovable.app-1781214067454.png",
      },
      {
        name: "twitter:image",
        content:
          "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/cbb05485-9bbd-4325-9cc3-728c6ba3c74c/id-preview-2c93a741--1f723590-af88-4977-9e0f-b0be0f5b7ef9.lovable.app-1781214067454.png",
      },
      {
        name: "description",
        content:
          "AI legal assistant for Pakistani lawyers, providing real case law and court-ready document drafts.",
      },
      {
        property: "og:description",
        content:
          "AI legal assistant for Pakistani lawyers, providing real case law and court-ready document drafts.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
      { rel: "apple-touch-icon", href: "/favicon.svg" },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "preconnect",
        href: "https://clerk.sectionai.net",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Archivo:wght@900&family=Geist:wght@300;400;500;600&family=Instrument+Serif:ital@0;1&family=Oswald:wght@300;400&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{var t=localStorage.getItem('amicus-theme');var d=t?t==='dark':matchMedia('(prefers-color-scheme: dark)').matches;var c=document.documentElement.classList;c.toggle('dark',d);c.toggle('light',!d)}catch(e){}",
          }}
        />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  // Judgment PDF links open through an authenticated download (no anonymous PDF access).
  useEffect(() => {
    installPdfLinkInterceptor();
  }, []);

  useEffect(() => {
    try {
      sessionStorage.removeItem("chunk_retry_attempted");
      sessionStorage.removeItem("vite_preload_reload");
      const keys = Object.keys(sessionStorage);
      for (const k of keys) {
        if (k.startsWith("chunk_failed_reload_")) {
          sessionStorage.removeItem(k);
        }
      }
    } catch {}
  }, []);

  return (
    <ClerkProvider
      publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY}
      signUpUrl={import.meta.env.VITE_CLERK_SIGN_UP_URL || "/accept-invitation"}
    >
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <TooltipProvider>
            {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
            <Outlet />
            <Toaster />
          </TooltipProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </ClerkProvider>
  );
}
