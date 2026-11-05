import { createFileRoute, redirect } from "@tanstack/react-router";

// "What Section remembers" now lives in Settings → Memory.
export const Route = createFileRoute("/_authenticated/memory")({
  beforeLoad: () => {
    throw redirect({ to: "/settings" });
  },
});
