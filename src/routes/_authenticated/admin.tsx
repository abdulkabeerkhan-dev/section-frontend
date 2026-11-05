import { createFileRoute } from "@tanstack/react-router";

import { AdminDashboard } from "@/components/amicus/admin/AdminDashboard";
import { SessionGuard } from "@/components/amicus/SessionGuard";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [
    { title: "Administration | Section" },
    { name: "description", content: "Manage Section associates and legal research usage." },
    { property: "og:title", content: "Administration | Section" },
    { property: "og:description", content: "Manage Section associates and legal research usage." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: AdminPage,
});

function AdminPage() {
  return (
    <SessionGuard requireAdmin>
      <AdminDashboard />
    </SessionGuard>
  );
}
