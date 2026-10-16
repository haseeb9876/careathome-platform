"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <section className="surface empty-state">
      <h2>We couldn’t load this part of your workspace.</h2>
      <p>
        Please try again. If you were saving a change, check its status before
        submitting it again.
      </p>
      <button className="primary-link" onClick={reset}>
        Try again
      </button>
    </section>
  );
}
