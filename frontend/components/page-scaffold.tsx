import { AppShell } from "@/components/app-shell";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import { history, searchResults, signals } from "@/lib/sample-data";

const pageContent = {
  upload: {
    title: "Document upload",
    description: "Validate files, prevent duplicate hashes, and queue extraction jobs.",
    primary: "Drop PDF, DOCX, TXT, Markdown, or image files here",
    detail: "Maximum file size: 25 MB. Image files are routed through OCR only when text extraction is necessary."
  },
  analysis: {
    title: "Document analysis",
    description: "Review extracted metadata, document type, and writing-style probability.",
    primary: "AI-likelihood estimate: 68%",
    detail: "Confidence: Moderate. Signals are explanatory and uncertain, never a perfect yes/no detector."
  },
  search: {
    title: "Semantic search",
    description: "Search by meaning, concepts, entities, and sections across uploaded documents.",
    primary: "Search documents by natural language",
    detail: "Results include document name, page or section, excerpt, and retrieval score."
  },
  qa: {
    title: "Document Q&A",
    description: "Ask questions with retrieval-augmented answers and citations.",
    primary: "What are the termination requirements?",
    detail: "Answers include cited excerpts and a confidence label based on retrieval quality."
  },
  history: {
    title: "Processing history",
    description: "Track queued, processing, completed, and failed documents.",
    primary: "5 recent documents",
    detail: "Use this view to inspect report availability and processing status."
  },
  admin: {
    title: "Admin dashboard",
    description: "Manage users, documents, and audit events.",
    primary: "Admin controls",
    detail: "Role-based access should protect this route once authentication is connected."
  }
};

export function PageScaffold({ page }: Readonly<{ page: keyof typeof pageContent }>) {
  const content = pageContent[page];

  return (
    <AppShell>
      <div className="mx-auto grid max-w-[1280px] gap-5 p-5">
        <section className="rounded-lg border border-line bg-white p-6 shadow-panel">
          <h1 className="text-3xl font-bold">{content.title}</h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">{content.description}</p>
        </section>
        <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
          <Card className="p-6">
            <p className="text-lg font-semibold">{content.primary}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{content.detail}</p>
            <div className="mt-6 rounded-md border border-dashed border-teal/50 bg-teal/5 p-6">
              <p className="text-sm font-semibold text-teal">Workflow state</p>
              <div className="mt-4 grid gap-3 sm:grid-cols-4">
                {["Validate", "Extract", "Analyze", "Index"].map((step, index) => (
                  <div key={step} className="rounded-md border border-line bg-white p-3">
                    <p className="text-xs text-muted">Step {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          </Card>
          <Card>
            <CardHeader title={page === "analysis" ? "Primary signals" : "Recent evidence"} />
            <div className="space-y-4 p-5">
              {(page === "analysis" ? signals.slice(0, 4) : searchResults).map((item) =>
                "label" in item ? (
                  <div key={item.label} className="grid grid-cols-[150px_1fr_40px] items-center gap-3">
                    <span className="text-sm">{item.label}</span>
                    <ProgressBar value={item.value} tone={item.tone === "amber" ? "amber" : "teal"} />
                    <span className="text-right text-sm">{item.value}</span>
                  </div>
                ) : (
                  <article key={item.document} className="rounded-md border border-line p-3">
                    <div className="flex justify-between gap-3">
                      <p className="text-sm font-semibold">{item.document}</p>
                      <Badge tone="blue">{item.score.toFixed(2)}</Badge>
                    </div>
                    <p className="mt-2 text-xs leading-5 text-slate-600">{item.excerpt}</p>
                  </article>
                )
              )}
            </div>
          </Card>
        </div>
        <Card>
          <CardHeader title="Relevant documents" />
          <div className="divide-y divide-line">
            {history.slice(0, 4).map((item) => (
              <div key={item.document} className="grid grid-cols-[1fr_120px_120px_120px] items-center gap-4 px-5 py-3 text-sm">
                <span className="font-medium">{item.document}</span>
                <span>{item.type}</span>
                <span>{item.likelihood}</span>
                <Badge tone={item.status === "Completed" ? "green" : "blue"}>{item.status}</Badge>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
