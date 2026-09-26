// =============================================================================
// ActionLoopModal.jsx
// =============================================================================

import React, { useState, useEffect, useRef } from "react";
import "./ActionLoopModal.css";

const WEBHOOK_URL = import.meta.env.VITE_N8N_WEBHOOK_SEND_EMAIL;

const safeString = (val) => {
  if (val === null || val === undefined) return "";
  if (Array.isArray(val)) return val.map(v => typeof v === "object" ? JSON.stringify(v) : String(v)).join(", ");
  if (typeof val === "object") return JSON.stringify(val);
  return String(val);
};

const SentimentBadge = ({ value }) => {
  const strVal = safeString(value);
  const map = { Positive: "alm-badge--positive", Neutral: "alm-badge--neutral", Negative: "alm-badge--negative" };
  return strVal ? <span className={`alm-badge ${map[strVal] || "alm-badge--neutral"}`}>{strVal}</span> : null;
};

const SeverityBadge = ({ value }) => {
  const strVal = safeString(value);
  return strVal ? <span className={`alm-badge ${strVal === "High" ? "alm-badge--high" : "alm-badge--low"}`}>{strVal}</span> : null;
};

// Error Boundary specifically to catch and display any fatal crashes in the modal
class ModalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#ef4444", color: "#fff", padding: "2rem", overflow: "auto" }}>
          <h2>Action Loop Modal Crashed!</h2>
          <p>Please share this error message with the AI:</p>
          <pre style={{ background: "rgba(0,0,0,0.3)", padding: "1rem" }}>
            {this.state.error?.toString()}
          </pre>
          <button onClick={this.props.onClose} style={{ padding: "0.5rem 1rem", marginTop: "1rem", color: "#000" }}>Close</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function ActionLoopModalContent({ record, onClose, onSuccess }) {
  const draftInitialValue = safeString(record?.["AI Draft Response"] || "");
  const [draftText,  setDraftText]  = useState(draftInitialValue);
  const [sending,    setSending]    = useState(false);
  const [sendError,  setSendError]  = useState("");
  const [sent,       setSent]       = useState(false);
  const textareaRef = useRef(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSend = async () => {
    const finalDraft = safeString(draftText).trim();
    if (!finalDraft) {
      setSendError("Response text cannot be empty.");
      return;
    }

    setSending(true);
    setSendError("");

    try {
      const payload = {
        job_id:             safeString(record?.["Job ID"] || record?.id || ""),
        customer_email:     safeString(record?.["Customer Email"] || ""),
        finalized_response: finalDraft,
      };

      if (!WEBHOOK_URL) {
        throw new Error("VITE_N8N_WEBHOOK_SEND_EMAIL is not set in .env.");
      }

      const webhookRes = await fetch(WEBHOOK_URL, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(payload),
      });

      if (!webhookRes.ok) {
        throw new Error(`n8n webhook failed with status ${webhookRes.status}.`);
      }

      setSent(true);
      setTimeout(() => {
        onSuccess?.();
        onClose();
      }, 1400);

    } catch (err) {
      console.error("[ActionLoopModal] Send failed:", err);
      setSendError(err?.message || "Something went wrong.");
      setSending(false);
    }
  };

  const charCount = safeString(draftText).length;
  const isSendDisabled = sending || sent || !safeString(draftText).trim();

  // The critical fix: The alm-container is now properly nested INSIDE the alm-backdrop.
  // onClick on the backdrop closes the modal, but onClick on the container stops propagation so clicking inside the modal doesn't close it.
  return (
    <div className="alm-backdrop" onPointerDown={onClose} aria-hidden="true">
      <div 
        className="alm-container" 
        role="dialog" 
        aria-modal="true" 
        aria-labelledby="alm-title"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="alm-header">
          <div className="alm-header-meta">
            <div className="alm-header-left">
              <span className="alm-job-id">#{safeString(record?.["Job ID"] || "—")}</span>
              <h2 id="alm-title" className="alm-title">
                {safeString(record?.["Customer Name"] || "Unknown Customer")}
              </h2>
            </div>
            <div className="alm-badges">
              {record?.["Location"] && <span className="alm-location">{safeString(record?.["Location"])}</span>}
              <SentimentBadge value={record?.["Sentiment"]} />
              <SeverityBadge  value={record?.["Severity"]}  />
              {record?.["Repeat Offender"] && (
                <span className="alm-badge alm-badge--repeat" title="Repeat Offender">⚠️ Repeat Offender</span>
              )}
            </div>
          </div>
          <button className="alm-close-btn" onClick={onClose} aria-label="Close" disabled={sending}>✕</button>
        </div>

        <div className="alm-body">
          <div className="alm-left">
            <div className="alm-field-block">
              <label className="alm-field-label">Repair Issue</label>
              <div className="alm-read-box">{safeString(record?.["Repair Issue"] || "Not recorded")}</div>
            </div>
            <div className="alm-field-block">
              <label className="alm-field-label">Customer Feedback</label>
              <div className="alm-read-box alm-read-box--feedback">
                {safeString(record?.["Raw Feedback"] || "No feedback recorded yet.")}
              </div>
            </div>
          </div>

          <div className="alm-right">
            <div className="alm-label-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <label className="alm-field-label" htmlFor="alm-draft">
                AI Draft Response <span className="alm-editable-hint" style={{ textTransform: 'none', color: 'var(--text-muted)' }}> — editable</span>
              </label>
              <span className="alm-char-count">{charCount} chars</span>
            </div>
            <textarea
              id="alm-draft"
              ref={textareaRef}
              className="alm-textarea"
              value={draftText}
              onChange={(e) => { setDraftText(e.target.value); if (sendError) setSendError(""); }}
              placeholder="Edit the AI draft response here before sending…"
              disabled={sending || sent}
            />
            {sendError && <div className="alm-error">⚠️ {sendError}</div>}
            {sent && <div className="alm-success">✅ Sent to n8n for processing. Closing…</div>}
          </div>
        </div>

        <div className="alm-footer">
          <button className="alm-btn alm-btn-cancel" onClick={onClose} disabled={sending || sent}>Cancel</button>
          <button className={`alm-btn alm-btn-send ${sending ? "alm-btn-send--loading" : ""} ${sent ? "alm-btn-send--sent" : ""}`} onClick={handleSend} disabled={isSendDisabled}>
            {sent ? "✅ Sent" : sending ? "Sending…" : "✉️ Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

// Wrap the actual modal content in the error boundary
export default function ActionLoopModal(props) {
  if (!props.record) return null;
  return (
    <ModalErrorBoundary onClose={props.onClose}>
      <ActionLoopModalContent {...props} />
    </ModalErrorBoundary>
  );
}