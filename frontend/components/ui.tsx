import { cn } from "@/lib/utils";

export function Card({ className, children }: Readonly<{ className?: string; children: React.ReactNode }>) {
  return <section className={cn("rounded-lg border border-line bg-panel shadow-panel", className)}>{children}</section>;
}

export function CardHeader({ title, action }: Readonly<{ title: string; action?: React.ReactNode }>) {
  return (
    <div className="flex items-center justify-between border-b border-line px-5 py-4">
      <h2 className="text-base font-semibold text-ink">{title}</h2>
      {action}
    </div>
  );
}

export function Badge({ children, tone = "neutral" }: Readonly<{ children: React.ReactNode; tone?: "green" | "amber" | "red" | "blue" | "neutral" }>) {
  const tones = {
    green: "border-emerald-200 bg-emerald-50 text-emerald-700",
    amber: "border-amber-200 bg-amber-50 text-amber-700",
    red: "border-red-200 bg-red-50 text-red-700",
    blue: "border-blue-200 bg-blue-50 text-blue-700",
    neutral: "border-slate-200 bg-slate-50 text-slate-700"
  };

  return <span className={cn("inline-flex rounded px-2 py-1 text-xs font-medium", tones[tone])}>{children}</span>;
}

export function ProgressBar({ value, tone = "teal" }: Readonly<{ value: number; tone?: "teal" | "amber" | "green" }>) {
  const color = tone === "amber" ? "bg-amber" : tone === "green" ? "bg-emerald-600" : "bg-teal";

  return (
    <div className="h-1.5 w-full rounded-full bg-slate-200">
      <div className={cn("h-1.5 rounded-full", color)} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}
