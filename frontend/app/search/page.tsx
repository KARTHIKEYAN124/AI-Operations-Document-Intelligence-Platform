import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function SearchPage() {
  return (
    <AppShell>
      <WorkspacePage mode="search" />
    </AppShell>
  );
}
