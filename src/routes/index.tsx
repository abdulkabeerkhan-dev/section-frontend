import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Section: AI Legal Partner for Pakistani Lawyers" },
      {
        name: "description",
        content:
          "Section is a private AI legal partner for Pakistani lawyers, with cited case law and court ready drafts. Invitation only.",
      },
      { property: "og:title", content: "Section: AI Legal Partner" },
      {
        property: "og:description",
        content: "Cited case law and court ready drafts, built for Pakistan.",
      },
    ],
  }),
  component: () => null,
});
