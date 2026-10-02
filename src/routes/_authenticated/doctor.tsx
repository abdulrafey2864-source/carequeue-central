import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/doctor")({
  head: () => ({ meta: [{ title: "Doctor — Shifa Queue" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell role="doctor">
      <Outlet />
    </AppShell>
  ),
});
