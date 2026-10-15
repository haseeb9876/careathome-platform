"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-shell">
      <section className="panel">
        <h1>We couldn’t load this page.</h1>
        <p className="muted my-5">
          Check that local services are running, then try again. No records have
          been removed.
        </p>
        <Button onClick={reset}>Try again</Button>
      </section>
    </main>
  );
}
