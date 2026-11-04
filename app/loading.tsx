export default function Loading() {
  return (
    <main className="mx-auto min-h-[60vh] max-w-6xl px-5 py-16" aria-live="polite" aria-busy="true">
      <div className="h-8 w-48 animate-pulse rounded bg-muted" />
      <div className="mt-6 h-4 max-w-xl animate-pulse rounded bg-muted" />
      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[0, 1, 2].map((item) => <div key={item} className="h-36 animate-pulse rounded-xl border border-border bg-muted/50" />)}
      </div>
      <span className="sr-only">Loading page</span>
    </main>
  )
}