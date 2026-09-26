// =============================================================================
// ManagementDashboard.jsx
// PRD Reference: §8 — Phase 2: Management Intelligence Dashboard
//
// The only page accessible to the "management" role (PRD §5).
// Renders:
//   - Sticky top nav with user info + sign out
//   - Global Location Filter (§8.1) — scopes all queues below
//   - Tab navigation for the four data queues
//   - §8.2 Master Overview Grid
//   - §8.3 High-Priority Alerts Queue
//   - §8.4 Standard Private Queue
//   - §8.5 Ready to Post Queue
//
// Phase 3 (Action Loop modal) is wired in via selectedRecord state.
// When a manager clicks a record in Alerts or Private Queue,
// selectedRecord is set — Phase 3 modal will render here.
// =============================================================================

import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { base } from "../lib/airtableClient";
import MasterOverviewGrid   from "../components/MasterOverviewGrid";
import AlertsQueue          from "../components/AlertsQueue";
import PrivateQueue         from "../components/PrivateQueue";
import ReadyToPostQueue     from "../components/ReadyToPostQueue";
import HumanReviewQueue     from "../components/HumanReviewQueue";
import ActionLoopModal      from "../components/ActionLoopModal";
import "./ManagementDashboard.css";

const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

const TABS = [
  { id: "overview", label: "Overview"            },
  { id: "alerts",   label: "Alerts"              },
  { id: "private",  label: "Private Queue"       },
  { id: "ready",    label: "Ready to Post"       },
  { id: "review",   label: "Human Review"        },
];

export default function ManagementDashboard() {
  const { user, signOut } = useAuth();

  // ── Location filter state (§8.1) ─────────────────────────────────────────
  // Default to manager's assigned location from Supabase user_metadata.
  // Falls back to "All Locations" if not set.
  const defaultLocation = user?.user_metadata?.location ?? "All Locations";
  const [selectedLocation, setSelectedLocation] = useState(defaultLocation);
  const [locations,        setLocations]         = useState(["All Locations"]);

  // ── Tab state ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState("overview");

  // ── Alert count badge (open alerts only — PRD §8.3) ──────────────────────
  const [openAlertCount, setOpenAlertCount] = useState(0);

  // ── Phase 3: selected record for Action Loop ──────────────────────────────
  // Set when a manager clicks a row in Alerts or Private Queue.
  const [selectedRecord, setSelectedRecord] = useState(null);

  // ── Modals and Refs ───────────────────────────────────────────────────────
  // When modal succeeds, we just close it. The children's 30s intervals
  // will naturally pick up the Airtable changes once n8n completes its workflow.
  const handleModalSuccess = () => {};

  // ── Fetch distinct location values for the filter dropdown ────────────────
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        const records = await base(TABLE_NAME)
          .select({ fields: ["Location"] })
          .all();

        const distinct = [
          "All Locations",
          ...new Set(
            records
              .map((r) => r.fields["Location"])
              .filter(Boolean)
          ),
        ];
        setLocations(distinct);
      } catch (err) {
        console.error("[ManagementDashboard] Failed to fetch locations:", err);
      }
    };

    fetchLocations();
  }, []);

  // ── Build the location filter formula fragment used by child grids ─────────
  // Returns empty string for "All Locations" (no filter applied).
  const locationFilter =
    selectedLocation === "All Locations"
      ? ""
      : selectedLocation;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="mgmt-page">

      {/* ── Top Navigation Bar ── */}
      <header className="mgmt-nav">
        <div className="mgmt-nav-brand">
          <span className="mgmt-nav-icon" aria-hidden="true">📊</span>
          <span className="mgmt-nav-title">Apex Care Auto</span>
          <span className="mgmt-nav-badge">Management</span>
        </div>
        <div className="mgmt-nav-right">
          <span className="mgmt-nav-email">{user?.email}</span>
          <button className="mgmt-nav-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Dashboard Content ── */}
      <main className="mgmt-main">

        {/* ── §8.1 Location Filter Bar ── */}
        <div className="mgmt-filter-bar">
          <label htmlFor="locationFilter" className="mgmt-filter-label">
            📍 Viewing:
          </label>
          <select
            id="locationFilter"
            className="mgmt-filter-select"
            value={selectedLocation}
            onChange={(e) => setSelectedLocation(e.target.value)}
          >
            {locations.map((loc) => (
              <option key={loc} value={loc}>{loc}</option>
            ))}
          </select>
        </div>

        {/* ── Tab Navigation ── */}
        <nav className="mgmt-tabs" aria-label="Dashboard sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              className={`mgmt-tab ${activeTab === tab.id ? "mgmt-tab--active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
            >
              {tab.label}
              {/* Alert badge on the Alerts tab */}
              {tab.id === "alerts" && openAlertCount > 0 && (
                <span className="mgmt-tab-badge">{openAlertCount}</span>
              )}
            </button>
          ))}
        </nav>

        {/* ── Queue Panels — only the active tab renders ── */}
        <div className="mgmt-panel">
          {activeTab === "overview" && (
            <MasterOverviewGrid
              locationFilter={locationFilter}
              onSelectRecord={setSelectedRecord}
            />
          )}
          {activeTab === "alerts" && (
            <AlertsQueue
              locationFilter={locationFilter}
              onSelectRecord={setSelectedRecord}
              onAlertCountChange={setOpenAlertCount}
            />
          )}
          {activeTab === "private" && (
            <PrivateQueue
              locationFilter={locationFilter}
              onSelectRecord={setSelectedRecord}
            />
          )}
          {activeTab === "ready" && (
            <ReadyToPostQueue
              locationFilter={locationFilter}
            />
          )}
          {activeTab === "review" && (
            <HumanReviewQueue
              locationFilter={locationFilter}
              onSelectRecord={setSelectedRecord}
            />
          )}
        </div>

      </main>

      {/* ── Phase 3: Action Loop Modal ── */}
      {/* Renders on top of everything when a record is selected */}
      {selectedRecord && (
        <ActionLoopModal
          record={selectedRecord}
          onClose={() => setSelectedRecord(null)}
          onSuccess={handleModalSuccess}
        />
      )}

    </div>
  );
}