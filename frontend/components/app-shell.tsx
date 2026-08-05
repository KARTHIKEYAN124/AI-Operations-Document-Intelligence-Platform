"use client";

import { BarChart3, Bell, FileText, Home, Lock, Search, Settings, ShieldCheck, UploadCloud, Users } from "lucide-react";
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
  History: FileText,
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
      <header className="fixed left-0 right-0 top-0 z-20 flex h-20 items-center border-b border-line bg-white px-6">
        <div className="flex min-w-[280px] items-center gap-3">
          <div className="grid size-11 place-items-center rounded bg-teal text-xl font-black text-white">AI</div>
          <div>
            <p className="text-xl font-bold leading-tight">AI Operations</p>
            <p className="text-sm text-muted">Document Intelligence Platform</p>
          </div>
        </div>
        <div className="ml-auto flex items-center gap-8 text-sm">
          <StatusItem icon={<ShieldCheck size={20} />} label="System status" value="Healthy" tone="text-emerald-600" />
          <StatusItem icon={<Lock size={20} />} label="Models" value="All online" tone="text-emerald-600" />
          <StatusItem icon={<FileText size={20} />} label="Queue" value="3 processing" tone="text-ink" />
          <button className="focus-ring relative rounded p-2 text-ink" aria-label="Notifications">
            <Bell size={22} />
            <span className="absolute right-1 top-0 grid size-5 place-items-center rounded-full bg-teal text-xs font-bold text-white">3</span>
          </button>
          <div className="grid size-11 place-items-center rounded-full bg-teal font-bold text-white">AD</div>
        </div>
      </header>
      <aside className="fixed bottom-0 left-0 top-20 z-10 flex w-64 flex-col border-r border-line bg-white px-4 py-5">
        <nav className="space-y-2">
          {navItems.map((item, index) => {
            const Icon = icons[item as keyof typeof icons];
            const href = paths[item];
            const active = pathname === href;
            return (
              <Link
                key={item}
                href={href}
                className={cn(
                  "focus-ring flex h-12 w-full items-center gap-3 rounded-md px-3 text-left text-sm font-semibold transition",
                  active ? "bg-teal/10 text-teal" : "text-slate-700 hover:bg-slate-100"
                )}
              >
                <Icon size={20} />
                {item}
              </Link>
            );
          })}
        </nav>
        <div className="mt-auto border-t border-line pt-4">
          <button className="focus-ring mb-5 flex h-11 w-full items-center gap-3 rounded-md px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100">
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
      <main className="ml-64 pt-20">{children}</main>
    </div>
  );
}

function StatusItem({ icon, label, value, tone }: Readonly<{ icon: React.ReactNode; label: string; value: string; tone: string }>) {
  return (
    <div className="flex items-center gap-3 border-l border-line pl-6">
      <span className="text-slate-700">{icon}</span>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className={cn("font-semibold", tone)}>{value}</p>
      </div>
    </div>
  );
}
