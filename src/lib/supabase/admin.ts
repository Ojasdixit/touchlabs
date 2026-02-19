import { createClient } from '@supabase/supabase-js';

// Service-role client for server-side admin operations (bypasses RLS)
// ONLY use in server actions / API routes — never expose to browser
export function createAdminClient() {
    return createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false } }
    );
}
