import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/staff")({
  head: () => ({ meta: [{ title: "Staff — Shifa Queue" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell role="staff">
      <Outlet />
    </AppShell>
  ),
});
