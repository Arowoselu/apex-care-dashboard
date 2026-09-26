# Product Requirements Document
# Apex Care Auto — Reputation & Feedback Intelligence Engine

---

| Field | Details |
|---|---|
| **Product Name** | Apex Care Auto Feedback Engine |
| **Document Version** | 1.0 |
| **Status** | Draft — Pending Stakeholder Review |
| **Date** | September 24, 2026 |
| **Author** | Product Management |
| **Audience** | Engineering, Design, Operations Leadership |

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Goals & Objectives](#3-goals--objectives)
4. [Tech Stack](#4-tech-stack)
5. [User Roles & Permissions](#5-user-roles--permissions)
6. [Database Schema](#6-database-schema-airtable)
7. [Functional Requirements — Phase 1: Staff Portal & Intake](#7-functional-requirements--phase-1-staff-portal--intake)
8. [Functional Requirements — Phase 2: Management Dashboard](#8-functional-requirements--phase-2-management-dashboard)
9. [Functional Requirements — Phase 3: The Action Loop](#9-functional-requirements--phase-3-the-action-loop)
10. [Non-Functional Requirements](#10-non-functional-requirements)
11. [System Architecture & Data Flow](#11-system-architecture--data-flow)
12. [Success Metrics](#12-success-metrics)
13. [Out of Scope](#13-out-of-scope)
14. [Risks & Mitigations](#14-risks--mitigations)
15. [Open Questions & Dependencies](#15-open-questions--dependencies)
16. [Glossary](#16-glossary)

---

## 1. Executive Summary

Apex Care Auto operates a multi-location auto repair chain. Currently, the process for collecting, evaluating, and responding to customer feedback is entirely manual — relying on individual staff members to solicit reviews, track sentiment informally, and draft responses without structured guidance. This creates significant inconsistency across locations, delays in addressing negative feedback, and missed opportunities to amplify positive customer experiences.

The **Apex Care Auto Reputation & Feedback Intelligence Engine** is a purpose-built internal platform that automates the entire post-service feedback lifecycle. Upon job completion, the system initiates outreach automatically. An integrated LLM layer scores the incoming feedback for sentiment and severity, routes it to role-appropriate queues, and generates AI-drafted responses ready for manager review. A structured management dashboard centralizes oversight across all locations, enabling fast, consistent, and professional customer engagement.

---

## 2. Problem Statement

| Pain Point | Current State | Business Impact |
|---|---|---|
| Feedback solicitation | Manual, ad-hoc, inconsistently applied | Low response rates; incomplete data |
| Sentiment analysis | Not performed | No early warning for reputation risk |
| Response drafting | Manual per-staff member | Inconsistent tone; slow turnaround |
| Negative feedback routing | No formal process | Escalated issues go unresolved |
| Cross-location visibility | No centralized view | Leadership cannot identify systemic issues |
| Repeat customer tracking | Not tracked | No prioritization of at-risk customers |

---

## 3. Goals & Objectives

### Primary Goal
Replace a manual, inconsistent review tracking process with an automated, intelligent feedback loop across all Apex Care Auto locations.

### Strategic Objectives

- **Automate** feedback request delivery upon every job completion event.
- **Classify** incoming feedback using LLM-powered sentiment and severity scoring, eliminating subjectivity.
- **Route** feedback records intelligently to the correct role-based queue based on classification and customer history.
- **Accelerate** management response time by providing AI-drafted replies ready for review and dispatch.
- **Centralize** reputation intelligence across all branch locations in a single management interface.
- **Protect** sensitive feedback data from operational staff who do not require access to it.

---

## 4. Tech Stack

| Layer | Technology | Role |
|---|---|---|
| **Frontend UI/UX** | Antigravity | User interface for both the Staff Portal and Management Dashboard |
| **Master Database** | Airtable | Single source of truth for all job and feedback records |
| **Authentication & RBAC** | Supabase | Role-based user authentication and session management |
| **Orchestration** | n8n | Workflow automation, webhook triggers, and inter-service coordination |
| **LLM Processing** | Groq | Sentiment scoring, severity classification, and AI response drafting |

---

## 5. User Roles & Permissions

The system enforces two distinct roles via **Supabase Auth**. All permission boundaries are enforced at both the UI layer (Antigravity) and the API layer (n8n / Airtable).

### 5.1 Role Matrix

| Feature / Data Field | Front Desk Staff | Management Team |
|---|:---:|:---:|
| View active job board (In Progress) | ✅ | ✅ |
| Create new intake records | ✅ | ✅ |
| Mark job as "Complete" | ✅ | ✅ |
| View `Sentiment` field | ❌ | ✅ |
| View `Severity` field | ❌ | ✅ |
| View `Raw Feedback` | ❌ | ✅ |
| View `AI Draft Response` | ❌ | ✅ |
| View `Routing Status` | ❌ | ✅ |
| View `Repeat Offender` flag | ❌ | ✅ |
| Access Intelligence Dashboard | ❌ | ✅ |
| Edit AI-drafted responses | ❌ | ✅ |
| Trigger email dispatch webhook | ❌ | ✅ |
| Filter dashboard by location | ❌ | ✅ |

### 5.2 Role Definitions

#### Front Desk Staff _(Operational)_
Front Desk Staff are responsible for customer intake and job lifecycle management. Their portal is scoped exclusively to operational tasks — creating records and updating job status. They have **no visibility** into feedback intelligence, sentiment scores, negative feedback content, or management workflows. This boundary is intentional and must be enforced to prevent staff from being influenced by or acting on feedback data outside their remit.

#### Management Team _(Administrative)_
Management users have full access to the Intelligence Dashboard. They can view all feedback queues across locations, filter data by branch, edit and refine AI-drafted responses, and trigger the final email dispatch to customers. Managers are the only users who interact with Phase 2 and Phase 3 features.

---

## 6. Database Schema (Airtable)

The Antigravity frontend interfaces with a **single Airtable base**. The following fields constitute the complete schema. Field names must match exactly as specified to ensure compatibility with all n8n workflows and API integrations.

> [!IMPORTANT]
> The field name `Custmer Email` (note the deliberate typo) must be preserved exactly as listed. This matches the existing Airtable base definition and all downstream webhook payload keys. Renaming this field will break n8n integrations.

### 6.1 Field Definitions

| # | Field Name | Type | Values / Notes |
|---|---|---|---|
| 1 | `Job ID` | String / Auto-number | System-generated unique identifier |
| 2 | `Customer Name` | String | Free text — customer's full name |
| 3 | `Custmer Email` | String | Customer email address for outreach |
| 4 | `Location` | String / Dropdown | Branch location — e.g., "Downtown", "Northside" |
| 5 | `Repair Issue` | Long Text | Description of the vehicle repair performed |
| 6 | `Job Status` | String / Dropdown | `"In Progress"` \| `"Complete"` |
| 7 | `Status Last Modified` | Date/Time | Auto-updated timestamp on `Job Status` change |
| 8 | `Feedback Request Sent` | Boolean / Checkbox | `true` once n8n dispatches outreach email |
| 9 | `Raw Feedback` | Long Text | Verbatim customer feedback response |
| 10 | `Sentiment` | String | `"Positive"` \| `"Negative"` \| `"Neutral"` |
| 11 | `Severity` | String | `"High"` \| `"Low"` |
| 12 | `Repeat Offender` | Boolean | `true` if customer has prior negative feedback history |
| 13 | `AI Draft Response` | Long Text | LLM-generated response draft for manager review |
| 14 | `Routing Status` | String | `"Ready to Post"` \| `"Private Queue"` \| `"Escalated"` |
| 15 | `Response Sent` | Boolean | `true` once manager dispatches finalized email |

### 6.2 Field Population Flow

```
Staff Creates Record → Fields 1–6 populated
Staff Marks Complete → Field 7 updated; n8n triggered
n8n Sends Outreach → Field 8 set to true
Customer Responds → Field 9 populated
Groq Processes → Fields 10, 11, 12, 13, 14 populated
Manager Dispatches → Field 15 set to true
```

---

## 7. Functional Requirements — Phase 1: Staff Portal & Intake

Phase 1 constitutes the **Staff Portal** — the only interface accessible to Front Desk Staff. It is scoped to job creation and status management.

### 7.1 Intake Form

**Purpose:** Provide a secure, validated form for staff to register new customer jobs.

**Requirements:**

- The form must expose the following fields for staff input:
  - `Customer Name` (required, text input)
  - `Custmer Email` (required, email format validation)
  - `Location` (required, dropdown populated from distinct `Location` values in Airtable)
  - `Repair Issue` (required, multi-line text area)
- On submission, the system must execute a **POST request to Airtable** creating a new record with:
  - All four staff-entered fields populated.
  - `Job Status` defaulted to `"In Progress"`.
  - `Feedback Request Sent` defaulted to `false`.
  - `Response Sent` defaulted to `false`.
- Upon successful record creation, the form must clear and display a confirmation message.
- Failed submissions (network error, validation failure) must surface a user-facing error with a retry option.

### 7.2 Job Board Grid

**Purpose:** Provide staff with a real-time view of all active, in-progress jobs.

**Requirements:**

- Display a read-only data grid filtered to records where `Job Status` = `"In Progress"`.
- The grid must display the following columns only:
  - `Job ID`
  - `Customer Name`
  - `Location`
  - `Repair Issue`
  - `Status Last Modified`
  - **Action Column** — containing the "Mark Complete" button (see §7.3)
- The grid must **not** display any of the following fields to Staff users: `Sentiment`, `Severity`, `Raw Feedback`, `AI Draft Response`, `Routing Status`, `Repeat Offender`, `Response Sent`.
- The grid should refresh automatically or provide a manual refresh control to reflect newly created records.
- Rows should be sorted by `Status Last Modified` in descending order (most recent first) by default.

### 7.3 Completion Trigger — "Mark Complete" Button

**Purpose:** Allow staff to close a job, which initiates the automated feedback and intelligence pipeline.

**Requirements:**

- Each row in the Job Board Grid must contain a **"Mark Complete"** button.
- On click, the button must:
  1. Display a confirmation prompt: *"Mark this job as complete? This will send a feedback request to the customer."*
  2. Upon confirmation, execute a **PATCH request to Airtable** for the corresponding record, setting:
     - `Job Status` → `"Complete"`
     - `Status Last Modified` → current timestamp (UTC)
  3. Following the successful PATCH, fire a **POST request to the configured n8n webhook URL** to trigger the backend outreach workflow. The payload must include at minimum: `Job ID`, `Customer Name`, `Custmer Email`, `Location`, `Repair Issue`.
  4. Remove the record from the Job Board Grid view (as it is no longer `"In Progress"`).
- If either the Airtable PATCH or the n8n webhook POST fails, the UI must display an error and **not** remove the row — maintaining data integrity and allowing retry.
- The button must enter a loading/disabled state during execution to prevent duplicate submissions.

---

## 8. Functional Requirements — Phase 2: Management Dashboard

Phase 2 is the **Management Intelligence Dashboard** — accessible only to authenticated Management Team users. It provides a comprehensive, filtered view of all processed feedback records, organized into actionable queues.

### 8.1 Global Location Filter

**Purpose:** Allow managers to scope all dashboard data to a specific branch location.

**Requirements:**

- A **dropdown filter** must be present at the top of the Management Dashboard, visible on all sub-views.
- The dropdown must be populated with all distinct `Location` values from Airtable.
- On login, the dropdown must **default to the manager's assigned branch location** (stored as a user attribute in Supabase).
- Managers may manually change the location selection to view data for any other branch.
- All data grids in §8.2–§8.5 must dynamically re-filter their data based on the selected location. No page reload should be required.

### 8.2 Master Overview Grid

**Purpose:** Provide a holistic view of all feedback records that have been processed by the intelligence pipeline.

**Requirements:**

- Display all records where `Routing Status` is not null/empty (i.e., records that have been processed by Groq and n8n).
- The grid must display the following columns:
  - `Job ID`
  - `Customer Name`
  - `Location`
  - `Sentiment`
  - `Severity`
  - `Routing Status`
  - `Repeat Offender`
  - `Response Sent`
- `Sentiment` values must be rendered with visual indicators:
  - `"Positive"` → Green badge
  - `"Neutral"` → Grey/Amber badge
  - `"Negative"` → Red badge
- `Severity` values must be rendered with visual indicators:
  - `"High"` → Red / bold indicator
  - `"Low"` → Standard indicator
- `Repeat Offender` = `true` must be visually flagged (e.g., warning icon).
- The grid must be sortable by any column.

### 8.3 High-Priority Alerts Queue

**Purpose:** Surface the most critical records requiring immediate management attention.

**Filter Logic:**
```
Routing Status = "Escalated"  OR  Repeat Offender = true
```

**Requirements:**

- Display records matching the above filter, scoped to the selected location.
- The queue must visually distinguish between:
  - **Open Alerts:** Records where `Response Sent` = `false`
  - **Acted-Upon Alerts:** Records where `Response Sent` = `true`
- An alert count badge must be displayed on the queue heading, reflecting the number of **Open** alerts.
- Records must default to sorted by `Status Last Modified` descending (newest first).
- Clicking a record must open the **Action Loop UI** (Phase 3 — §9).

### 8.4 Standard Private Queue

**Purpose:** Display negative feedback records that require a private, direct customer response but are not at the escalation threshold.

**Filter Logic:**
```
Routing Status = "Private Queue"  AND  Response Sent = false
```

**Requirements:**

- Display records matching the above filter, scoped to the selected location.
- Columns to display: `Job ID`, `Customer Name`, `Sentiment`, `Severity`, `Status Last Modified`.
- Records must be sorted by `Severity` descending (High first), then by `Status Last Modified` descending.
- Clicking a record must open the **Action Loop UI** (Phase 3 — §9).

### 8.5 Ready to Post Queue

**Purpose:** Highlight positive feedback records that are candidates for public-facing promotion (e.g., manually posting to Google, social media).

**Filter Logic:**
```
Routing Status = "Ready to Post"
```

**Requirements:**

- Display records matching the above filter, scoped to the selected location.
- Columns to display: `Job ID`, `Customer Name`, `Location`, `Raw Feedback` (truncated preview), `Status Last Modified`.
- Each row must include a **"Copy Feedback"** action button that copies the full `Raw Feedback` text to the system clipboard.
- A success micro-interaction (e.g., button label changes to "Copied ✓") must confirm the clipboard action.

---

## 9. Functional Requirements — Phase 3: The Action Loop

Phase 3 defines the **interactive response workflow** — the UI panel that management users enter when acting on a record from the High-Priority Alerts Queue (§8.3) or the Standard Private Queue (§8.4).

### 9.1 Review UI — Feedback Display

**Purpose:** Present the raw customer feedback and the AI-drafted response side-by-side for manager review.

**Requirements:**

- The Action Loop UI must be presented as a modal or a dedicated detail panel.
- The panel must display the following read-only contextual information at the top:
  - `Job ID`
  - `Customer Name`
  - `Location`
  - `Sentiment` (with badge)
  - `Severity` (with badge)
  - `Repeat Offender` status
- Below the contextual header, the panel must render two sections:
  - **Left / Top Section — "Customer Feedback":** Displays `Raw Feedback` in a styled, read-only text block.
  - **Right / Bottom Section — "AI Draft Response":** Contains the editable text area (see §9.2).

### 9.2 Edit Module — AI Draft Response

**Purpose:** Allow managers to review, refine, and finalize the AI-generated response before dispatch.

**Requirements:**

- The `AI Draft Response` content must be pre-populated into an **editable text area** within the Action Loop panel.
- The text area must be multi-line and support free-form text editing.
- Character count or a word count indicator is recommended but not required for v1.
- Changes made in the text area are held in local UI state. They are **not** persisted back to Airtable automatically — they are only captured and sent upon the "Send Email" dispatch action (§9.3).

### 9.3 Dispatch Webhook — "Send Email" Button

**Purpose:** Finalize the response and trigger the backend email delivery workflow.

**Requirements:**

- A **"Send Email"** primary action button must be present in the Action Loop panel.
- On click, the button must execute the following sequence:
  1. Capture the current state of the edited text area as `finalizedResponse`.
  2. Fire an **HTTP POST** to the configured n8n webhook URL with the following JSON payload:

```json
{
  "job_id": "<Job ID>",
  "customer_email": "<Custmer Email>",
  "finalized_response": "<finalizedResponse>"
}
```

  3. n8n is responsible for:
     - Delivering the email to the customer.
     - Executing a PATCH request to Airtable to set `Response Sent` = `true` and update `AI Draft Response` with the finalized text.
  4. On successful webhook acknowledgement (HTTP 2xx), the UI must:
     - Display a success confirmation: *"Response sent successfully."*
     - Close the Action Loop panel.
     - Remove the record from its source queue (Private Queue or Alerts Queue) and move it to the "Acted-Upon" state in the Alerts Queue if applicable.
- On webhook failure (non-2xx or network timeout), the UI must:
  - Display an error message with the option to retry.
  - **Not** alter the record's state in any queue.
- The "Send Email" button must enter a loading/disabled state during the HTTP request to prevent duplicate submissions.
- A **"Cancel"** or **"Close"** secondary action button must allow managers to exit the panel without dispatching, preserving all edits only for the current session.

---

## 10. Non-Functional Requirements

### 10.1 Security
- All API calls from the Antigravity frontend to Airtable must use a server-side proxy or environment-scoped API key. The Airtable API key must **never** be exposed in client-side code.
- Supabase JWT tokens must be validated on every protected route render.
- Role enforcement must be applied at the data-fetch layer, not only at the UI layer. Staff users must not be able to access management data via direct API calls.

### 10.2 Performance
- The Job Board Grid and all Management Dashboard grids must render initial data within **3 seconds** under normal network conditions.
- The "Mark Complete" → n8n webhook round trip must complete or timeout within **10 seconds** to prevent UI blocking.
- Grids displaying more than 50 records should implement pagination or virtual scrolling.

### 10.3 Reliability
- All webhook POST failures must surface user-facing error states — no silent failures.
- The system must be idempotent with respect to the "Mark Complete" action. Re-triggering the same job's webhook must not create duplicate Airtable records or duplicate outreach emails. n8n workflows should include deduplication logic keyed on `Job ID`.

### 10.4 Usability
- The platform must be responsive and functional on modern desktop browsers (Chrome, Firefox, Safari, Edge — latest two major versions).
- All interactive elements must meet WCAG 2.1 AA contrast and accessibility standards.
- Staff and Management interfaces must be visually distinct to prevent role confusion.

### 10.5 Observability
- n8n workflow execution logs must be retained for a minimum of 30 days.
- Failed webhook calls and Airtable PATCH failures should be logged with `Job ID` and timestamp for debugging.

---

## 11. System Architecture & Data Flow

### 11.1 End-to-End Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 1 — STAFF PORTAL                                          │
│                                                                  │
│  Staff logs in (Supabase Auth)                                   │
│       ↓                                                          │
│  Creates Intake Record → POST to Airtable                        │
│       ↓                                                          │
│  Marks Job Complete → PATCH to Airtable + POST to n8n Webhook    │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  BACKEND — n8n ORCHESTRATION                                     │
│                                                                  │
│  Webhook received → Send feedback request email to customer      │
│  → Update Airtable: Feedback Request Sent = true                 │
│  → Await customer response (separate inbound webhook/form)       │
│  → On response: POST Raw Feedback to Groq                        │
│  → Groq returns: Sentiment, Severity, Repeat Offender flag,      │
│                  AI Draft Response, Routing Status               │
│  → PATCH Airtable with all Groq outputs                          │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 2 — MANAGEMENT DASHBOARD                                  │
│                                                                  │
│  Manager logs in (Supabase Auth) → Dashboard loads               │
│  → Filtered queue grids display processed records                │
│  → Manager selects record → Action Loop panel opens (Phase 3)    │
└──────────────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────────────┐
│  PHASE 3 — THE ACTION LOOP                                       │
│                                                                  │
│  Manager reviews Raw Feedback + AI Draft Response                │
│  → Edits response text (optional)                                │
│  → Clicks "Send Email"                                           │
│  → POST to n8n Dispatch Webhook                                  │
│  → n8n sends email to customer                                   │
│  → n8n PATCH Airtable: Response Sent = true                      │
│  → UI confirms dispatch, record moves to "Acted-Upon"            │
└──────────────────────────────────────────────────────────────────┘
```

### 11.2 Routing Logic (n8n / Groq)

The following logic governs how processed feedback records are routed:

| Condition | `Routing Status` Assigned |
|---|---|
| `Sentiment` = `"Positive"` | `"Ready to Post"` |
| `Sentiment` = `"Negative"` AND `Severity` = `"Low"` AND `Repeat Offender` = `false` | `"Private Queue"` |
| `Sentiment` = `"Negative"` AND (`Severity` = `"High"` OR `Repeat Offender` = `true`) | `"Escalated"` |
| `Sentiment` = `"Neutral"` | `"Private Queue"` |

> [!NOTE]
> Routing logic is executed within n8n post-Groq processing. The Antigravity frontend reads and displays the `Routing Status` field value — it does not compute routing itself.

---

## 12. Success Metrics

The following KPIs will be used to evaluate the success of the Apex Care Auto Feedback Engine post-launch. Baseline measurements should be captured for the **30 days prior** to go-live.

### 12.1 Operational Efficiency

| Metric | Definition | Target |
|---|---|---|
| **Feedback Request Coverage Rate** | % of completed jobs that trigger a feedback request | ≥ 95% |
| **Mean Time to Manager Response** | Avg. time from feedback received → `Response Sent` = true | ≤ 24 hours |
| **Queue Clearance Rate** | % of Private Queue & Escalated records actioned within 48 hours | ≥ 85% |
| **Manual Override Rate** | % of AI Draft Responses that managers edit before sending | Tracked; no target (diagnostic metric) |

### 12.2 Reputation & Sentiment

| Metric | Definition | Target |
|---|---|---|
| **Negative Feedback Acknowledgement Rate** | % of `"Negative"` sentiment records with `Response Sent` = true | ≥ 90% |
| **Escalation Response Time** | Time from `Routing Status` = "Escalated" → `Response Sent` = true | ≤ 4 hours |
| **Repeat Offender Rate** | % of feedback records flagged as `Repeat Offender` = true | Tracked; target < 5% of monthly feedback volume |

### 12.3 System Performance

| Metric | Definition | Target |
|---|---|---|
| **Webhook Reliability** | % of n8n webhook triggers that succeed on first attempt | ≥ 99% |
| **Pipeline Completion Rate** | % of completed jobs that result in a fully processed Airtable record (all LLM fields populated) | ≥ 98% |
| **UI Load Time** | Time to render dashboard grids with data | ≤ 3 seconds (p95) |

---

## 13. Out of Scope

The following items are explicitly **excluded** from this product and should not be planned, engineered, or assumed:

| # | Out of Scope Item | Rationale |
|---|---|---|
| 1 | **Direct API integration with public review platforms** (Yelp, Google Maps, TripAdvisor, etc.) | Third-party platform policy restrictions and API limitations make automated review posting non-compliant and unreliable. The "Ready to Post" queue provides curated text for manual posting only. |
| 2 | **Automated public review posting of any kind** | Even with available APIs, automated posting to public platforms risks ToS violations and reputation risk if misused. All external posting is a manual staff action. |
| 3 | **Customer-facing portal or feedback form UI** | Customer feedback collection (the form customers fill out) is handled by n8n's inbound webhook integration, not by the Antigravity frontend. |
| 4 | **SMS or push notification outreach** | All customer outreach in v1 is email-only, executed by n8n. SMS channels are deferred to a future phase. |
| 5 | **CRM or POS system integration** | The Airtable base serves as the standalone data layer. Integration with third-party CRM or Point-of-Sale systems is not in scope for v1. |
| 6 | **AI model fine-tuning or custom model training** | Groq is used as-is with prompt-engineered instructions. No custom model training is included. |
| 7 | **Manager performance reporting / analytics** | Individual manager response rate tracking, staff productivity analytics, and HR reporting are deferred to a future phase. |
| 8 | **Multi-language support (i18n)** | The v1 system operates in English only. Multilingual feedback handling and response drafting are deferred. |
| 9 | **Mobile application** | The platform targets desktop browsers. A dedicated iOS/Android application is not in scope for v1. |

---

## 14. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Airtable API rate limits cause data delays on high-volume days | Medium | Medium | Implement request queuing in n8n; monitor Airtable API usage. Consider batching if volume exceeds thresholds. |
| Groq LLM produces inaccurate sentiment classification | Medium | High | Implement a confidence threshold; records below threshold routed to "Private Queue" for manager review. Monitor `Manual Override Rate` as a proxy signal. |
| Staff user accesses management data via direct Airtable API call | Low | High | Enforce scoped Airtable API tokens with field-level visibility rules; validate Supabase JWT at server layer before any data is returned. |
| n8n webhook failure causes silent drop of "Mark Complete" event | Low | High | Implement retry logic in n8n; surface error states in the UI; log all failures with `Job ID`. |
| Duplicate feedback outreach emails sent to customers | Low | High | n8n workflows must check `Feedback Request Sent` = `false` before dispatching. Idempotency keyed on `Job ID`. |
| Manager sends unreviewed AI draft without reading customer feedback | Medium | Medium | UI layout must force vertical scroll past `Raw Feedback` before the "Send Email" button is visible (or require explicit "I have reviewed" acknowledgement). |

---

## 15. Open Questions & Dependencies

| # | Question | Owner | Status |
|---|---|---|---|
| 1 | What is the exact n8n webhook URL for the "Mark Complete" trigger? Must be configured as an environment variable in Antigravity. | Engineering / n8n Admin | ⏳ Pending |
| 2 | What is the exact n8n webhook URL for the "Send Email" dispatch action? | Engineering / n8n Admin | ⏳ Pending |
| 3 | How is the customer feedback response collected? (e.g., a form hosted by n8n, a third-party survey tool?) The mechanism for populating `Raw Feedback` in Airtable must be confirmed. | Product / n8n Admin | ⏳ Pending |
| 4 | What defines a "Repeat Offender"? (e.g., ≥ 2 prior `Negative` sentiment records? Any prior `Escalated` record?) Groq prompt must be aligned to this definition. | Business Stakeholder | ⏳ Pending |
| 5 | Is each manager assigned a single fixed branch location (stored in Supabase user metadata), or can a manager be assigned to multiple branches? | Business Stakeholder | ⏳ Pending |
| 6 | What is the complete, canonical list of `Location` values (branch names)? Required for dropdown population and Airtable field configuration. | Operations | ⏳ Pending |
| 7 | What email address and sender name should the customer outreach emails originate from? | Marketing / Business | ⏳ Pending |
| 8 | What is the Groq model to be used (e.g., `llama3-70b-8192`, `mixtral-8x7b`)? Response quality and latency depend on model selection. | Engineering | ⏳ Pending |

---

## 16. Glossary

| Term | Definition |
|---|---|
| **Action Loop** | The Phase 3 UI workflow where a manager reviews a feedback record, edits the AI draft, and dispatches the finalized response. |
| **AI Draft Response** | The response text generated by Groq, stored in the Airtable `AI Draft Response` field, pre-loaded into the Edit Module for manager refinement. |
| **Escalated** | A `Routing Status` value assigned to high-severity or repeat-offender negative feedback records requiring priority management attention. |
| **Feedback Intelligence Pipeline** | The end-to-end automated process: job completion → outreach → feedback receipt → Groq processing → Airtable update → queue routing. |
| **Groq** | The LLM inference platform used to perform sentiment analysis, severity scoring, repeat offender detection, and AI response drafting. |
| **n8n** | The workflow automation platform that orchestrates all backend processes, including email dispatch, webhook handling, and Airtable updates. |
| **Private Queue** | A `Routing Status` value for negative/neutral feedback requiring a direct, private manager response (not for public posting). |
| **Ready to Post** | A `Routing Status` value for positive feedback records that are candidates for manual posting to public review platforms. |
| **Repeat Offender** | A customer who has a prior record of negative feedback in the Airtable base. Flagged by the Groq pipeline; surfaces records in the High-Priority Alerts Queue. |
| **Routing Status** | The Airtable field that determines which management queue a processed feedback record appears in. |
| **Sentiment** | The LLM-classified emotional tone of a piece of customer feedback: Positive, Negative, or Neutral. |
| **Severity** | The LLM-classified urgency or intensity of negative feedback: High or Low. |
| **Supabase Auth** | The authentication and authorization layer that manages user sessions and enforces role-based access control across the platform. |

---

*Document End — Apex Care Auto Reputation & Feedback Intelligence Engine PRD v1.0*

*For questions regarding this document, contact the Product Management team.*
