// =============================================================================
// JobBoardGrid.jsx
// =============================================================================

import React, { useState, useEffect, useCallback, useRef } from "react";
import { base } from "../lib/airtableClient";
import "./JobBoardGrid.css";

const TABLE_NAME    = import.meta.env.VITE_AIRTABLE_TABLE_NAME;
const POLL_INTERVAL = 30_000; 

const AIRTABLE_FIELDS = [
  "Job ID",
  "Customer Name",
  "Customer Email",
  "Location",
  "Repair Issue",
  "Job Status",
  "Status Last Modified",
];

export default function JobBoardGrid() {
  const [rows,       setRows]       = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fetchError, setFetchError] = useState("");
  const [rowState,   setRowState]   = useState({});
  const intervalRef = useRef(null);

  const fetchJobs = useCallback(async (isBackgroundPolling = false) => {
    if (!isBackgroundPolling) setRefreshing(true);
    setFetchError("");

    try {
      const records = await base(TABLE_NAME)
        .select({
          fields:     AIRTABLE_FIELDS,
          filterByFormula: '{Job Status} = "In Progress"',
          sort: [{ field: "Status Last Modified", direction: "desc" }],
        })
        .all();

      setRows(records.map((r) => ({ id: r.id, ...r.fields })));
    } catch (err) {
      console.error("[JobBoardGrid] Fetch failed:", err);
      setFetchError("Could not load jobs. Check your connection and refresh.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchJobs(false);
    intervalRef.current = setInterval(() => fetchJobs(true), POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [fetchJobs]);

  const handleMarkComplete = async (row) => {
    const confirmed = window.confirm(
      "Mark this job as complete? This will send a feedback request to the customer."
    );
    if (!confirmed) return;

    setRowState((prev) => ({
      ...prev,
      [row.id]: { completing: true, error: "" },
    }));

    try {
      await base(TABLE_NAME).update([
        {
          id: row.id,
          fields: {
            "Job Status": "Completed",
          },
        },
      ]);

      setRows((prev) => prev.filter((r) => r.id !== row.id));
      setRowState((prev) => {
        const next = { ...prev };
        delete next[row.id];
        return next;
      });

    } catch (err) {
      console.error("[JobBoardGrid] Mark Complete failed:", err);
      setRowState((prev) => ({
        ...prev,
        [row.id]: {
          completing: false,
          error: err?.message || "Action failed. Please try again.",
        },
      }));
    }
  };

  const dismissRowError = (rowId) => {
    setRowState((prev) => ({
      ...prev,
      [rowId]: { completing: false, error: "" },
    }));
  };

  return (
    <div className="jbg-wrapper">
      <div className="jbg-header">
        <div>
          <h2 className="jbg-title">Active Jobs</h2>
          <p className="jbg-sub">
            {loading ? "Loading..." : `${rows.length} job${rows.length !== 1 ? "s" : ""} in progress`}
          </p>
        </div>
        <button
          className={`jbg-refresh-btn ${refreshing ? "jbg-refresh-btn--spinning" : ""}`}
          onClick={() => fetchJobs(false)}
          disabled={refreshing || loading}
          aria-label="Refresh job board"
          title="Refresh"
        >
          <svg className="jbg-refresh-icon" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 2v6h-6"/><path d="M3 12a9 9 0 1 0 2.63-6.37L21 8"/>
          </svg>
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {fetchError && (
        <div className="jbg-fetch-error" role="alert">
          <span aria-hidden="true">&#9888;</span> {fetchError}
          <button className="jbg-fetch-retry" onClick={() => fetchJobs(true)}>
            Retry
          </button>
        </div>
      )}

      {loading && (
        <div className="jbg-loading">
          {[1, 2, 3].map((n) => (
            <div key={n} className="jbg-skeleton-row">
              <div className="jbg-skeleton-cell jbg-skeleton-cell--sm" />
              <div className="jbg-skeleton-cell jbg-skeleton-cell--md" />
              <div className="jbg-skeleton-cell jbg-skeleton-cell--sm" />
              <div className="jbg-skeleton-cell jbg-skeleton-cell--lg" />
              <div className="jbg-skeleton-cell jbg-skeleton-cell--sm" />
            </div>
          ))}
        </div>
      )}

      {!loading && rows.length === 0 && !fetchError && (
        <div className="jbg-empty">
          <p className="jbg-empty-title">No active jobs</p>
          <p className="jbg-empty-sub">
            Jobs will appear here after they are submitted via the intake form above.
          </p>
        </div>
      )}

      {!loading && rows.length > 0 && (
        <div className="jbg-table-scroll">
          <table className="jbg-table">
            <thead>
              <tr>
                <th className="jbg-th">Job ID</th>
                <th className="jbg-th">Customer Name</th>
                <th className="jbg-th">Email</th>
                <th className="jbg-th">Location</th>
                <th className="jbg-th">Repair Issue</th>
                <th className="jbg-th">Job Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const state      = rowState[row.id] ?? {};
                const completing = state.completing ?? false;
                const rowError   = state.error ?? "";

                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`jbg-row ${completing ? "jbg-row--busy" : ""} ${rowError ? "jbg-row--error" : ""}`}
                    >
                      <td className="jbg-td jbg-td--id">
                        <span className="jbg-id-badge">
                          #{row["Job ID"] ?? "-"}
                        </span>
                      </td>

                      <td className="jbg-td">
                        {row["Customer Name"] || <span className="jbg-empty-cell">-</span>}
                      </td>

                      <td className="jbg-td jbg-td--email">
                        {row["Customer Email"] || <span className="jbg-empty-cell">-</span>}
                      </td>

                      <td className="jbg-td">
                        <span className="jbg-location-chip">
                          {row["Location"] || "-"}
                        </span>
                      </td>

                      <td className="jbg-td jbg-td--issue">
                        <div className="jbg-tooltip-container">
                          <span className="jbg-issue-text">
                            {row["Repair Issue"] || <span className="jbg-empty-cell">-</span>}
                          </span>
                          {row["Repair Issue"] && (
                            <div className="jbg-tooltip">
                              {row["Repair Issue"]}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="jbg-td jbg-td--status">
                        <button
                          className={`jbg-complete-btn ${completing ? "jbg-complete-btn--loading" : ""}`}
                          onClick={() => handleMarkComplete(row)}
                          disabled={completing}
                        >
                          {completing ? (
                            <>
                              <span className="jbg-btn-spinner" aria-hidden="true" />
                              Working...
                            </>
                          ) : (
                            "Mark Complete"
                          )}
                        </button>
                      </td>
                    </tr>

                    {rowError && (
                      <tr className="jbg-row-error-row">
                        <td colSpan={6} className="jbg-row-error-cell">
                          <span aria-hidden="true">&#9888;</span> {rowError}
                          <button
                            className="jbg-row-error-dismiss"
                            onClick={() => dismissRowError(row.id)}
                          >
                            Dismiss
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}