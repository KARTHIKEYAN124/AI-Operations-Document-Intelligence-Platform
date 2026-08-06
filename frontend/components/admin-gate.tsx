"use client";

import { FormEvent, useEffect, useState } from "react";
import { LockKeyhole, LogIn, LogOut } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { WorkspacePage } from "@/components/document-workspace";
import { Card } from "@/components/ui";

const ADMIN_EMAIL = "admin@aiops.com";
const ADMIN_PASSWORD = "Admin@123";
const ADMIN_SESSION_KEY = "aiops-admin-session";

export function AdminGate() {
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState("");
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setIsAuthenticated(window.localStorage.getItem(ADMIN_SESSION_KEY) === "active");
  }, []);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (email.trim().toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
      window.localStorage.setItem(ADMIN_SESSION_KEY, "active");
      setIsAuthenticated(true);
      setError("");
      setPassword("");
      return;
    }
    setError("Invalid admin email or password.");
  }

  function signOut() {
    window.localStorage.removeItem(ADMIN_SESSION_KEY);
    setIsAuthenticated(false);
    setPassword("");
  }

  if (isAuthenticated) {
    return (
      <AppShell>
        <div className="border-b border-line bg-white px-5 py-3">
          <div className="mx-auto flex max-w-[1500px] justify-end">
            <button className="flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50" onClick={signOut}>
              <LogOut size={16} />
              Sign out
            </button>
          </div>
        </div>
        <WorkspacePage mode="admin" />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="grid min-h-[calc(100vh-80px)] place-items-center bg-[#f5f7fa] p-5">
        <Card className="w-full max-w-md p-6">
          <div className="grid size-12 place-items-center rounded bg-teal text-white">
            <LockKeyhole size={24} />
          </div>
          <h1 className="mt-5 text-2xl font-bold">Admin login</h1>
          <p className="mt-2 text-sm leading-6 text-muted">Use the admin credentials to manage uploaded documents and clear the local workspace.</p>
          <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                className="h-11 rounded-md border border-line px-3 font-normal outline-none focus:border-teal"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold">
              Password
              <input
                className="h-11 rounded-md border border-line px-3 font-normal outline-none focus:border-teal"
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="Admin@123"
              />
            </label>
            {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
            <button className="flex h-11 items-center justify-center gap-2 rounded-md bg-teal px-4 text-sm font-semibold text-white" type="submit">
              <LogIn size={18} />
              Login
            </button>
          </form>
          <div className="mt-5 rounded-md border border-line bg-slate-50 p-3 text-sm text-slate-700">
            <p className="font-semibold">Demo credentials</p>
            <p className="mt-1">Email: {ADMIN_EMAIL}</p>
            <p>Password: {ADMIN_PASSWORD}</p>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}
