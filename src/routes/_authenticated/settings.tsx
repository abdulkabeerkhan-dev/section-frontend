import { createFileRoute } from "@tanstack/react-router";

import { SettingsPage } from "@/components/amicus/SettingsPage";
import { SessionGuard } from "@/components/amicus/SessionGuard";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Account Settings | Section" },
    { name: "description", content: "Manage your Section account and legal workspace preferences." },
    { property: "og:title", content: "Account Settings | Section" },
    { property: "og:description", content: "Manage your Section account and legal workspace preferences." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsRoute,
});

function SettingsRoute() {
  return (
    <SessionGuard>
      <SettingsPage />
    </SessionGuard>
  );
}
