"use client";
import { signOut } from "next-auth/react";
export function SignOut() {
  return (
    <button
      className="button button-ghost button-sm"
      onClick={() => signOut({ callbackUrl: "/admin/login" })}
    >
      Sign out
    </button>
  );
}
