import Link from "next/link";
export default function NotFound() {
  return (
    <main className="container confirmation">
      <h1>Page not found.</h1>
      <p>Please check the link or start a new request.</p>
      <Link
        className="button button-primary"
        href="/"
        style={{ marginTop: 24 }}
      >
        Back to Trustonics
      </Link>
    </main>
  );
}
