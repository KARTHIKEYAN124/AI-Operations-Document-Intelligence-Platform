export default function RegisterPage() {
  return (
    <main className="grid min-h-screen place-items-center bg-canvas p-6">
      <section className="w-full max-w-md rounded-lg border border-line bg-white p-6 shadow-panel">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="mt-2 text-sm text-muted">Create an account for document upload, search, and analysis.</p>
        <form className="mt-6 space-y-4">
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Email" type="email" />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Password" type="password" />
          <input className="h-11 w-full rounded-md border border-line px-3 text-sm outline-none focus:border-teal" placeholder="Confirm password" type="password" />
          <button className="h-11 w-full rounded-md bg-teal text-sm font-semibold text-white">Create account</button>
        </form>
      </section>
    </main>
  );
}
