// =============================================================================
// PrivateQueue.jsx
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { base } from "../lib/airtableClient";
import "./QueueShared.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const FIELDS = [
  "Job ID", "Customer Name", "Location", "Sentiment", "Severity",
  "Status Last Modified", "Raw Feedback", "AI Draft Response", "Customer Email",
  "Routing Status", "Response Sent",
];

const SentimentBadge = ({ value }) => {
  const map = { Positive: "badge--positive", Neutral: "badge--neutral", Negative: "badge--negative" };
  return value ? <span className={`badge ${map[value] ?? "badge--neutral"}`}>{value}</span> : <span className="empty-cell">—</span>;
};

const SeverityBadge = ({ value }) => (
  value ? <span className={`badge ${value === "High" ? "badge--high" : "badge--low"}`}>{value}</span> : <span className="empty-cell">—</span>
);

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
};

export default function PrivateQueue({ locationFilter, onSelectRecord }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const fetchData = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setLoading(true);
    setError("");
    try {
      const locationClause = locationFilter ? `{Location} = "${locationFilter}"` : "1=1";
      const formula = `AND({Sentiment} = "Negative", {Severity} = "Low", {Response Sent} = FALSE(), ${locationClause})`;

      const records = await base(TABLE_NAME)
        .select({ fields: FIELDS, filterByFormula: formula })
        .all();

      const sorted = records
        .map((r) => ({ id: r.id, ...r.fields }))
        .sort((a, b) => {
          if (a["Severity"] === "High" && b["Severity"] !== "High") return -1;
          if (b["Severity"] === "High" && a["Severity"] !== "High") return  1;
          return new Date(b["Status Last Modified"] ?? 0) - new Date(a["Status Last Modified"] ?? 0);
        });

      setRows(sorted);
    } catch (err) {
      console.error("[PrivateQueue]", err);
      setError("Could not load private queue. Retry.");
    } finally { setLoading(false); }
  }, [locationFilter]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <div className="q-loading">Loading private queue…</div>;
  if (error)   return <div className="q-error">{error} <button onClick={() => fetchData(false)}>Retry</button></div>;

  return (
    <div className="q-wrapper">
      <div className="q-header">
        <div>
          <h2 className="q-title">
            Private Queue
            {rows.length > 0 && (
              <span className="q-count-badge q-count-badge--private">{rows.length} Pending</span>
            )}
          </h2>
          <p className="q-sub">Negative feedback requiring a direct private response</p>
        </div>
        <button className="q-refresh" onClick={() => fetchData(false)}>↻ Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div className="q-empty">
          <p>No pending private queue items. ✅</p>
        </div>
      ) : (
        <div className="q-scroll">
          <table className="q-table">
            <thead>
              <tr>
                <th className="q-th">Job ID</th>
                <th className="q-th">Customer Name</th>
                <th className="q-th">Sentiment</th>
                <th className="q-th">Severity</th>
                <th className="q-th">Last Modified</th>
                <th className="q-th">Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="q-row q-row--clickable"
                  onClick={() => onSelectRecord?.(row)}
                  title="Click to open Action Loop"
                >
                  <td className="q-td"><span className="id-badge">#{row["Job ID"] ?? "—"}</span></td>
                  <td className="q-td">{row["Customer Name"] || <span className="empty-cell">—</span>}</td>
                  <td className="q-td"><SentimentBadge value={row["Sentiment"]} /></td>
                  <td className="q-td"><SeverityBadge  value={row["Severity"]}  /></td>
                  <td className="q-td q-td--date">{formatDate(row["Status Last Modified"])}</td>
                  <td className="q-td q-td--center">
                    <span className="action-hint">Review →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}