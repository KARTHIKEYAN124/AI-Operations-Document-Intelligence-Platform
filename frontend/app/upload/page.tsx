import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";

export default function UploadPage() {
  return (
    <AppShell>
      <WorkspacePage mode="upload" />
    </AppShell>
  );
}
