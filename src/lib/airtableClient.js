// ─────────────────────────────────────────────────────────────────────────────
// airtableClient.js
// Initializes and exports a single shared Airtable base instance.
//
// PRD Reference: §4 Tech Stack, §6 Database Schema, §10.1 Security
// This client is the single access point for all Airtable operations:
//   - POST  → Create new job intake records (Phase 1 §7.1)
//   - GET   → Fetch job board records filtered by Job Status (Phase 1 §7.2)
//   - PATCH → Update Job Status to "Complete" on mark-complete (Phase 1 §7.3)
//   - GET   → Fetch all processed feedback records for dashboard queues (Phase 2)
//
// FIELD NAME WARNING (PRD §6 — IMPORTANT):
//   The field "Custmer Email" contains a deliberate typo.
//   This matches the exact Airtable base definition and all n8n webhook payloads.
//   Do NOT correct this typo in any field reference — it will break integrations.
//
// SECURITY:
//   - VITE_AIRTABLE_PAT is a Personal Access Token scoped to this base only.
//   - VITE_AIRTABLE_BASE_ID identifies the target base.
//   - Both values are loaded from environment variables — never hardcoded.
// ─────────────────────────────────────────────────────────────────────────────

import Airtable from 'airtable';

const airtablePAT = import.meta.env.VITE_AIRTABLE_PAT;
const airtableBaseId = import.meta.env.VITE_AIRTABLE_BASE_ID;

// Guard: fail loudly at startup if env vars are missing.
// This prevents silent data failures that are hard to debug.
if (!airtablePAT || !airtableBaseId) {
  throw new Error(
    '[airtableClient] Missing environment variables.\n' +
    'Ensure VITE_AIRTABLE_PAT and VITE_AIRTABLE_BASE_ID are set in your .env file.'
  );
}

// Configure the Airtable SDK with the Personal Access Token.
Airtable.configure({
  apiKey: airtablePAT, // PAT passed as apiKey — this is correct per Airtable SDK docs
});

// Export the initialized base instance.
// Import `base` anywhere Airtable reads or writes are needed.
// Usage example:
//   import { base } from '../lib/airtableClient';
//   const records = await base('YourTableName').select({ ... }).all();
export const base = Airtable.base(airtableBaseId);
