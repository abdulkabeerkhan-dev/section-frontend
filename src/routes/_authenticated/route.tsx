import { createFileRoute, Outlet } from "@tanstack/react-router";

// Auth is owned entirely by Clerk on the frontend. The per-page
// <SessionGuard> components handle redirecting unauthenticated users to
// /auth, so this layout simply renders its children.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: () => <Outlet />,
});
