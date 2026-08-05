export type DocumentStatus = "Queued" | "Processing" | "Completed" | "Failed";

export const navItems = ["Dashboard", "Upload", "Analysis", "Search", "Q&A", "History", "Admin"];

export const uploads = [
  { name: "Contract_2024_05_14.pdf", meta: "2.4 MB • 12 pages", status: "Processing", stage: "OCR • Layout • NER", progress: 65 },
  { name: "Marketing_Brief_Q2.docx", meta: "1.1 MB • 8 pages", status: "Queued", stage: "Position 2 of 3", progress: 10 },
  { name: "Board_Notes.md", meta: "184 KB • 6 sections", status: "Queued", stage: "Position 3 of 3", progress: 6 },
  { name: "Invoice_009842.pdf", meta: "512 KB • 1 page", status: "Completed", stage: "Completed 1m ago", progress: 100 }
] satisfies Array<{ name: string; meta: string; status: DocumentStatus; stage: string; progress: number }>;

export const history = [
  { document: "Contract_2024_05_14.pdf", type: "PDF", pages: 12, likelihood: "72%", uncertainty: "±12%", confidence: "Moderate", status: "Processing", processedAt: "May 14, 2024 10:21 AM" },
  { document: "Marketing_Brief_Q2.docx", type: "DOCX", pages: 8, likelihood: "45%", uncertainty: "±11%", confidence: "Low", status: "Queued", processedAt: "-" },
  { document: "Board_Notes.md", type: "MD", pages: 6, likelihood: "39%", uncertainty: "±10%", confidence: "Low", status: "Queued", processedAt: "-" },
  { document: "Invoice_009842.pdf", type: "PDF", pages: 1, likelihood: "86%", uncertainty: "±10%", confidence: "High", status: "Completed", processedAt: "May 14, 2024 10:19 AM" },
  { document: "Product_Overview.docx", type: "DOCX", pages: 15, likelihood: "34%", uncertainty: "±13%", confidence: "Low", status: "Completed", processedAt: "May 14, 2024 10:13 AM" }
] satisfies Array<{ document: string; type: string; pages: number; likelihood: string; uncertainty: string; confidence: "Low" | "Moderate" | "High"; status: DocumentStatus; processedAt: string }>;

export const signals = [
  { label: "Predictability", value: 78, tone: "amber" },
  { label: "Burstiness", value: 65, tone: "amber" },
  { label: "Repetition", value: 61, tone: "amber" },
  { label: "Sentence variation", value: 41, tone: "teal" },
  { label: "Lexical diversity", value: 37, tone: "teal" },
  { label: "Entity consistency", value: 29, tone: "teal" }
];

export const chartData = [
  { day: "Mon", docs: 18, ai: 58, time: 31 },
  { day: "Tue", docs: 15, ai: 54, time: 26 },
  { day: "Wed", docs: 21, ai: 61, time: 29 },
  { day: "Thu", docs: 19, ai: 66, time: 24 },
  { day: "Fri", docs: 24, ai: 59, time: 33 },
  { day: "Sat", docs: 22, ai: 56, time: 28 },
  { day: "Sun", docs: 31, ai: 61, time: 28 }
];

export const searchResults = [
  { document: "Contract_2024_05_14.pdf", section: "Page 7 • Termination", score: 0.89, excerpt: "The termination clause requires written notice and lists cure periods by breach type." },
  { document: "Marketing_Brief_Q2.docx", section: "Section 3 • Budget", score: 0.82, excerpt: "The Q2 campaign budget is split between paid search, lifecycle email, and partner webinars." },
  { document: "Product_Overview.docx", section: "Page 4 • Roadmap", score: 0.76, excerpt: "The product roadmap prioritizes document ingestion reliability before advanced model routing." }
];
