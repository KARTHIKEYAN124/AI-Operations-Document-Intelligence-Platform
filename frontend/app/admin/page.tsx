import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function AdminPage() {
  return (
    <AppShell>
      <WorkspacePage mode="admin" />
    </AppShell>
  );
}
