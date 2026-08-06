import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function HistoryPage() {
  return (
    <AppShell>
      <WorkspacePage mode="history" />
    </AppShell>
  );
}
