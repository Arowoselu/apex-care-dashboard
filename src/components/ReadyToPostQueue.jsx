// =============================================================================
// ReadyToPostQueue.jsx
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { base } from "../lib/airtableClient";
import "./QueueShared.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const FIELDS = [
  "Job ID", "Customer Name", "Location",
  "Raw Feedback", "Status Last Modified",
];

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
};

export default function ReadyToPostQueue({ locationFilter }) {
  const [rows,    setRows]    = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");
  const [copyState, setCopyState] = useState({});

  const fetchData = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setLoading(true);
    setError("");
    try {
      const locationClause = locationFilter ? `{Location} = "${locationFilter}"` : "1=1";
      const formula = `AND({Sentiment} = "Positive", ${locationClause})`;

      const records = await base(TABLE_NAME)
        .select({
          fields: FIELDS,
          filterByFormula: formula,
          sort: [{ field: "Status Last Modified", direction: "desc" }],
        })
        .all();

      setRows(records.map((r) => ({ id: r.id, ...r.fields })));
    } catch (err) {
      console.error("[ReadyToPostQueue]", err);
      setError("Could not load ready-to-post queue. Retry.");
    } finally { setLoading(false); }
  }, [locationFilter]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleCopy = async (row) => {
    const text = row["Raw Feedback"] ?? "";
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((prev) => ({ ...prev, [row.id]: "copied" }));
      setTimeout(() => setCopyState((prev) => ({ ...prev, [row.id]: "idle" })), 2500);
    } catch {
      setCopyState((prev) => ({ ...prev, [row.id]: "error" }));
      setTimeout(() => setCopyState((prev) => ({ ...prev, [row.id]: "idle" })), 2500);
    }
  };

  if (loading) return <div className="q-loading">Loading ready-to-post queue…</div>;
  if (error)   return <div className="q-error">{error} <button onClick={() => fetchData(false)}>Retry</button></div>;

  return (
    <div className="q-wrapper">
      <div className="q-header">
        <div>
          <h2 className="q-title">
            Ready to Post
            {rows.length > 0 && (
              <span className="q-count-badge q-count-badge--ready">{rows.length}</span>
            )}
          </h2>
          <p className="q-sub">Positive feedback ready to share publicly</p>
        </div>
        <button className="q-refresh" onClick={() => fetchData(false)}>↻ Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div className="q-empty">
          <p>No records ready to post for this location.</p>
        </div>
      ) : (
        <div className="q-scroll">
          <table className="q-table">
            <thead>
              <tr>
                <th className="q-th">Job ID</th>
                <th className="q-th">Customer Name</th>
                <th className="q-th">Location</th>
                <th className="q-th">Feedback Preview</th>
                <th className="q-th">Last Modified</th>
                <th className="q-th q-th--center">Copy</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const state   = copyState[row.id] ?? "idle";
                const preview = (row["Raw Feedback"] ?? "").slice(0, 80);
                return (
                  <tr key={row.id} className="q-row">
                    <td className="q-td"><span className="id-badge">#{row["Job ID"] ?? "—"}</span></td>
                    <td className="q-td">{row["Customer Name"] || <span className="empty-cell">—</span>}</td>
                    <td className="q-td"><span className="location-chip">{row["Location"] || "—"}</span></td>
                    <td className="q-td q-td--preview">
                      <span className="feedback-preview" title={row["Raw Feedback"]}>
                        {preview ? `${preview}${row["Raw Feedback"].length > 80 ? "…" : ""}` : <span className="empty-cell">—</span>}
                      </span>
                    </td>
                    <td className="q-td q-td--date">{formatDate(row["Status Last Modified"])}</td>
                    <td className="q-td q-td--center">
                      <button
                        className={`copy-btn ${state === "copied" ? "copy-btn--copied" : ""} ${state === "error" ? "copy-btn--error" : ""}`}
                        onClick={() => handleCopy(row)}
                        disabled={state !== "idle"}
                      >
                        {state === "copied" ? "Copied ✓" : state === "error" ? "Failed" : "Copy"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}