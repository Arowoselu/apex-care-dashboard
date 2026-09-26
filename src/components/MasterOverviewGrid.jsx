// =============================================================================
// MasterOverviewGrid.jsx
// Shows all records where Routing Status is not empty (pipeline-processed).
// Columns: Job ID, Customer Name, Location, Sentiment, Severity,
//          Routing Status, Repeat Offender, Response Sent, Feedback Status.
// Sortable by any column.
// =============================================================================

import { useState, useEffect, useCallback } from "react";
import { base } from "../lib/airtableClient";
import "./QueueShared.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const FIELDS = [
  "Job ID", "Customer Name", "Location", "Sentiment",
  "Severity", "Routing Status", "Repeat Offender", "Response Sent",
  "Feedback Request Sent"
];

const SentimentBadge = ({ value }) => {
  const map = { Positive: "badge--positive", Neutral: "badge--neutral", Negative: "badge--negative" };
  return value ? <span className={`badge ${map[value] ?? "badge--neutral"}`}>{value}</span> : <span className="empty-cell">—</span>;
};

const SeverityBadge = ({ value }) => (
  value ? <span className={`badge ${value === "High" ? "badge--high" : "badge--low"}`}>{value}</span> : <span className="empty-cell">—</span>
);

export default function MasterOverviewGrid({ locationFilter }) {
  const [rows,      setRows]      = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState("");
  const [sortField, setSortField] = useState(null);
  const [sortDir,   setSortDir]   = useState("asc");

  const fetchData = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setLoading(true);
    setError("");
    try {
      const formula = locationFilter
        ? `AND(NOT({Routing Status} = ""), {Location} = "${locationFilter}")`
        : `NOT({Routing Status} = "")`;

      const records = await base(TABLE_NAME)
        .select({ fields: FIELDS, filterByFormula: formula })
        .all();
      setRows(records.map((r) => ({ id: r.id, ...r.fields })));
    } catch (err) {
      console.error("[MasterOverviewGrid]", err);
      setError("Could not load overview. Retry.");
    } finally { setLoading(false); }
  }, [locationFilter]);

  useEffect(() => {
    fetchData(false);
    const interval = setInterval(() => fetchData(true), 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir((d) => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sorted = [...rows].sort((a, b) => {
    if (!sortField) return 0;
    const av = a[sortField] ?? ""; const bv = b[sortField] ?? "";
    return sortDir === "asc" ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });

  const SortTh = ({ field, label }) => (
    <th className="q-th q-th--sortable" onClick={() => handleSort(field)}>
      {label}
      <span className="sort-icon">
        {sortField === field ? (sortDir === "asc" ? " ↑" : " ↓") : " ↕"}
      </span>
    </th>
  );

  if (loading) return <div className="q-loading">Loading overview…</div>;
  if (error)   return <div className="q-error">{error} <button onClick={() => fetchData(false)}>Retry</button></div>;

  return (
    <div className="q-wrapper">
      <div className="q-header">
        <div>
          <h2 className="q-title">Master Overview</h2>
          <p className="q-sub">{rows.length} processed record{rows.length !== 1 ? "s" : ""}</p>
        </div>
        <button className="q-refresh" onClick={() => fetchData(false)}>↻ Refresh</button>
      </div>

      {rows.length === 0 ? (
        <div className="q-empty">
          <p>No processed records found for this location.</p>
          <p className="q-empty-note">Records appear here after n8n processes completed jobs.</p>
        </div>
      ) : (
        <div className="q-scroll">
          <table className="q-table">
            <thead>
              <tr>
                <SortTh field="Job ID"         label="Job ID"         />
                <SortTh field="Customer Name"   label="Customer Name"  />
                <SortTh field="Location"        label="Location"       />
                <SortTh field="Sentiment"       label="Sentiment"      />
                <SortTh field="Severity"        label="Severity"       />
                <SortTh field="Routing Status"  label="Routing Status" />
                <th className="q-th">Feedback Status</th>
                <th className="q-th">Repeat Offender</th>
                <th className="q-th">Response Sent</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => (
                <tr key={row.id} className="q-row">
                  <td className="q-td"><span className="id-badge">#{row["Job ID"] ?? "—"}</span></td>
                  <td className="q-td">{row["Customer Name"] || <span className="empty-cell">—</span>}</td>
                  <td className="q-td"><span className="location-chip">{row["Location"] || "—"}</span></td>
                  <td className="q-td"><SentimentBadge value={row["Sentiment"]} /></td>
                  <td className="q-td"><SeverityBadge  value={row["Severity"]}  /></td>
                  <td className="q-td">
                    <span className="routing-chip">{row["Routing Status"] || "—"}</span>
                  </td>
                  <td className="q-td q-td--center">
                    {row["Feedback Request Sent"]
                      ? <span className="badge badge--positive">Sent ✓</span>
                      : <span className="badge badge--neutral">Pending (24h)</span>}
                  </td>
                  <td className="q-td q-td--center">
                    {row["Repeat Offender"] ? <span className="repeat-flag" title="Repeat Offender">⚠️</span> : <span className="empty-cell">—</span>}
                  </td>
                  <td className="q-td q-td--center">
                    {row["Response Sent"]
                      ? <span className="badge badge--positive">Sent</span>
                      : <span className="badge badge--neutral">Pending</span>}
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