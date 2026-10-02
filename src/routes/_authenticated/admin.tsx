import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Shifa Queue" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell role="admin">
      <Outlet />
    </AppShell>
  ),
});
