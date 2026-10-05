"use client";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "./ui/button";
import { SelectField } from "./ui/select";
import {
  nextStatuses,
  statusLabels,
  requirementKeys,
  type Status,
} from "@/lib/validation";
export function AdminEditor({
  id,
  status,
  version,
  assignedTo,
  admins,
  requirements,
}: {
  id: string;
  status: Status;
  version: number;
  assignedTo: string | null;
  admins: { id: string; name: string }[];
  requirements: Record<string, string | null>;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [next, setNext] = useState(nextStatuses(status)[0] || "");
  const [reason, setReason] = useState("");
  const [assigned, setAssigned] = useState(assignedTo || "none");
  const [note, setNote] = useState("");
  const [reqs, setReqs] = useState(requirements);
  const disabled = busy || pending;
  async function save(payload: Record<string, unknown>) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch(`/api/admin/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          ...(payload.action === "note" ? {} : { version }),
        }),
      });
      const data = await res.json();
      if (!res.ok)
        throw new Error(data.error || "Unable to save. Please try again.");
      setNotice("Saved.");
      if (payload.action === "note") setNote("");
      startTransition(() => router.refresh());
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Unable to save. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      {error && (
        <div className="error-box" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="success-box" role="status">
          {notice}
        </div>
      )}
      <section className="panel">
        <h2 className="panel-title">Manage request</h2>
        <div className="panel-body">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save({
                action: "assign",
                assigned_to: assigned === "none" ? null : assigned,
              });
            }}
          >
            <SelectField
              id="assignee"
              label="Assigned to"
              value={assigned}
              onChange={setAssigned}
              options={[
                { value: "none", label: "Unassigned" },
                ...admins.map((a) => ({ value: a.id, label: a.name })),
              ]}
            />
            <Button variant="outline" size="sm" disabled={disabled}>
              Save assignment
            </Button>
          </form>
          <hr
            style={{
              border: 0,
              borderTop: "1px solid var(--border)",
              margin: "24px 0",
            }}
          />
          {nextStatuses(status).length ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                save({ action: "status", status: next, reason });
              }}
            >
              <SelectField
                id="next-status"
                label="Move to status"
                value={next}
                onChange={(v) => setNext(v as Status)}
                options={nextStatuses(status).map((s) => ({
                  value: s,
                  label: statusLabels[s],
                }))}
              />
              <div className="field">
                <label htmlFor="reason">
                  Reason <span>Optional</span>
                </label>
                <input
                  id="reason"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  maxLength={1000}
                  placeholder="Add context for this change"
                />
              </div>
              <Button disabled={disabled}>Update status</Button>
            </form>
          ) : (
            <p className="form-intro" style={{ margin: 0 }}>
              This request is closed. Its status history is preserved.
            </p>
          )}
        </div>
      </section>
      <section className="panel">
        <h2 className="panel-title">
          Requirements{" "}
          <span
            style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}
          >
            · editable
          </span>
        </h2>
        <form
          className="panel-body"
          onSubmit={(e) => {
            e.preventDefault();
            save({
              action: "requirements",
              requirements: Object.fromEntries(
                requirementKeys.map((k) => [k, reqs[k] || ""]),
              ),
            });
          }}
        >
          <p className="form-intro">
            Your working notes. The customer’s original text stays unchanged.
          </p>
          <div className="field-grid">
            {requirementKeys
              .filter((k) => k !== "other")
              .map((k) => (
                <div className="field" key={k}>
                  <label htmlFor={`req-${k}`}>
                    {k
                      .replaceAll("_", " ")
                      .replace(/\b\w/g, (c) => c.toUpperCase())}
                  </label>
                  <input
                    id={`req-${k}`}
                    value={reqs[k] || ""}
                    onChange={(e) => setReqs({ ...reqs, [k]: e.target.value })}
                    maxLength={200}
                  />
                </div>
              ))}
          </div>
          <div className="field">
            <label htmlFor="req-other">Other requirements</label>
            <textarea
              id="req-other"
              value={reqs.other || ""}
              onChange={(e) => setReqs({ ...reqs, other: e.target.value })}
              maxLength={2000}
            />
          </div>
          <Button variant="outline" disabled={disabled}>
            Save requirements
          </Button>
        </form>
      </section>
      <section className="panel">
        <h2 className="panel-title">Add an internal note</h2>
        <form
          className="panel-body"
          onSubmit={(e) => {
            e.preventDefault();
            save({ action: "note", note });
          }}
        >
          <div className="field">
            <label htmlFor="new-note">Note</label>
            <textarea
              id="new-note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={5000}
              required
              placeholder="Contact attempts, preferences or follow-up details…"
            />
            <small>Only the Trustonics team can see this.</small>
          </div>
          <Button variant="outline" disabled={disabled || !note.trim()}>
            Add note
          </Button>
        </form>
      </section>
    </>
  );
}
