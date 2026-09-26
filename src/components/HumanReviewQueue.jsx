// =============================================================================
// HumanReviewQueue.jsx
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { base } from "../lib/airtableClient";
import "./QueueShared.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const FIELDS = [
  "Job ID", "Customer Name", "Location", "Sentiment", "Severity",
  "Status Last Modified", "Raw Feedback", "AI Draft Response", "Customer Email",
  "Routing Status", "Response Sent", "Repair Issue", "Repeat Offender"
];

const formatDate = (iso) => {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso));
};

export default function HumanReviewQueue({ locationFilter, onSelectRecord }) {
  const [pendingRows, setPendingRows] = useState([]);
  const [actedRows,   setActedRows]   = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [showActed,   setShowActed]   = useState(true);

  const fetchData = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setLoading(true);
    setError("");
    try {
      const locationClause = locationFilter ? `{Location} = "${locationFilter}"` : "1=1";
      const formula = `AND({Sentiment} = "Unscorable", ${locationClause})`;

      const records = await base(TABLE_NAME)
        .select({
          fields: FIELDS,
          filterByFormula: formula,
          sort: [{ field: "Status Last Modified", direction: "desc" }],
        })
        .all();

      const all     = records.map((r) => ({ id: r.id, ...r.fields }));
      const pending = all.filter((r) => !r["Response Sent"]);
      const acted   = all.filter((r) =>  r["Response Sent"]);

      setPendingRows(pending);
      setActedRows(acted);
    } catch (err) {
      console.error("[HumanReviewQueue]", err);
      setError("Could not load human review queue. Retry.");
    } finally { setLoading(false); }
  }, [locationFilter]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <div className="q-loading">Loading review queue…</div>;
  if (error)   return <div className="q-error">{error} <button onClick={() => fetchData(false)}>Retry</button></div>;

  const renderTable = (rows, isActed) => (
    rows.length === 0 ? null : (
      <div className="q-scroll">
        <table className="q-table">
          <thead>
            <tr>
              <th className="q-th">Job ID</th>
              <th className="q-th">Customer Name</th>
              <th className="q-th">Location</th>
              <th className="q-th">Feedback Preview</th>
              <th className="q-th">Last Modified</th>
              {!isActed && <th className="q-th">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const preview = (row["Raw Feedback"] ?? "").slice(0, 80);
              return (
                <tr
                  key={row.id}
                  className={`q-row q-row--clickable ${isActed ? "q-row--acted" : "q-row--open"}`}
                  onClick={() => onSelectRecord?.(row)}
                  title="Click to open Action Loop"
                >
                  <td className="q-td"><span className="id-badge">#{row["Job ID"] ?? "—"}</span></td>
                  <td className="q-td">{row["Customer Name"] || <span className="empty-cell">—</span>}</td>
                  <td className="q-td"><span className="location-chip">{row["Location"] || "—"}</span></td>
                  <td className="q-td q-td--preview">
                    <span className="feedback-preview" title={row["Raw Feedback"]}>
                      {preview ? `${preview}${row["Raw Feedback"].length > 80 ? "…" : ""}` : <span className="empty-cell">—</span>}
                    </span>
                  </td>
                  <td className="q-td q-td--date">{formatDate(row["Status Last Modified"])}</td>
                  {!isActed && (
                    <td className="q-td q-td--center">
                      <span className="action-hint">Review →</span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )
  );

  return (
    <div className="q-wrapper">
      <div className="q-header">
        <div>
          <h2 className="q-title">
            Needs Human Review
            {pendingRows.length > 0 && (
              <span className="q-count-badge q-count-badge--alert">{pendingRows.length} Pending</span>
            )}
          </h2>
          <p className="q-sub">Records marked as Unscorable requiring manual review</p>
        </div>
        <button className="q-refresh" onClick={() => fetchData(false)}>↻ Refresh</button>
      </div>

      {pendingRows.length === 0 && actedRows.length === 0 ? (
        <div className="q-empty">
          <p>No records require manual review. ✅</p>
        </div>
      ) : (
        <>
          {/* Pending Reviews */}
          {pendingRows.length > 0 && (
            <div className="q-section">
              <h3 className="q-section-title q-section-title--open">🔴 Pending Review ({pendingRows.length})</h3>
              {renderTable(pendingRows, false)}
            </div>
          )}

          {/* Acted-Upon Reviews */}
          {actedRows.length > 0 && (
            <div className="q-section">
              <button className="q-section-toggle" onClick={() => setShowActed((v) => !v)}>
                {showActed ? "▼" : "▶"} Reviewed & Answered ({actedRows.length})
              </button>
              {showActed && renderTable(actedRows, true)}
            </div>
          )}
        </>
      )}
    </div>
  );
}