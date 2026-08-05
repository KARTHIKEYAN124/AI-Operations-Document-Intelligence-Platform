import { Lock } from "lucide-react";

export default function LoginPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-panel">
        <div className="grid size-12 place-items-center rounded bg-teal text-white">
          <Lock size={24} />
        </div>
        <h1 className="mt-5 text-2xl font-bold">Login</h1>
        <p className="mt-2 text-sm text-muted">Access protected document intelligence workflows.</p>
        <form className="mt-6 space-y-4">
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Email" type="email" />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Password" type="password" />
          <button className="h-11 w-full rounded-md bg-teal text-sm font-semibold text-white">Sign in</button>
        </form>
      </section>
    </main>
  );
}
