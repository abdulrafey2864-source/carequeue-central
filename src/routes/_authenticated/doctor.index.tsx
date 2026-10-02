import { createFileRoute } from "@tanstack/react-router";
import { PageTitle } from "@/components/AppShell";

export const Route = createFileRoute("/_authenticated/doctor/")({ component: Page });

function Page() {
  return (
    <div>
      <PageTitle sub="This workspace is being built next.">Dashboard</PageTitle>
    </div>
  );
}
