import Link from "next/link";
import { notFound } from "next/navigation";
import { z } from "zod";
import { eq, desc, and } from "drizzle-orm";
import { MessageCircle } from "lucide-react";
import { getDb } from "@/lib/db";
import {
  requests,
  customers,
  requirements,
  adminNotes,
  statusHistory,
  users,
} from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import { StatusBadge } from "@/components/status-badge";
import { AdminEditor } from "@/components/admin-editor";
import {
  typeLabels,
  sourceLabels,
  statusLabels,
  requirementKeys,
} from "@/lib/validation";
import { formatPKR } from "@/lib/whatsapp";
import { dateTime } from "@/lib/format";
export default async function RequestDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const db = getDb();
  const [record] = await db
    .select({ r: requests, c: customers })
    .from(requests)
    .innerJoin(customers, eq(requests.customer_id, customers.id))
    .where(eq(requests.id, id))
    .limit(1);
  if (!record) notFound();
  const [[req], notes, history, admins] = await Promise.all([
    db.select().from(requirements).where(eq(requirements.request_id, id)),
    db
      .select({
        id: adminNotes.id,
        note: adminNotes.note,
        date: adminNotes.created_at,
        author: users.name,
      })
      .from(adminNotes)
      .innerJoin(users, eq(users.id, adminNotes.author))
      .where(eq(adminNotes.request_id, id))
      .orderBy(desc(adminNotes.created_at)),
    db
      .select({
        id: statusHistory.id,
        from: statusHistory.from_status,
        to: statusHistory.to_status,
        date: statusHistory.created_at,
        reason: statusHistory.reason,
        author: users.name,
      })
      .from(statusHistory)
      .leftJoin(users, eq(users.id, statusHistory.changed_by))
      .where(eq(statusHistory.request_id, id))
      .orderBy(desc(statusHistory.created_at)),
    db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.active, true), eq(users.role, "ADMIN"))),
  ]);
  const { r, c } = record;
  return (
    <>
      <Link className="back-link" href="/admin">
        Back to requests
      </Link>
      <div className="admin-heading" style={{ marginTop: 12 }}>
        <div>
          <span className="eyebrow">
            {typeLabels[r.request_type]} · {sourceLabels[r.source]}
          </span>
          <h1>{r.public_ref}</h1>
          <p>Received {dateTime(r.created_at)} PKT</p>
        </div>
        <StatusBadge status={r.status} />
      </div>
      <div className="admin-grid">
        <div>
          <section className="panel">
            <h2 className="panel-title">Customer details</h2>
            <div className="panel-body">
              <div className="contact-top">
                <div>
                  <h2>{c.name}</h2>
                  <p className="form-intro" style={{ margin: "6px 0 0" }}>
                    {c.city}
                  </p>
                </div>
                <a
                  className="button button-outline button-sm"
                  href={`https://wa.me/${c.whatsapp}?text=${encodeURIComponent(`Hi ${c.name}, this is Trustonics regarding your request ${r.public_ref}.`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <MessageCircle size={16} /> WhatsApp customer
                </a>
              </div>
              <div className="contact-links">
                <a href={`tel:+${c.whatsapp}`}>+{c.whatsapp}</a>
                {c.email && <a href={`mailto:${c.email}`}>{c.email}</a>}
              </div>
              <p className="contact-footnote">
                Preferred contact:{" "}
                {c.preferred_contact_method === "WHATSAPP"
                  ? "WhatsApp"
                  : c.preferred_contact_method === "EMAIL"
                    ? "Email"
                    : "Phone call"}{" "}
                · Consent given
              </p>
            </div>
          </section>
          <section className="panel">
            <h2 className="panel-title">
              Original request{" "}
              <span
                style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}
              >
                · unmodified
              </span>
            </h2>
            <div className="panel-body">
              <div className="original-message">{r.original_message}</div>
              <dl className="details-list">
                <div>
                  <dt>Budget from</dt>
                  <dd>
                    {r.budget_min === null
                      ? "Not specified"
                      : `PKR ${formatPKR(r.budget_min)}`}
                  </dd>
                </div>
                <div>
                  <dt>Budget up to</dt>
                  <dd>
                    {r.budget_max === null
                      ? "Not specified"
                      : `PKR ${formatPKR(r.budget_max)}`}
                  </dd>
                </div>
                <div>
                  <dt>Condition</dt>
                  <dd>
                    {r.condition === "EITHER"
                      ? "New or used"
                      : r.condition === "NEW"
                        ? "New"
                        : "Used"}
                  </dd>
                </div>
                <div>
                  <dt>Estimate</dt>
                  <dd>Skipped · Phase 1</dd>
                </div>
              </dl>
            </div>
          </section>
          <section className="panel">
            <h2 className="panel-title">Internal notes</h2>
            <div className="panel-body">
              {notes.length ? (
                notes.map((n) => (
                  <div className="note" key={n.id}>
                    <p>{n.note}</p>
                    <small>
                      {n.author} · {dateTime(n.date)} PKT
                    </small>
                  </div>
                ))
              ) : (
                <p className="form-intro" style={{ margin: 0 }}>
                  No internal notes yet.
                </p>
              )}
            </div>
          </section>
          <section className="panel">
            <h2 className="panel-title">Status history</h2>
            <div className="panel-body">
              <ol className="timeline">
                {history.map((h) => (
                  <li key={h.id}>
                    <p>
                      {h.from ? `${statusLabels[h.from]} → ` : ""}
                      {statusLabels[h.to]}
                    </p>
                    {h.reason && (
                      <p
                        style={{
                          whiteSpace: "pre-wrap",
                          overflowWrap: "anywhere",
                        }}
                      >
                        {h.reason}
                      </p>
                    )}
                    <small>
                      {h.author || "Request submitted"} · {dateTime(h.date)} PKT
                    </small>
                  </li>
                ))}
              </ol>
            </div>
          </section>
        </div>
        <div>
          <AdminEditor
            key={`${r.version}-${notes.length}`}
            id={id}
            status={r.status}
            version={r.version}
            assignedTo={r.assigned_to}
            admins={admins}
            requirements={Object.fromEntries(
              requirementKeys.map((k) => [k, req?.[k] || null]),
            )}
          />
        </div>
      </div>
    </>
  );
}
