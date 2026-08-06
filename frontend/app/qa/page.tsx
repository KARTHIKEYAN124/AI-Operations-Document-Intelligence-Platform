import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function QaPage() {
  return (
    <AppShell>
      <WorkspacePage mode="qa" />
    </AppShell>
  );
}
