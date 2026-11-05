import { createFileRoute } from "@tanstack/react-router";

import { QueryWorkspace } from "@/components/amicus/QueryWorkspace";
import { SessionGuard } from "@/components/amicus/SessionGuard";
import { PleadingCanvas } from "@/components/amicus/PleadingCanvas";
import { AssistantProvider } from "@/lib/assistant";

export const Route = createFileRoute("/_authenticated/assistants/ark")({
  head: () => ({
    meta: [
      { title: "Jurist | Chief Legal Research Specialist | Section" },
      { name: "description", content: "Case law, statutory analysis and ratio decidendi with cited answers." },
      { property: "og:title", content: "Jurist | Section" },
      { property: "og:description", content: "Case law, statutory analysis and ratio decidendi with cited answers." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <AssistantProvider id="ark">
        <QueryWorkspace />
        <PleadingCanvas />
      </AssistantProvider>
    </SessionGuard>
  ),
});
