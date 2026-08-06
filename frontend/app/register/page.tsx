"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await apiFetch("/api/auth/register", {
        method: "POST",
        body: JSON.stringify({ email, password, confirm_password: confirmPassword })
      });
      router.push("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-md border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="mt-2 text-sm text-muted">Create an account for document upload, search, and analysis.</p>
        <form className="mt-6 space-y-4" onSubmit={onSubmit}>
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Confirm password" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={8} />
          {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}
          <button className="h-11 w-full rounded-md bg-teal text-sm font-semibold text-white disabled:opacity-60" disabled={loading}>{loading ? "Creating..." : "Create account"}</button>
        </form>
      </section>
    </main>
  );
}
