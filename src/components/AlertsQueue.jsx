// =============================================================================
// AlertsQueue.jsx
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { base } from "../lib/airtableClient";
import "./QueueShared.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const FIELDS = [
  "Job ID", "Customer Name", "Location", "Sentiment",
  "Severity", "Routing Status", "Repeat Offender",
  "Response Sent", "Status Last Modified", "Raw Feedback", "AI Draft Response",
  "Customer Email", "Repair Issue"
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

export default function AlertsQueue({ locationFilter, onSelectRecord, onAlertCountChange }) {
  const [openRows,   setOpenRows]   = useState([]);
  const [actedRows,  setActedRows]  = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [showActed,  setShowActed]  = useState(true);

  const fetchData = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setLoading(true);
    setError("");
    try {
      const locationClause = locationFilter ? `{Location} = "${locationFilter}"` : "1=1";
      const formula = `AND(OR({Severity} = "High", {Routing Status} = "Escalated", {Repeat Offender} = TRUE()), ${locationClause})`;

      const records = await base(TABLE_NAME)
        .select({
          fields: FIELDS,
          filterByFormula: formula,
          sort: [{ field: "Status Last Modified", direction: "desc" }],
        })
        .all();

      const all   = records.map((r) => ({ id: r.id, ...r.fields }));
      const open  = all.filter((r) => !r["Response Sent"]);
      const acted = all.filter((r) =>  r["Response Sent"]);

      setOpenRows(open);
      setActedRows(acted);
      onAlertCountChange?.(open.length);
    } catch (err) {
      console.error("[AlertsQueue]", err);
      setError("Could not load alerts. Retry.");
    } finally { setLoading(false); }
  }, [locationFilter, onAlertCountChange]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  if (loading) return <div className="q-loading">Loading alerts…</div>;
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
              <th className="q-th">Sentiment</th>
              <th className="q-th">Severity</th>
              <th className="q-th">Flags</th>
              <th className="q-th">Last Modified</th>
              {!isActed && <th className="q-th">Action</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className={`q-row q-row--clickable ${isActed ? "q-row--acted" : "q-row--open"}`}
                onClick={() => onSelectRecord?.(row)}
                title="Click to open Action Loop"
              >
                <td className="q-td"><span className="id-badge">#{row["Job ID"] ?? "—"}</span></td>
                <td className="q-td">{row["Customer Name"] || <span className="empty-cell">—</span>}</td>
                <td className="q-td"><span className="location-chip">{row["Location"] || "—"}</span></td>
                <td className="q-td"><SentimentBadge value={row["Sentiment"]} /></td>
                <td className="q-td"><SeverityBadge  value={row["Severity"]}  /></td>
                <td className="q-td">
                  {row["Routing Status"] === "Escalated" && <span className="flag-chip flag--escalated">Escalated</span>}
                  {row["Repeat Offender"] && <span className="flag-chip flag--repeat">⚠️ Repeat</span>}
                </td>
                <td className="q-td q-td--date">{formatDate(row["Status Last Modified"])}</td>
                {!isActed && (
                  <td className="q-td q-td--center">
                    <span className="action-hint">Review →</span>
                  </td>
                )}
              </tr>
            ))}
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
            High-Priority Alerts
            {openRows.length > 0 && (
              <span className="q-count-badge q-count-badge--alert">{openRows.length} Open</span>
            )}
          </h2>
          <p className="q-sub">Escalated records and repeat offenders requiring immediate attention</p>
        </div>
        <button className="q-refresh" onClick={() => fetchData(false)}>↻ Refresh</button>
      </div>

      {openRows.length === 0 && actedRows.length === 0 ? (
        <div className="q-empty">
          <p>No escalated alerts for this location. ✅</p>
        </div>
      ) : (
        <>
          {/* Open Alerts */}
          {openRows.length > 0 && (
            <div className="q-section">
              <h3 className="q-section-title q-section-title--open">🔴 Open ({openRows.length})</h3>
              {renderTable(openRows, false)}
            </div>
          )}

          {/* Acted-Upon Alerts (collapsible) */}
          {actedRows.length > 0 && (
            <div className="q-section">
              <button className="q-section-toggle" onClick={() => setShowActed((v) => !v)}>
                {showActed ? "▼" : "▶"} Acted Upon ({actedRows.length})
              </button>
              {showActed && renderTable(actedRows, true)}
            </div>
          )}
        </>
      )}
    </div>
  );
}