// =============================================================================
// IntakeForm.jsx
// PRD Reference: §7.1 — Intake Form
//
// BUG FIX LOG (Bug #4 — 2026-09-24):
//   Error: Unknown field name: "Custmer Email"
//   Cause: Airtable base was created with field named "Customer Email" (correct
//          spelling). The PRD specified "Custmer Email" as a typo to preserve,
//          but the live base does not use that typo.
//   Fix:   Changed Airtable payload key to "Customer Email" to match live base.
//          Internal JS state variable remains "custmerEmail" for tracking purposes.
//          If n8n webhooks require "Custmer Email" later, rename the Airtable
//          field and revert this key — do not change both simultaneously.
//
// LOCATION FIELD:
//   Changed from <select> dropdown to <input> + <datalist>.
//   This gives US city/state suggestions while allowing free-text input.
// =============================================================================

import { useState } from "react";
import { base } from "../lib/airtableClient";
import "./IntakeForm.css";

// Table name from .env — must match your Airtable table name exactly
const TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME;

// US location suggestions for the datalist — staff can also type anything freely
const US_LOCATIONS = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "Charlotte, NC",
  "Indianapolis, IN",
  "San Francisco, CA",
  "Seattle, WA",
  "Denver, CO",
  "Nashville, TN",
  "Oklahoma City, OK",
  "El Paso, TX",
  "Washington, DC",
  "Las Vegas, NV",
  "Louisville, KY",
  "Memphis, TN",
  "Portland, OR",
  "Baltimore, MD",
  "Milwaukee, WI",
  "Albuquerque, NM",
  "Tucson, AZ",
  "Fresno, CA",
  "Sacramento, CA",
  "Mesa, AZ",
  "Kansas City, MO",
  "Atlanta, GA",
  "Omaha, NE",
  "Colorado Springs, CO",
  "Raleigh, NC",
  "Miami, FL",
  "Cleveland, OH",
  "Minneapolis, MN",
  "Tulsa, OK",
  "Tampa, FL",
  "New Orleans, LA",
  "Arlington, TX",
  "Wichita, KS",
  "Bakersfield, CA",
  "Aurora, CO",
  "Anaheim, CA",
];

const EMPTY_FORM = {
  customerName: "",
  custmerEmail: "",  // Internal JS key — Airtable field is "Customer Email" (see bug note above)
  location:     "",
  repairIssue:  "",
};

export default function IntakeForm() {
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [errors,     setErrors]     = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [status,     setStatus]     = useState(null);   // "success" | "error" | null
  const [apiError,   setApiError]   = useState("");

  // ── Field change handler ──────────────────────────────────────────────────
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: "" }));
    }
  };

  // ── Validation ────────────────────────────────────────────────────────────
  const validate = () => {
    const newErrors = {};

    if (!form.customerName.trim()) {
      newErrors.customerName = "Customer name is required.";
    }

    if (!form.custmerEmail.trim()) {
      newErrors.custmerEmail = "Email address is required.";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.custmerEmail.trim())) {
      newErrors.custmerEmail = "Please enter a valid email address.";
    }

    if (!form.location.trim()) {
      newErrors.location = "Location is required.";
    }

    if (!form.repairIssue.trim()) {
      newErrors.repairIssue = "Repair issue description is required.";
    }

    return newErrors;
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus(null);
    setApiError("");

    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);

    try {
      await base(TABLE_NAME).create([
        {
          fields: {
            "Customer Name":         form.customerName.trim(),
            "Customer Email":        form.custmerEmail.trim(),  // Bug #4 fix: matches live Airtable field name
            "Location":              form.location.trim(),
            "Repair Issue":          form.repairIssue.trim(),
            "Job Status":            "In Progress",
            "Feedback Request Sent": false,
            "Response Sent":         false,
          },
        },
      ]);

      setForm(EMPTY_FORM);
      setErrors({});
      setStatus("success");

    } catch (err) {
      console.error("[IntakeForm] Airtable POST failed:", err);
      setApiError(
        err?.message ||
        "Failed to create the job record. Please check your connection and try again."
      );
      setStatus("error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleRetry = () => {
    setStatus(null);
    setApiError("");
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="intake-form-wrapper">
      <div className="intake-form-header">
        <h2 className="intake-form-title">New Job Intake</h2>
        <p className="intake-form-sub">Register a new customer repair job</p>
      </div>

      {/* ── Success Banner ── */}
      {status === "success" && (
        <div className="intake-banner intake-banner--success" role="status" aria-live="polite">
          <span className="intake-banner-icon" aria-hidden="true">✅</span>
          <div>
            <strong>Job created successfully.</strong>
            <p>The record has been added to the job board. You can submit another job below.</p>
          </div>
        </div>
      )}

      {/* ── Error Banner ── */}
      {status === "error" && (
        <div className="intake-banner intake-banner--error" role="alert" aria-live="assertive">
          <span className="intake-banner-icon" aria-hidden="true">⚠️</span>
          <div>
            <strong>Submission failed.</strong>
            <p>{apiError}</p>
            <button className="intake-retry-btn" onClick={handleRetry}>
              Dismiss &amp; Retry
            </button>
          </div>
        </div>
      )}

      {/* ── Form ── */}
      <form className="intake-form" onSubmit={handleSubmit} noValidate>

        {/* Customer Name */}
        <div className="intake-field-group">
          <label htmlFor="customerName" className="intake-label">
            Customer Name <span className="intake-required" aria-hidden="true">*</span>
          </label>
          <input
            id="customerName"
            name="customerName"
            type="text"
            className={`intake-input ${errors.customerName ? "intake-input--error" : ""}`}
            placeholder="e.g. Jane Smith"
            value={form.customerName}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
          {errors.customerName && (
            <p className="intake-field-error" role="alert">{errors.customerName}</p>
          )}
        </div>

        {/* Customer Email */}
        <div className="intake-field-group">
          <label htmlFor="custmerEmail" className="intake-label">
            Customer Email <span className="intake-required" aria-hidden="true">*</span>
          </label>
          <input
            id="custmerEmail"
            name="custmerEmail"
            type="email"
            className={`intake-input ${errors.custmerEmail ? "intake-input--error" : ""}`}
            placeholder="customer@email.com"
            value={form.custmerEmail}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
          {errors.custmerEmail && (
            <p className="intake-field-error" role="alert">{errors.custmerEmail}</p>
          )}
        </div>

        {/* Location — free-text input with US city suggestions via datalist */}
        <div className="intake-field-group">
          <label htmlFor="location" className="intake-label">
            Location <span className="intake-required" aria-hidden="true">*</span>
          </label>
          <input
            id="location"
            name="location"
            type="text"
            list="location-suggestions"
            className={`intake-input ${errors.location ? "intake-input--error" : ""}`}
            placeholder="Type or select a US city…"
            value={form.location}
            onChange={handleChange}
            disabled={submitting}
            autoComplete="off"
          />
          {/* datalist provides suggestions but does NOT restrict input to the list */}
          <datalist id="location-suggestions">
            {US_LOCATIONS.map((loc) => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
          {errors.location && (
            <p className="intake-field-error" role="alert">{errors.location}</p>
          )}
        </div>

        {/* Repair Issue */}
        <div className="intake-field-group">
          <label htmlFor="repairIssue" className="intake-label">
            Repair Issue <span className="intake-required" aria-hidden="true">*</span>
          </label>
          <textarea
            id="repairIssue"
            name="repairIssue"
            className={`intake-input intake-textarea ${errors.repairIssue ? "intake-input--error" : ""}`}
            placeholder="Describe the vehicle repair issue in detail…"
            rows={4}
            value={form.repairIssue}
            onChange={handleChange}
            disabled={submitting}
          />
          {errors.repairIssue && (
            <p className="intake-field-error" role="alert">{errors.repairIssue}</p>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className={`intake-submit-btn ${submitting ? "intake-submit-btn--loading" : ""}`}
          disabled={submitting}
        >
          {submitting ? (
            <>
              <span className="intake-btn-spinner" aria-hidden="true" />
              Creating Job Record…
            </>
          ) : (
            "Submit Job"
          )}
        </button>

      </form>
    </div>
  );
}