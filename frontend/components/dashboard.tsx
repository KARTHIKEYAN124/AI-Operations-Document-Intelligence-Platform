"use client";

import { ArrowRight, BarChart3, Clock3, FileText, MessageSquareText, Search, ShieldCheck, UploadCloud, Users } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, Card } from "@/components/ui";

const startActions = [
  {
    title: "Upload documents",
    body: "Add PDF, DOC, DOCX, TXT, Markdown, RTF, CSV, JSON, or image files and run extraction plus OCR.",
    href: "/upload",
    icon: UploadCloud
  },
  {
    title: "Review analysis",
    body: "Open document type, key information, extracted text, and probabilistic writing-style signals.",
    href: "/analysis",
    icon: BarChart3
  },
  {
    title: "Ask questions",
    body: "Query a selected document and receive answers with cited extracted passages.",
    href: "/qa",
    icon: MessageSquareText
  }
];

const workflow = [
  "Validate file",
  "Extract text",
  "Run OCR when needed",
  "Classify document",
  "Analyze writing style",
  "Create chunks",
  "Search and answer"
];

export function Dashboard() {
  return (
    <div className="min-h-[calc(100vh-80px)] bg-white/70">
      <section className="border-b border-line bg-white/95 px-5 py-6 backdrop-blur">
        <div className="mx-auto max-w-[1500px]">
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-teal">Start page</p>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">AI Operations & Document Intelligence</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted">
                Start with upload, then move through analysis, semantic search, Q&A, history, and administration from the side navigation.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge tone="green">Analyzer ready</Badge>
              <Badge tone="blue">Railway API</Badge>
              <Badge tone="blue">All-page OCR</Badge>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-[1500px] gap-5 p-5 xl:grid-cols-[1fr_380px]">
        <div className="grid gap-5">
          <div className="grid gap-5 lg:grid-cols-3">
            {startActions.map((action) => {
              const Icon = action.icon;
              return (
                <Link key={action.title} href={action.href} className="focus-ring group block">
                  <Card className="h-full p-5 transition hover:border-teal/40 hover:shadow-panel">
                    <div className="flex items-start justify-between gap-4">
                      <div className="grid size-12 place-items-center rounded-md bg-teal/10 text-teal">
                        <Icon size={24} />
                      </div>
                      <ArrowRight className="text-slate-300 transition group-hover:translate-x-1 group-hover:text-teal" size={20} />
                    </div>
                    <h2 className="mt-5 text-lg font-bold">{action.title}</h2>
                    <p className="mt-2 text-sm leading-6 text-muted">{action.body}</p>
                  </Card>
                </Link>
              );
            })}
          </div>

          <Card className="p-5">
            <div className="flex items-center gap-3">
              <div className="grid size-11 place-items-center rounded-md bg-[#101418] text-white">
                <FileText size={22} />
              </div>
              <div>
                <h2 className="text-lg font-bold">Primary workflow</h2>
                <p className="text-sm text-muted">The live app is organized around the document lifecycle.</p>
              </div>
            </div>
            <div className="mt-5 grid gap-3 md:grid-cols-7">
              {workflow.map((step, index) => (
                <div key={step} className="rounded-md border border-line bg-[#fbfcfd] p-3">
                  <p className="text-xs font-semibold uppercase text-slate-500">Step {index + 1}</p>
                  <p className="mt-2 text-sm font-bold">{step}</p>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <div className="grid content-start gap-5">
          <Card className="p-5">
            <h2 className="text-base font-bold">Workspace pages</h2>
            <div className="mt-4 grid gap-2">
              <PageLink href="/search" icon={<Search size={18} />} label="Semantic search" />
              <PageLink href="/history" icon={<Clock3 size={18} />} label="Processing history" />
              <PageLink href="/admin" icon={<Users size={18} />} label="Admin dashboard" />
            </div>
          </Card>
          <Card className="p-5">
            <div className="flex items-center gap-3">
              <ShieldCheck className="text-amber" size={24} />
              <h2 className="text-base font-bold">AI detection note</h2>
            </div>
            <p className="mt-3 text-sm leading-6 text-muted">
              Writing-style analysis is shown as a probability with uncertainty and signal explanations. It is not proof that a document was or was not generated by AI.
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}

function PageLink({ href, icon, label }: Readonly<{ href: string; icon: ReactNode; label: string }>) {
  return (
    <Link href={href} className="focus-ring flex h-12 items-center justify-between rounded-md border border-line px-3 text-sm font-semibold hover:border-teal/40 hover:bg-teal/5">
      <span className="flex items-center gap-3">
        <span className="text-teal">{icon}</span>
        {label}
      </span>
      <ArrowRight size={17} className="text-slate-400" />
    </Link>
  );
}
