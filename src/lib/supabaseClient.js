// ─────────────────────────────────────────────────────────────────────────────
// supabaseClient.js
// Initializes and exports a single shared Supabase client instance.
//
// PRD Reference: §4 Tech Stack, §5 User Roles & Permissions
// This client is used for:
//   - User authentication (login / logout / session management)
//   - Reading the authenticated user's role and assigned branch location
//     from Supabase user metadata (used by the Global Location Filter §8.1)
//
// SECURITY:
//   - Credentials are loaded exclusively from environment variables.
//   - VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env
//   - The anon key is safe for client-side use — it is NOT a service role key.
//   - Never replace these with hardcoded string literals.
// ─────────────────────────────────────────────────────────────────────────────

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Guard: fail loudly at startup if env vars are missing.
// This prevents silent auth failures that are hard to debug.
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabaseClient] Missing environment variables.\n' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY are set in your .env file.'
  );
}

// Create and export the singleton Supabase client.
// Import this instance anywhere auth or user data is needed — do not create new instances.
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
