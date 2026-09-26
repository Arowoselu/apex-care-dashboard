// =============================================================================
// StaffPortal.jsx
// =============================================================================

import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import IntakeForm from "../components/IntakeForm";
import JobBoardGrid from "../components/JobBoardGrid";
import "./StaffPortal.css";

export default function StaffPortal() {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState("intake");

  return (
    <div className="staff-portal">

      {/* ── Top Navigation Bar ── */}
      <header className="staff-nav">
        <div className="staff-nav-brand">
          <span className="staff-nav-title">Apex Care Auto</span>
          <span className="staff-nav-badge">Staff Portal</span>
        </div>
        <div className="staff-nav-user">
          <span className="staff-nav-email">{user?.email}</span>
          <button className="staff-nav-signout" onClick={signOut}>
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Tab Navigation ── */}
      <div className="staff-tabs-container">
        <div className="staff-tabs">
          <button
            className={`staff-tab ${activeTab === "intake" ? "staff-tab--active" : ""}`}
            onClick={() => setActiveTab("intake")}
          >
            New Job Intake
          </button>
          <button
            className={`staff-tab ${activeTab === "board" ? "staff-tab--active" : ""}`}
            onClick={() => setActiveTab("board")}
          >
            Active Job Board
          </button>
        </div>
      </div>

      {/* ── Main Content ── */}
      <main className="staff-main">
        {activeTab === "intake" && (
          <section className="staff-section">
            <IntakeForm />
          </section>
        )}

        {activeTab === "board" && (
          <section className="staff-section staff-section--wide">
            <JobBoardGrid />
          </section>
        )}
      </main>
    </div>
  );
}