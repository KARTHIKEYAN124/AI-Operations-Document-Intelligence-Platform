import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function AnalysisPage() {
  return (
    <AppShell>
      <WorkspacePage mode="analysis" />
    </AppShell>
  );
}
