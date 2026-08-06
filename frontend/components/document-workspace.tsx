"use client";

import { ChangeEvent, DragEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  FileText,
  Loader2,
  MessageSquareText,
  Search,
  Trash2,
  UploadCloud,
  Users
} from "lucide-react";
import { analyzePlainText, answerQuestion, searchDocuments, type AnalyzedDocument, type AnalyzeResponse, type TextChunk } from "@/lib/document-analysis";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

type WorkspaceMode = "upload" | "analysis" | "search" | "qa" | "history" | "admin";
type UploadStatus = "Uploading" | "Processing" | "Analysis ready" | "Needs review" | "Failed";
type UploadItem = {
  id: string;
  filename: string;
  sizeBytes: number;
  status: UploadStatus;
  progress: number;
  error?: string;
  document?: AnalyzedDocument;
};

const STORAGE_KEY = "aiops-analyzed-documents";

const pageMeta = {
  upload: ["Upload", "Add files, validate them, extract text, and create analysis records."],
  analysis: ["Analysis", "Review document type, key information, writing-style signals, and uncertainty."],
  search: ["Search", "Search across uploaded documents by keyword, topic, filename, or extracted passage."],
  qa: ["Q&A", "Ask questions against a selected uploaded document and see cited passages."],
  history: ["History", "Review every processed upload and reopen prior analysis results."],
  admin: ["Admin", "Manage the local workspace, inspect document status, and clear session data."]
} satisfies Record<WorkspaceMode, [string, string]>;

export function WorkspacePage({ mode }: Readonly<{ mode: WorkspaceMode }>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [documents, setDocuments] = useStoredDocuments();
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [query, setQuery] = useState("");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<ReturnType<typeof answerQuestion>>(null);

  const selectedDocument = useMemo(() => documents.find((document) => document.id === selectedId) ?? documents[0], [documents, selectedId]);
  const searchResults = useMemo(() => searchDocuments(documents, query), [documents, query]);
  const [title, description] = pageMeta[mode];

  useEffect(() => {
    if (!selectedId && documents[0]) setSelectedId(documents[0].id);
  }, [documents, selectedId]);

  async function analyzeFiles(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const id = crypto.randomUUID();
      setQueue((current) => [{ id, filename: file.name, sizeBytes: file.size, status: "Uploading", progress: 20 }, ...current]);

      try {
        setQueue((current) => current.map((item) => (item.id === id ? { ...item, status: "Processing", progress: 58 } : item)));
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch("/api/analyze", { method: "POST", body: formData });
        const payload = (await response.json()) as AnalyzeResponse;
        if (!payload.ok) throw new Error(payload.error);

        const document = await completeWithBrowserOcr(file, payload.document);
        setDocuments((current) => [document, ...current.filter((item) => item.filename !== document.filename)]);
        setSelectedId(document.id);
        setQueue((current) =>
          current.map((item) => (item.id === id ? { ...item, status: document.status, progress: 100, document } : item))
        );
      } catch (error) {
        setQueue((current) =>
          current.map((item) =>
            item.id === id ? { ...item, status: "Failed", progress: 100, error: error instanceof Error ? error.message : "Upload failed" } : item
          )
        );
      }
    }
  }

  function onInputChange(event: ChangeEvent<HTMLInputElement>) {
    if (event.target.files) void analyzeFiles(event.target.files);
    event.target.value = "";
  }

  function onDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    if (event.dataTransfer.files.length > 0) void analyzeFiles(event.dataTransfer.files);
  }

  function removeDocument(id: string) {
    setDocuments((current) => current.filter((document) => document.id !== id));
    if (selectedId === id) setSelectedId(null);
  }

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f5f7fa]">
      <PageHeader title={title} description={description} documents={documents} queue={queue} />
      <div className="mx-auto max-w-[1500px] p-5">
        {mode === "upload" ? (
          <UploadView
            inputRef={inputRef}
            queue={queue}
            documents={documents}
            selectedId={selectedDocument?.id}
            isDragging={isDragging}
            onBrowse={() => inputRef.current?.click()}
            onFileChange={onInputChange}
            onDrop={onDrop}
            onDragOver={(event) => {
              event.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onSelect={setSelectedId}
          />
        ) : null}
        {mode === "analysis" ? <AnalysisView documents={documents} selectedDocument={selectedDocument} onSelect={setSelectedId} /> : null}
        {mode === "search" ? <SearchView query={query} setQuery={setQuery} results={searchResults} documents={documents} /> : null}
        {mode === "qa" ? (
          <QaView
            documents={documents}
            selectedDocument={selectedDocument}
            onSelect={setSelectedId}
            question={question}
            setQuestion={setQuestion}
            answer={answer}
            onAsk={() => setAnswer(answerQuestion(selectedDocument, question))}
          />
        ) : null}
        {mode === "history" ? <HistoryView documents={documents} onSelect={setSelectedId} onRemove={removeDocument} /> : null}
        {mode === "admin" ? <AdminView documents={documents} queue={queue} onClear={() => setDocuments([])} onRemove={removeDocument} /> : null}
      </div>
    </div>
  );
}

function useStoredDocuments() {
  const [documents, setDocuments] = useState<AnalyzedDocument[]>([]);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return;
    try {
      setDocuments(JSON.parse(saved) as AnalyzedDocument[]);
    } catch {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(documents));
  }, [documents]);

  return [documents, setDocuments] as const;
}

function PageHeader({
  title,
  description,
  documents,
  queue
}: Readonly<{ title: string; description: string; documents: AnalyzedDocument[]; queue: UploadItem[] }>) {
  const processing = queue.filter((item) => item.status === "Uploading" || item.status === "Processing").length;
  return (
    <section className="border-b border-line bg-white px-5 py-4">
      <div className="mx-auto flex max-w-[1500px] flex-wrap items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-muted">{description}</p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2 text-xs">
          <Badge tone="blue">{documents.length} documents</Badge>
          <Badge tone="green">{documents.filter((document) => document.status === "Analysis ready").length} ready</Badge>
          <Badge tone={processing ? "amber" : "neutral"}>{processing} processing</Badge>
        </div>
      </div>
    </section>
  );
}

function UploadView({
  inputRef,
  queue,
  documents,
  selectedId,
  isDragging,
  onBrowse,
  onFileChange,
  onDrop,
  onDragOver,
  onDragLeave,
  onSelect
}: Readonly<{
  inputRef: React.RefObject<HTMLInputElement | null>;
  queue: UploadItem[];
  documents: AnalyzedDocument[];
  selectedId?: string;
  isDragging: boolean;
  onBrowse: () => void;
  onFileChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onDrop: (event: DragEvent<HTMLLabelElement>) => void;
  onDragOver: (event: DragEvent<HTMLLabelElement>) => void;
  onDragLeave: () => void;
  onSelect: (id: string) => void;
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[430px_1fr]">
      <Card className="p-5">
        <label
          className={cn(
            "grid min-h-[320px] cursor-pointer place-items-center rounded-lg border border-dashed p-6 text-center transition",
            isDragging ? "border-teal bg-teal/10" : "border-teal/60 bg-white hover:bg-teal/5"
          )}
          onDrop={onDrop}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
        >
          <input ref={inputRef} className="hidden" type="file" multiple accept=".pdf,.docx,.txt,.md,.markdown,.png,.jpg,.jpeg,.tif,.tiff" onChange={onFileChange} />
          <span>
            <UploadCloud className="mx-auto text-teal" size={64} />
            <span className="mt-5 block text-xl font-bold">Drop files to analyze</span>
            <span className="mt-2 block text-sm text-muted">TXT, Markdown, DOCX, selectable PDFs, and scanned PDFs/images are extracted with text parsing plus OCR.</span>
            <button type="button" className="mt-5 rounded-md bg-teal px-5 py-2.5 text-sm font-semibold text-white" onClick={onBrowse}>
              Browse files
            </button>
          </span>
        </label>
      </Card>
      <Card>
        <CardHeader title="Upload queue and recent documents" />
        <div className="divide-y divide-line">
          {[...queue, ...documents.filter((document) => !queue.some((item) => item.document?.id === document.id)).map(documentToQueueItem)].map((item) => (
            <button key={item.id} className="grid w-full grid-cols-[28px_1fr_160px] items-center gap-3 px-5 py-4 text-left hover:bg-slate-50" onClick={() => item.document && onSelect(item.document.id)}>
              {item.status === "Failed" ? <AlertTriangle className="text-red-500" size={22} /> : item.status === "Analysis ready" ? <CheckCircle2 className="text-emerald-600" size={22} /> : <Loader2 className="animate-spin text-teal" size={22} />}
              <div className="min-w-0">
                <p className={cn("truncate text-sm font-semibold", selectedId === item.document?.id && "text-teal")}>{item.filename}</p>
                <p className="mt-1 text-xs text-muted">{formatBytes(item.sizeBytes)}</p>
                {item.error ? <p className="mt-1 text-xs text-red-600">{item.error}</p> : null}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs">
                  <span>{item.status}</span>
                  <span>{item.progress}%</span>
                </div>
                <div className="mt-2">
                  <ProgressBar value={item.progress} tone={item.status === "Analysis ready" ? "green" : item.status === "Failed" ? "amber" : "teal"} />
                </div>
              </div>
            </button>
          ))}
          {queue.length === 0 && documents.length === 0 ? <EmptyState title="No uploads yet" body="Choose a document to create your first analysis record." /> : null}
        </div>
      </Card>
    </div>
  );
}

function AnalysisView({
  documents,
  selectedDocument,
  onSelect
}: Readonly<{ documents: AnalyzedDocument[]; selectedDocument?: AnalyzedDocument; onSelect: (id: string) => void }>) {
  if (!selectedDocument) return <EmptyState title="No analysis yet" body="Upload a document first, then return here to review the report." icon={<BarChart3 size={42} />} />;

  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr_380px]">
      <DocumentList documents={documents} selectedId={selectedDocument.id} onSelect={onSelect} />
      <Card className="overflow-hidden">
        <CardHeader title="Analysis report" />
        <div className="grid gap-5 p-5 lg:grid-cols-[1fr_220px]">
          <div>
            <h2 className="text-xl font-bold">{selectedDocument.filename}</h2>
            <p className="mt-1 text-sm text-muted">{selectedDocument.wordCount.toLocaleString()} words - {selectedDocument.documentType}</p>
            <h3 className="mt-6 text-sm font-bold">Key information</h3>
            <div className="mt-3 overflow-hidden rounded-lg border border-line">
              {selectedDocument.keyInformation.map((item) => (
                <div key={item.label} className="grid grid-cols-[150px_1fr] border-b border-line last:border-b-0">
                  <div className="bg-slate-50 px-4 py-3 text-xs font-semibold uppercase text-slate-500">{item.label}</div>
                  <div className="px-4 py-3 text-sm">{item.value}</div>
                </div>
              ))}
            </div>
          </div>
          <ProbabilityCard document={selectedDocument} />
        </div>
        <div className="border-t border-line p-5">
          <h3 className="text-sm font-bold">Extracted text</h3>
          <div className="mt-3 max-h-[420px] overflow-auto rounded-lg border border-line p-4 text-sm leading-6">
            {selectedDocument.extractedText ? <pre className="whitespace-pre-wrap font-sans">{selectedDocument.extractedText}</pre> : <p className="text-amber-700">{selectedDocument.limitations[0] ?? "No extractable text."}</p>}
          </div>
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-base font-bold">Writing-style signals</h2>
        <SignalList document={selectedDocument} />
      </Card>
    </div>
  );
}

function SearchView({
  query,
  setQuery,
  results,
  documents
}: Readonly<{ query: string; setQuery: (value: string) => void; results: TextChunk[]; documents: AnalyzedDocument[] }>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card className="p-5">
        <h2 className="text-lg font-bold">Semantic-style search</h2>
        <label className="mt-4 flex h-12 items-center gap-3 rounded-md border border-line px-4">
          <Search size={20} className="text-muted" />
          <input className="min-w-0 flex-1 outline-none" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by topic, keyword, filename, person, date, or phrase..." />
        </label>
        <div className="mt-5 grid gap-3">
          {results.map((result) => (
            <article key={result.id} className="rounded-lg border border-line bg-white p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-teal">{result.section}</p>
                <Badge tone="blue">Score {(result.score ?? 0).toFixed(2)}</Badge>
              </div>
              <p className="mt-2 text-sm leading-6 text-slate-700">{result.text}</p>
            </article>
          ))}
          {query && results.length === 0 ? <EmptyState title="No matches" body="Try a word or phrase that appears in extracted text." /> : null}
          {!query ? <EmptyState title="Search your uploaded documents" body="Upload documents first, then enter a query to retrieve matching excerpts." /> : null}
        </div>
      </Card>
      <DocumentStats documents={documents} />
    </div>
  );
}

function QaView({
  documents,
  selectedDocument,
  onSelect,
  question,
  setQuestion,
  answer,
  onAsk
}: Readonly<{
  documents: AnalyzedDocument[];
  selectedDocument?: AnalyzedDocument;
  onSelect: (id: string) => void;
  question: string;
  setQuestion: (value: string) => void;
  answer: ReturnType<typeof answerQuestion>;
  onAsk: () => void;
}>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[320px_1fr]">
      <DocumentList documents={documents} selectedId={selectedDocument?.id} onSelect={onSelect} />
      <Card className="p-5">
        <h2 className="text-lg font-bold">Ask this document</h2>
        <p className="mt-1 text-sm text-muted">{selectedDocument ? selectedDocument.filename : "Select or upload a document first."}</p>
        <div className="mt-5 flex gap-3">
          <input className="h-12 min-w-0 flex-1 rounded-md border border-line px-4 outline-none focus:border-teal" value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onAsk()} placeholder="Ask for a summary, dates, requirements, risks, or key facts..." />
          <button className="rounded-md bg-teal px-6 font-semibold text-white disabled:opacity-50" onClick={onAsk} disabled={!selectedDocument}>Ask</button>
        </div>
        <div className="mt-6 rounded-lg border border-line bg-slate-50 p-5">
          {answer ? (
            <>
              <p className="text-sm leading-6">{answer.answer}</p>
              <p className="mt-3 text-xs text-muted">Confidence: {answer.confidence} - Citation: {answer.citation?.section ?? "No citation"}</p>
            </>
          ) : (
            <p className="text-sm text-muted">Answers use the extracted text chunks stored in this browser session.</p>
          )}
        </div>
      </Card>
    </div>
  );
}

function HistoryView({
  documents,
  onSelect,
  onRemove
}: Readonly<{ documents: AnalyzedDocument[]; onSelect: (id: string) => void; onRemove: (id: string) => void }>) {
  return (
    <Card>
      <CardHeader title="Processing history" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] text-sm">
          <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
            <tr>
              {["Document", "Type", "Words", "AI likelihood", "Uncertainty", "Status", "Uploaded", "Actions"].map((header) => (
                <th key={header} className="px-5 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {documents.map((document) => (
              <tr key={document.id}>
                <td className="px-5 py-3 font-semibold">{document.filename}</td>
                <td className="px-5 py-3">{document.documentType}</td>
                <td className="px-5 py-3">{document.wordCount}</td>
                <td className="px-5 py-3">{document.aiLikelihood}%</td>
                <td className="px-5 py-3">+/-{document.uncertainty}%</td>
                <td className="px-5 py-3"><Badge tone={document.status === "Analysis ready" ? "green" : "amber"}>{document.status}</Badge></td>
                <td className="px-5 py-3">{new Date(document.uploadedAt).toLocaleString()}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-2">
                    <button className="rounded border border-line px-3 py-1 text-xs font-semibold" onClick={() => onSelect(document.id)}>Open</button>
                    <button className="rounded border border-red-200 px-3 py-1 text-xs font-semibold text-red-600" onClick={() => onRemove(document.id)}>Delete</button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {documents.length === 0 ? <EmptyState title="No history yet" body="Processed documents will appear here." /> : null}
      </div>
    </Card>
  );
}

function AdminView({
  documents,
  queue,
  onClear,
  onRemove
}: Readonly<{ documents: AnalyzedDocument[]; queue: UploadItem[]; onClear: () => void; onRemove: (id: string) => void }>) {
  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_360px]">
      <Card>
        <CardHeader title="Document administration" />
        <div className="divide-y divide-line">
          {documents.map((document) => (
            <div key={document.id} className="grid gap-3 px-5 py-4 md:grid-cols-[1fr_160px_120px] md:items-center">
              <div>
                <p className="font-semibold">{document.filename}</p>
                <p className="text-sm text-muted">{document.documentType} - {formatBytes(document.sizeBytes)}</p>
              </div>
              <Badge tone={document.status === "Analysis ready" ? "green" : "amber"}>{document.status}</Badge>
              <button className="flex items-center justify-center gap-2 rounded-md border border-red-200 px-3 py-2 text-sm font-semibold text-red-600" onClick={() => onRemove(document.id)}>
                <Trash2 size={16} />
                Remove
              </button>
            </div>
          ))}
          {documents.length === 0 ? <EmptyState title="No managed documents" body="Upload files to populate the admin table." /> : null}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="text-base font-bold">Workspace controls</h2>
        <div className="mt-5 grid gap-3">
          <Metric label="Documents" value={documents.length.toString()} />
          <Metric label="Ready" value={documents.filter((document) => document.status === "Analysis ready").length.toString()} />
          <Metric label="Queue items" value={queue.length.toString()} />
        </div>
        <button className="mt-5 w-full rounded-md border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600" onClick={onClear}>
          Clear browser session
        </button>
      </Card>
    </div>
  );
}

function DocumentList({ documents, selectedId, onSelect }: Readonly<{ documents: AnalyzedDocument[]; selectedId?: string; onSelect: (id: string) => void }>) {
  return (
    <Card>
      <CardHeader title="Documents" />
      <div className="divide-y divide-line">
        {documents.map((document) => (
          <button key={document.id} className={cn("w-full p-4 text-left hover:bg-slate-50", selectedId === document.id && "bg-teal/10")} onClick={() => onSelect(document.id)}>
            <p className="truncate text-sm font-semibold">{document.filename}</p>
            <p className="mt-1 text-xs text-muted">{document.documentType}</p>
          </button>
        ))}
        {documents.length === 0 ? <EmptyState title="No documents" body="Upload a document to use this page." /> : null}
      </div>
    </Card>
  );
}

function ProbabilityCard({ document }: Readonly<{ document: AnalyzedDocument }>) {
  const hasText = document.wordCount > 0;
  return (
    <div className="rounded-lg border border-line p-4 text-center">
      <p className="text-xs font-semibold uppercase text-slate-500">AI-likelihood</p>
      <p className="mt-3 text-5xl font-bold text-amber">{hasText ? `${document.aiLikelihood}%` : "N/A"}</p>
      <p className="mt-2 text-sm text-muted">{hasText ? `Uncertainty +/-${document.uncertainty}%` : "Text required"}</p>
      <p className="mt-3 text-xs leading-5 text-muted">
        {hasText ? "Probabilistic estimate, not proof." : "Writing-style analysis runs after text extraction succeeds."}
      </p>
    </div>
  );
}

function SignalList({ document }: Readonly<{ document: AnalyzedDocument }>) {
  return (
    <div className="mt-4 space-y-4">
      {document.signals.map((signal) => (
        <div key={signal.name}>
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-semibold">{signal.name}</span>
            <Badge tone={signal.tone === "ai" ? "amber" : signal.tone === "human" ? "green" : "neutral"}>{signal.rating}</Badge>
          </div>
          <div className="mt-2">
            <ProgressBar value={signal.value} tone={signal.tone === "ai" ? "amber" : signal.tone === "human" ? "green" : "teal"} />
          </div>
          <p className="mt-1 text-xs leading-5 text-muted">{signal.explanation}</p>
        </div>
      ))}
    </div>
  );
}

function DocumentStats({ documents }: Readonly<{ documents: AnalyzedDocument[] }>) {
  return (
    <Card className="p-5">
      <h2 className="text-base font-bold">Search scope</h2>
      <div className="mt-5 grid gap-3">
        <Metric label="Documents" value={documents.length.toString()} />
        <Metric label="Text chunks" value={documents.reduce((sum, document) => sum + document.chunks.length, 0).toString()} />
        <Metric label="Total words" value={documents.reduce((sum, document) => sum + document.wordCount, 0).toLocaleString()} />
      </div>
    </Card>
  );
}

function EmptyState({ title, body, icon }: Readonly<{ title: string; body: string; icon?: React.ReactNode }>) {
  return (
    <div className="grid place-items-center p-8 text-center">
      <div className="text-teal">{icon ?? <FileText size={38} />}</div>
      <p className="mt-3 font-bold">{title}</p>
      <p className="mt-1 max-w-md text-sm leading-6 text-muted">{body}</p>
    </div>
  );
}

function Metric({ label, value }: Readonly<{ label: string; value: string }>) {
  return (
    <div className="rounded-lg border border-line bg-slate-50 p-4">
      <p className="text-xs font-semibold uppercase text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">{value}</p>
    </div>
  );
}

function documentToQueueItem(document: AnalyzedDocument): UploadItem {
  return {
    id: document.id,
    filename: document.filename,
    sizeBytes: document.sizeBytes,
    status: document.status,
    progress: 100,
    document
  };
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

async function completeWithBrowserOcr(file: File, document: AnalyzedDocument) {
  if (document.wordCount > 0 || !canBrowserOcr(file)) return document;

  const text = await extractBrowserOcrText(file);
  if (!text) return document;

  return analyzePlainText({
    id: document.id,
    filename: document.filename,
    mimeType: document.mimeType,
    sizeBytes: document.sizeBytes,
    text,
    limitations: [
      "Browser OCR extracted text from scanned content. Accuracy depends on image quality.",
      ...document.limitations
    ]
  });
}

function canBrowserOcr(file: File) {
  return /(\.pdf|\.png|\.jpe?g|\.tiff?)$/i.test(file.name) || /^(application\/pdf|image\/)/.test(file.type);
}

async function extractBrowserOcrText(file: File) {
  const images = file.type === "application/pdf" || /\.pdf$/i.test(file.name) ? extractEmbeddedPdfImages(new Uint8Array(await file.arrayBuffer())) : [file];
  if (images.length === 0) return "";

  const { createWorker, PSM } = await import("tesseract.js");
  const worker = await createWorker("eng");
  try {
    await worker.setParameters({
      tessedit_pageseg_mode: PSM.AUTO,
      preserve_interword_spaces: "1"
    });
    const pages: string[] = [];
    for (const image of images.slice(0, 3)) {
      const blob = image instanceof File ? image : new Blob([image], { type: "image/jpeg" });
      const result = await worker.recognize(blob);
      const text = result.data.text.trim();
      if (text) pages.push(text);
    }
    return pages.join("\n\n").trim();
  } finally {
    await worker.terminate();
  }
}

function extractEmbeddedPdfImages(bytes: Uint8Array) {
  const source = latin1FromBytes(bytes);
  const images: Uint8Array[] = [];
  let searchFrom = 0;

  while (searchFrom < source.length) {
    const streamIndex = source.indexOf("stream", searchFrom);
    if (streamIndex === -1) break;
    const header = source.slice(Math.max(0, streamIndex - 1500), streamIndex);
    searchFrom = streamIndex + 6;

    if (!/\/Subtype\s*\/Image/.test(header) || !/\/DCTDecode/.test(header)) continue;

    let start = streamIndex + 6;
    if (source[start] === "\r" && source[start + 1] === "\n") start += 2;
    else if (source[start] === "\n" || source[start] === "\r") start += 1;

    const end = source.indexOf("endstream", start);
    if (end <= start) continue;
    let image = bytes.slice(start, end);
    while (image.length > 0 && (image[image.length - 1] === 0x0a || image[image.length - 1] === 0x0d || image[image.length - 1] === 0x20)) {
      image = image.slice(0, image.length - 1);
    }
    if (image.length > 100 && image[0] === 0xff && image[1] === 0xd8) {
      images.push(image);
    }
  }

  return images;
}

function latin1FromBytes(bytes: Uint8Array) {
  let output = "";
  for (let index = 0; index < bytes.length; index += 0x8000) {
    output += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
  }
  return output;
}
