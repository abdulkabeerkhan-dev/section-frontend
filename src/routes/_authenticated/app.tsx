import { createFileRoute, redirect } from "@tanstack/react-router";

// There is no general chat window: the workspace is Jurist (research), and Counsel (drafting) has
// its own page. Old links, sign-in and invitations that point at /app land on Jurist.
export const Route = createFileRoute("/_authenticated/app")({
  beforeLoad: () => {
    throw redirect({ to: "/assistants/ark", replace: true });
  },
});
