"use client";

import { Activity, BarChart3, Clock3, Database, FileText, Home, Search, Settings, ShieldCheck, UploadCloud, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "@/lib/sample-data";
import { cn } from "@/lib/utils";

const icons = {
  Dashboard: Home,
  Upload: UploadCloud,
  Analysis: BarChart3,
  Search,
  "Q&A": FileText,
  History: Clock3,
  Admin: Users
};

const paths: Record<string, string> = {
  Dashboard: "/",
  Upload: "/upload",
  Analysis: "/analysis",
  Search: "/search",
  "Q&A": "/qa",
  History: "/history",
  Admin: "/admin"
};

export function AppShell({ children }: Readonly<{ children: React.ReactNode }>) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-canvas text-ink">
      <header className="fixed left-0 right-0 top-0 z-20 flex h-20 items-center border-b border-[#1f2933] bg-[#101418] px-5 text-white">
        <div className="flex min-w-[280px] items-center gap-3">
          <div className="grid size-11 place-items-center rounded-md bg-teal text-xl font-black text-white shadow-[0_10px_24px_rgba(8,127,131,0.28)]">AI</div>
          <div>
            <p className="text-xl font-bold leading-tight">AI Operations</p>
            <p className="text-sm text-white/60">Document Intelligence Console</p>
          </div>
        </div>
        <div className="ml-auto hidden items-center gap-3 text-sm md:flex">
          <StatusItem icon={<ShieldCheck size={18} />} label="Analyzer" value="Ready" tone="text-emerald-300" />
          <StatusItem icon={<Database size={18} />} label="Storage" value="Session" tone="text-cyan-200" />
          <StatusItem icon={<Activity size={18} />} label="Uploads" value="Live" tone="text-amber-200" />
          <div className="ml-2 grid size-10 place-items-center rounded-md bg-white/10 text-sm font-bold text-white" title="Admin User">AD</div>
        </div>
      </header>
      <aside className="fixed bottom-0 left-0 top-20 z-10 hidden w-64 flex-col border-r border-line bg-white px-4 py-5 md:flex">
        <nav className="space-y-2">
          {navItems.map((item) => {
            const Icon = icons[item as keyof typeof icons];
            const href = paths[item];
            const active = pathname === href;
            return (
              <Link
                key={item}
                href={href}
                className={cn(
                  "focus-ring flex h-12 w-full items-center gap-3 rounded-md border border-transparent px-3 text-left text-sm font-semibold transition",
                  active ? "border-teal/20 bg-teal/10 text-teal" : "text-slate-600 hover:border-line hover:bg-[#f6f8fb] hover:text-ink"
                )}
              >
                <Icon size={20} />
                {item}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <div className="mb-6 rounded-md border border-line bg-[#f8fafc] p-3">
            <p className="text-xs font-semibold uppercase text-slate-500">Storage usage</p>
            <div className="mt-3 h-2 rounded-full bg-slate-200">
              <div className="h-2 w-[24%] rounded-full bg-teal" />
            </div>
            <p className="mt-2 text-xs text-muted">Browser session files</p>
          </div>
          <button className="focus-ring mb-5 flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-600 hover:bg-[#f6f8fb] hover:text-ink">
            <Settings size={20} />
            Settings
          </button>
          <div className="flex items-center gap-3">
            <div className="grid size-10 place-items-center rounded-full bg-teal text-sm font-bold text-white">AD</div>
            <div>
              <p className="text-sm font-semibold">Admin User</p>
              <p className="text-xs text-muted">admin@aiops.com</p>
            </div>
          </div>
        </div>
      </aside>
      <main className="pt-20 md:ml-64">{children}</main>
    </div>
  );
}

function StatusItem({ icon, label, value, tone }: Readonly<{ icon: React.ReactNode; label: string; value: string; tone: string }>) {
  return (
    <div className="flex h-11 items-center gap-3 rounded-md border border-white/10 bg-white/5 px-3">
      <span className="text-white/70">{icon}</span>
      <div>
        <p className="text-[11px] uppercase text-white/45">{label}</p>
        <p className={cn("font-semibold", tone)}>{value}</p>
      </div>
    </div>
  );
}
