import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, HeadContent, Scripts, type ErrorComponentProps } from "@tanstack/react-router";
import { ClerkProvider } from "@clerk/clerk-react";
import { useEffect, type ReactNode } from "react";

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

function ErrorComponent({ error }: ErrorComponentProps): any {
  console.error(error);
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <TooltipProvider>
      <div className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            This page didn't load
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Something went wrong on our end. You can try refreshing or head back home.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Try again
            </button>
            <a
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-[13px] font-medium tracking-[0.01em] text-foreground transition-colors hover:bg-accent"
            >
              Go home
            </a>
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
        href: "https://large-rodent-38.clerk.accounts.dev",
        crossOrigin: "anonymous",
      },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;450;500;600&family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400&family=IBM+Plex+Mono:wght@400;500&display=swap",
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
    <html lang="en">
      <head>
        <HeadContent />
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
