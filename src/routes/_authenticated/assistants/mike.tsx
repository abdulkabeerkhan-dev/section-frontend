import { createFileRoute } from "@tanstack/react-router";

import { QueryWorkspace } from "@/components/amicus/QueryWorkspace";
import { SessionGuard } from "@/components/amicus/SessionGuard";
import { PleadingCanvas } from "@/components/amicus/PleadingCanvas";
import { AssistantProvider } from "@/lib/assistant";

export const Route = createFileRoute("/_authenticated/assistants/mike")({
  head: () => ({
    meta: [
      { title: "Counsel | Courtroom Litigation & Drafting Specialist | Section" },
      { name: "description", content: "Court pleadings, plaints, written statements, bail and writ petitions." },
      { property: "og:title", content: "Counsel | Section" },
      { property: "og:description", content: "Court pleadings, plaints, written statements, bail and writ petitions." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <SessionGuard>
      <AssistantProvider id="mike">
        <QueryWorkspace />
        <PleadingCanvas />
      </AssistantProvider>
    </SessionGuard>
  ),
});
