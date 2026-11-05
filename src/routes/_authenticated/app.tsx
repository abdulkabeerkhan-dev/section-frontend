import { createFileRoute } from "@tanstack/react-router";

import { QueryWorkspace } from "@/components/amicus/QueryWorkspace";
import { SessionGuard } from "@/components/amicus/SessionGuard";
import { PleadingCanvas } from "@/components/amicus/PleadingCanvas";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Legal Research Workspace | Section" },
      {
        name: "description",
        content: "Research Pakistani case law and prepare court-ready legal drafts in Section.",
      },
      { property: "og:title", content: "Legal Research Workspace | Section" },
      {
        property: "og:description",
        content: "Research Pakistani case law and prepare court-ready legal drafts in Section.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AppPage,
});

function AppPage() {
  return (
    <SessionGuard>
      <QueryWorkspace />
      <PleadingCanvas />
    </SessionGuard>
  );
}
