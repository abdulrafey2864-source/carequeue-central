import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/patient")({
  head: () => ({ meta: [{ title: "Patient — Shifa Queue" }, { name: "robots", content: "noindex" }] }),
  component: () => (
    <AppShell role="patient">
      <Outlet />
    </AppShell>
  ),
});
