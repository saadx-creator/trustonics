"use client";
import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          const result = await signIn("credentials", {
            email,
            password,
            redirect: false,
          });
          if (result?.error) {
            setError(
              "Unable to sign in. Check your details, or try again later.",
            );
          } else {
            router.push("/admin");
            router.refresh();
          }
        } catch {
          setError("Unable to sign in. Please try again later.");
        } finally {
          setBusy(false);
        }
      }}
    >
      <div className="field">
        <label htmlFor="email">Email address</label>
        <input
          id="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          autoComplete="username"
          required
          maxLength={254}
        />
      </div>
      <div className="field">
        <label htmlFor="password">Password</label>
        <input
          id="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
          required
          maxLength={256}
        />
      </div>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      <Button disabled={busy}>
        {busy ? "Signing in…" : "Sign in to workspace"}
      </Button>
    </form>
  );
}
