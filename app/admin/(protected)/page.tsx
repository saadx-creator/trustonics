import Link from "next/link";
import { Inbox, Plus } from "lucide-react";
import { and, eq, desc, sql } from "drizzle-orm";
import { getDb } from "@/lib/db";
import { requests, customers, statusHistory } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/admin";
import {
  sources,
  statuses,
  sourceLabels,
  statusLabels,
  typeLabels,
  type Status,
} from "@/lib/validation";
import { StatusBadge } from "@/components/status-badge";
import { dateTime } from "@/lib/format";
export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireAdmin();
  const params = await searchParams;
  const status = statuses.includes(params.status as Status)
    ? (params.status as Status)
    : undefined;
  const source = sources.includes(params.source as (typeof sources)[number])
    ? (params.source as (typeof sources)[number])
    : undefined;
  const page = Math.min(10000, Math.max(1, Number(params.page) || 1));
  const where = and(
    status ? eq(requests.status, status) : undefined,
    source ? eq(requests.source, source) : undefined,
  );
  const db = getDb();
  const [rows, counts, total, activity] = await Promise.all([
    db
      .select({
        request: requests,
        customer: { name: customers.name, city: customers.city },
      })
      .from(requests)
      .innerJoin(customers, eq(requests.customer_id, customers.id))
      .where(where)
      .orderBy(desc(requests.created_at))
      .limit(20)
      .offset((page - 1) * 20),
    db
      .select({ status: requests.status, count: sql<number>`count(*)::int` })
      .from(requests)
      .groupBy(requests.status),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(requests)
      .where(where),
    db
      .select({
        id: statusHistory.id,
        requestId: requests.id,
        ref: requests.public_ref,
        status: statusHistory.to_status,
        created: statusHistory.created_at,
      })
      .from(statusHistory)
      .innerJoin(requests, eq(statusHistory.request_id, requests.id))
      .orderBy(desc(statusHistory.created_at))
      .limit(5),
  ]);
  const count = (s: Status) => counts.find((c) => c.status === s)?.count || 0;
  const all = counts.reduce((s, c) => s + c.count, 0);
  const pageUrl = (n: number) =>
    `/admin?${new URLSearchParams({ ...(status ? { status } : {}), ...(source ? { source } : {}), page: String(n) })}`;
  return (
    <>
      <div className="admin-heading">
        <div>
          <span className="eyebrow">THE REQUEST DESK</span>
          <h1>Good service starts here.</h1>
          <p>Review requirements. Start a conversation. Find the right fit.</p>
        </div>
        <Link className="button button-primary" href="/admin/requests/new">
          <Plus size={17} /> Add request manually
        </Link>
      </div>
      <div className="stats-grid">
        <div className="stat-card">
          <span>New requests</span>
          <strong>{count("NEW")}</strong>
        </div>
        <div className="stat-card">
          <span>Active conversations</span>
          <strong>
            {count("CONTACTED") + count("IN_PROGRESS") + count("QUOTED")}
          </strong>
        </div>
        <div className="stat-card">
          <span>Closed · won</span>
          <strong>{count("CLOSED_WON")}</strong>
        </div>
        <div className="stat-card">
          <span>All requests</span>
          <strong>{all}</strong>
        </div>
      </div>
      <section className="panel">
        <h2 className="panel-title">Requests</h2>
        <form className="filters" action="/admin">
          <label>
            Status
            <select name="status" defaultValue={status || ""}>
              <option value="">All statuses</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]} ({count(s)})
                </option>
              ))}
            </select>
          </label>
          <label>
            Source
            <select name="source" defaultValue={source || ""}>
              <option value="">All sources</option>
              {sources.map((s) => (
                <option key={s} value={s}>
                  {sourceLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <button className="button button-outline button-sm">
            Apply filters
          </button>
          {(status || source) && (
            <Link className="button button-ghost button-sm" href="/admin">
              Clear
            </Link>
          )}
        </form>
        {rows.length ? (
          <>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Customer</th>
                    <th>Type / source</th>
                    <th>Status</th>
                    <th>Received · PKT</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ request: r, customer: c }) => (
                    <tr key={r.id}>
                      <td>
                        <Link
                          className="request-ref"
                          href={`/admin/requests/${r.id}`}
                        >
                          {r.public_ref}
                        </Link>
                      </td>
                      <td>
                        {c.name}
                        <small>{c.city}</small>
                      </td>
                      <td>
                        {typeLabels[r.request_type]}
                        <small>{sourceLabels[r.source]}</small>
                      </td>
                      <td>
                        <StatusBadge status={r.status} />
                      </td>
                      <td>{dateTime(r.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              {page > 1 && <Link href={pageUrl(page - 1)}>Previous</Link>}
              <span>
                Page {page} · {total[0].count} requests
              </span>
              {page * 20 < total[0].count && (
                <Link href={pageUrl(page + 1)}>Next</Link>
              )}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <Inbox size={33} />
            <h3>
              {all
                ? "No matching requests."
                : "Your first conversation starts here."}
            </h3>
            <p>
              {all
                ? "Try another status or source filter."
                : "Website requests and manually added WhatsApp leads will appear here."}
            </p>
            <Link
              className="button button-outline"
              href={all ? "/admin" : "/admin/requests/new"}
            >
              {all ? "Clear filters" : "Add a WhatsApp request"}
            </Link>
          </div>
        )}
      </section>
      <div className="notice">
        <span>
          <strong>Estimates: not enabled in Phase 1.</strong>
          <p>
            All requests proceed without an AI estimate. Pricing tools and
            failed-estimate monitoring will be added in Phase 2.
          </p>
        </span>
      </div>
      <section className="panel">
        <h2 className="panel-title">Recent activity</h2>
        <div className="panel-body">
          {activity.length ? (
            activity.map((a) => (
              <div className="activity-item" key={a.id}>
                <span>
                  <Link
                    className="request-ref"
                    href={`/admin/requests/${a.requestId}`}
                  >
                    {a.ref}
                  </Link>{" "}
                  · {statusLabels[a.status]}
                </span>
                <small>{dateTime(a.created)}</small>
              </div>
            ))
          ) : (
            <p className="form-intro" style={{ margin: 0 }}>
              Status changes will appear here as you work through requests.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
