import Link from "next/link";
export default function NotFound() {
  return (
    <main className="page-shell">
      <section className="surface empty-state">
        <p className="eyebrow">A LITTLE OFF THE PATH</p>
        <h1 className="text-3xl">This page isn’t available.</h1>
        <p>
          The address may have changed, or this information may not belong to
          your account.
        </p>
        <Link className="primary-link" href="/dashboard">
          Back to your care space
        </Link>
      </section>
    </main>
  );
}
