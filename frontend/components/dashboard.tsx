"use client";

import { useMemo, useState } from "react";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { CheckCircle2, File, FileText, Filter, MessageSquareText, MoreVertical, Search, UploadCloud } from "lucide-react";
import { chartData, history, searchResults, signals, uploads } from "@/lib/sample-data";
import { Badge, Card, CardHeader, ProgressBar } from "@/components/ui";
import { cn } from "@/lib/utils";

export function Dashboard() {
  const [query, setQuery] = useState("termination clause");
  const filteredResults = useMemo(
    () => searchResults.filter((result) => `${result.document} ${result.section} ${result.excerpt}`.toLowerCase().includes(query.toLowerCase().split(" ")[0] ?? "")),
    [query]
  );

  return (
    <div className="mx-auto grid max-w-[1680px] gap-5 p-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1fr_1fr]">
        <UploadQueue />
        <AiLikelihood />
        <PrimarySignals />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.7fr_1fr]">
        <SemanticSearch query={query} setQuery={setQuery} results={filteredResults} />
        <AnalyticsStrip />
      </div>
      <ProcessingHistory />
    </div>
  );
}

function UploadQueue() {
  return (
    <Card>
      <CardHeader title="Upload queue" action={<UploadCloud className="text-teal" size={20} />} />
      <div className="divide-y divide-line px-5">
        {uploads.map((upload) => (
          <div key={upload.name} className="grid grid-cols-[36px_1fr_128px] items-center gap-3 py-4">
            <FileText className={upload.name.endsWith(".pdf") ? "text-red-500" : "text-blue-600"} size={28} />
            <div>
              <p className="text-sm font-semibold">{upload.name}</p>
              <p className="text-xs text-muted">{upload.meta}</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className={cn("text-xs font-semibold", upload.status === "Completed" ? "text-emerald-600" : upload.status === "Processing" ? "text-teal" : "text-blue-700")}>
                  {upload.status}
                </span>
                {upload.status === "Completed" ? <CheckCircle2 size={18} className="text-emerald-600" /> : <span className="text-xs text-muted">{upload.progress}%</span>}
              </div>
              <ProgressBar value={upload.progress} tone={upload.status === "Completed" ? "green" : "teal"} />
              <p className="text-xs text-muted">{upload.stage}</p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function AiLikelihood() {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">AI-likelihood estimate</h2>
      <div className="mt-8 grid grid-cols-[0.8fr_1fr] items-center gap-8">
        <div>
          <p className="text-7xl font-bold text-amber">72%</p>
          <p className="mt-2 text-3xl font-semibold text-slate-500">±12%</p>
        </div>
        <div className="border-l border-line pl-8">
          <p className="text-xl font-semibold">Confidence: <span className="text-amber">Moderate</span></p>
          <p className="mt-4 text-sm leading-6 text-slate-600">
            The estimate reflects writing-style signals and model confidence. It should be reviewed as probabilistic evidence, not a definitive claim.
          </p>
        </div>
      </div>
      <div className="mt-10">
        <div className="relative h-2 rounded-full bg-gradient-to-r from-teal via-slate-300 to-amber">
          <span className="absolute left-[72%] top-1/2 size-4 -translate-y-1/2 rounded-full border-2 border-white bg-amber shadow" />
        </div>
        <div className="mt-3 flex justify-between text-xs font-semibold">
          <span className="text-teal">Human-written</span>
          <span className="text-slate-500">Uncertain</span>
          <span className="text-amber">AI-associated</span>
        </div>
      </div>
      <p className="mt-8 text-xs text-muted">Model: AIOps Detector v0.1 • Analyzed: May 14, 2024 10:21 AM</p>
    </Card>
  );
}

function PrimarySignals() {
  return (
    <Card className="p-5">
      <h2 className="text-base font-semibold">Primary signals</h2>
      <div className="mt-7 space-y-6">
        {signals.map((signal) => (
          <div key={signal.label} className="grid grid-cols-[150px_1fr_44px] items-center gap-4">
            <span className="text-sm">{signal.label}</span>
            <ProgressBar value={signal.value} tone={signal.tone === "amber" ? "amber" : "teal"} />
            <span className="text-right text-sm tabular-nums">{(signal.value / 100).toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div className="mt-8 flex gap-5 text-xs text-muted">
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-amber" />Stronger AI association</span>
        <span className="flex items-center gap-2"><span className="size-3 rounded bg-teal" />Stronger human association</span>
      </div>
    </Card>
  );
}

function SemanticSearch({ query, setQuery, results }: Readonly<{ query: string; setQuery: (value: string) => void; results: typeof searchResults }>) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">Semantic search</h2>
        <button className="focus-ring rounded-md border border-line p-2 text-slate-600" aria-label="Filter search">
          <Filter size={18} />
        </button>
      </div>
      <div className="mt-5 flex gap-3">
        <label className="flex h-12 flex-1 items-center gap-3 rounded-md border border-line bg-white px-4">
          <Search size={20} className="text-muted" />
          <input className="w-full border-0 bg-transparent text-sm outline-none" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <button className="focus-ring h-12 rounded-md bg-teal px-6 text-sm font-semibold text-white">Search</button>
      </div>
      <div className="mt-5 grid gap-3 md:grid-cols-3">
        {results.map((result) => (
          <article key={result.document} className="rounded-md border border-line p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold">{result.document}</p>
              <Badge tone="blue">{result.score.toFixed(2)}</Badge>
            </div>
            <p className="mt-1 text-xs font-medium text-teal">{result.section}</p>
            <p className="mt-2 text-xs leading-5 text-slate-600">{result.excerpt}</p>
          </article>
        ))}
      </div>
    </Card>
  );
}

function AnalyticsStrip() {
  const cards = [
    { title: "Documents processed", value: "142", delta: "+18%", color: "#087f83", key: "docs" },
    { title: "AI-likelihood avg.", value: "61%", delta: "-5%", color: "#d89000", key: "ai" },
    { title: "Processing time avg.", value: "28s", delta: "-12%", color: "#087f83", key: "time" }
  ] as const;

  return (
    <div className="grid gap-5 md:grid-cols-3 xl:grid-cols-1 2xl:grid-cols-3">
      {cards.map((card) => (
        <Card key={card.title} className="p-4">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs font-semibold">{card.title}</p>
              <p className="mt-3 text-3xl font-bold">{card.value}</p>
            </div>
            <Badge tone={card.delta.startsWith("+") ? "green" : "amber"}>{card.delta}</Badge>
          </div>
          <div className="mt-3 h-20">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
                <XAxis dataKey="day" hide />
                <YAxis hide domain={["dataMin - 3", "dataMax + 3"]} />
                <Tooltip />
                <Area type="monotone" dataKey={card.key} stroke={card.color} fill={card.color} fillOpacity={0.12} strokeWidth={2} isAnimationActive={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <p className="text-xs text-muted">7-day trend</p>
        </Card>
      ))}
    </div>
  );
}

function ProcessingHistory() {
  return (
    <Card>
      <CardHeader title="Processing history" />
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              {["Document", "Type", "Pages", "AI-likelihood", "Uncertainty", "Confidence", "Status", "Processed at", "Actions"].map((header) => (
                <th key={header} className="px-5 py-3">{header}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {history.map((item) => (
              <tr key={item.document}>
                <td className="px-5 py-3 font-medium"><File size={16} className="mr-2 inline text-teal" />{item.document}</td>
                <td className="px-5 py-3">{item.type}</td>
                <td className="px-5 py-3">{item.pages}</td>
                <td className="px-5 py-3">{item.likelihood}</td>
                <td className="px-5 py-3">{item.uncertainty}</td>
                <td className="px-5 py-3"><Badge tone={item.confidence === "High" ? "red" : item.confidence === "Moderate" ? "amber" : "green"}>{item.confidence}</Badge></td>
                <td className="px-5 py-3">{item.status}</td>
                <td className="px-5 py-3">{item.processedAt}</td>
                <td className="px-5 py-3">
                  <div className="flex gap-3 text-slate-600">
                    <MessageSquareText size={17} />
                    <MoreVertical size={17} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
