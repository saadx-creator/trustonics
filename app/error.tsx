"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="container confirmation">
      <h1>Something went wrong.</h1>
      <p>
        Please try again in a moment. If you were submitting a request, retry
        from the form.
      </p>
      <button
        className="button button-primary"
        onClick={reset}
        style={{ marginTop: 24 }}
      >
        Try again
      </button>
    </main>
  );
}
