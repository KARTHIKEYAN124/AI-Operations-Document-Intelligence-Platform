"use client";

import { FormEvent, useState } from "react";
import { Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { API_TOKEN_KEY, apiFetch } from "@/lib/api-client";

type LoginResponse = {
  access_token: string;
  token_type: string;
};

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@aiops.com");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const token = await apiFetch<LoginResponse>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password })
      });
      window.localStorage.setItem(API_TOKEN_KEY, token.access_token);
      router.push("/upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-panel">
        <div className="grid size-12 place-items-center rounded-md bg-teal text-white">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Login</h1>
        <p className="mt-2 text-sm text-muted">Access protected document intelligence workflows.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="h-11 w-full rounded-md bg-teal text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? "Signing in..." : "Sign in"}</button>
        </form>
      </section>
    </main>
  );
}
