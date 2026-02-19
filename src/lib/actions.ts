'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';
import Groq from 'groq-sdk';

// ─── Helper: Get tenant_id for current user ────────────────
export async function getCurrentTenantId(): Promise<string | null> {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('tenant_id')
        .eq('id', user.id)
        .single();

    return profile?.tenant_id ?? null;
}

// ─── Helper: Get current user profile ───────────────────────
export async function getCurrentProfile() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    return profile;
}

// ─── Tenant Onboarding ─────────────────────────────────────
// Creates a tenant + assigns current user as admin
// Called on first login if profile has no tenant_id
export async function onboardTenant(businessName: string, slug: string, timezone: string) {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: 'Not authenticated' };

    // Create tenant
    const { data: tenant, error: tenantErr } = await supabase
        .from('tenants')
        .insert({ name: businessName, slug, timezone })
        .select()
        .single();

    if (tenantErr) return { error: tenantErr.message };

    // Update profile with tenant_id and admin role
    const { error: profileErr } = await supabase
        .from('profiles')
        .update({ tenant_id: tenant.id, role: 'admin' })
        .eq('id', user.id);

    if (profileErr) return { error: profileErr.message };

    revalidatePath('/admin');
    return { tenant };
}

// ═════════════════════════════════════════════════════════════
// SERVICES CRUD
// ═════════════════════════════════════════════════════════════

export async function getServices(tenantId?: string) {
    const supabase = await createClient();
    const targetTenantId = tenantId || await getCurrentTenantId();
    if (!targetTenantId) return [];

    const { data } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .order('created_at', { ascending: false });

    return data ?? [];
}

export async function createService(formData: {
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    buffer_minutes: number;
    color: string;
}) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No tenant' };

    const { data, error } = await supabase
        .from('services')
        .insert({ ...formData, tenant_id: tenantId })
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/services');
    return { data };
}

export async function updateService(id: string, formData: {
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    buffer_minutes: number;
    color: string;
}) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('services')
        .update(formData)
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/services');
    return { data };
}

export async function deleteService(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

    if (error) return { error: error.message };
    revalidatePath('/admin/services');
    return { success: true };
}

// ═════════════════════════════════════════════════════════════
// STAFF (Profiles) CRUD
// ═════════════════════════════════════════════════════════════

export async function getStaff(tenantId?: string) {
    const supabase = await createClient();
    const targetTenantId = tenantId || await getCurrentTenantId();
    if (!targetTenantId) return [];

    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .order('created_at', { ascending: false });

    return data ?? [];
}

export async function updateStaffProfile(id: string, updates: {
    full_name?: string;
    phone?: string;
    email?: string;
    role?: string;
    is_active?: boolean;
}) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/staff');
    return { data };
}

import { v4 as uuidv4 } from 'uuid';

export async function createStaffMember(newStaff: {
    fullName: string;
    email: string;
    role: string;
    password?: string;
}, tenantId?: string) {
    'use server';
    const supabase = await createClient();
    const targetTenantId = tenantId || await getCurrentTenantId();
    if (!targetTenantId) return { error: 'No tenant context' };

    let userId: string | null = null;
    let adminSupabase: any = supabase;

    try {
        if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
            const { createClient } = await import('@supabase/supabase-js');
            adminSupabase = createClient(
                process.env.NEXT_PUBLIC_SUPABASE_URL!,
                process.env.SUPABASE_SERVICE_ROLE_KEY,
                { auth: { autoRefreshToken: false, persistSession: false } }
            );

            // 1. Create Auth User
            const { data: userData, error: uError } = await adminSupabase.auth.admin.createUser({
                email: newStaff.email,
                password: newStaff.password || 'ChangeMe123!',
                email_confirm: true,
                user_metadata: { full_name: newStaff.fullName }
            });

            if (uError) throw new Error(`User Auth Error: ${uError.message}`);
            if (!userData.user) throw new Error('User creation returned no data');
            userId = userData.user.id;
        } else {
            console.warn('[Add Staff] No Admin Key. Creating OFFLINE staff.');
            // Fallback: Generate UUID for offline profile
            const { v4 } = await import('uuid');
            userId = v4();
        }

        // 2. Upsert Profile
        // Using upsert ensures we handle pre-existing profiles gracefully (though rare for new UUID)
        const { error: pError } = await adminSupabase.from('profiles').upsert({
            id: userId,
            email: newStaff.email,
            full_name: newStaff.fullName,
            role: newStaff.role,
            tenant_id: targetTenantId,
            is_active: true
        });

        if (pError) throw new Error(`Profile Error: ${pError.message}`);

        // 3. Create Default Schedule
        await adminSupabase.from('staff_schedules').delete().eq('staff_id', userId);

        const defaultSchedule = [1, 2, 3, 4, 5].map(day => ({
            staff_id: userId,
            tenant_id: targetTenantId,
            day_of_week: day, // 1=Mon
            start_time: '09:00:00',
            end_time: '17:00:00',
            is_working: true
        }));

        const { error: sError } = await adminSupabase.from('staff_schedules').insert(defaultSchedule);
        if (sError) console.error('Schedule Create Error:', sError);

        revalidatePath('/admin/staff');
        return { success: true, userId, password: process.env.SUPABASE_SERVICE_ROLE_KEY ? (newStaff.password || 'ChangeMe123!') : '(Offline User)' };

    } catch (err: any) {
        return { error: err.message };
    }
}

export async function deleteStaffMember(staffId: string) {
    'use server';
    // const supabase = await createClient(); // check current user session if needed

    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'Admin Key Missing' };

    try {
        const { createClient } = await import('@supabase/supabase-js');
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        // 1. Try deleting from Auth (if exists)
        // If it was an offline user (fake UUID), this will fail or do nothing.
        // We catch error but ignore "User not found".
        const { error: authError } = await adminSupabase.auth.admin.deleteUser(staffId);
        if (authError && !authError.message.includes('User not found') && !authError.message.includes('uuid')) {
            console.warn('Auth deletion warning:', authError.message);
        }

        // 2. Delete Profile (and schedules via cascade if set, otherwise manual)
        // Schedules often cascade on profile delete.
        const { error: pError } = await adminSupabase.from('profiles').delete().eq('id', staffId);
        if (pError) throw new Error(`Profile Delete Failed: ${pError.message}`);

        revalidatePath('/admin/staff');
        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

export async function resetStaffPassword(staffId: string, newPass: string) {
    'use server';
    if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: 'Admin Key Missing' };

    try {
        const { createClient } = await import('@supabase/supabase-js');
        const adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );

        const { error } = await adminSupabase.auth.admin.updateUserById(staffId, { password: newPass });
        if (error) throw new Error(error.message);

        return { success: true };
    } catch (err: any) {
        return { error: err.message };
    }
}

// ═════════════════════════════════════════════════════════════
// APPOINTMENTS CRUD
// ═════════════════════════════════════════════════════════════

export async function getAppointments() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];

    const { data } = await supabase
        .from('appointments')
        .select('*, service:services(name, color), staff:profiles(full_name)')
        .eq('tenant_id', tenantId)
        .order('start_time', { ascending: true });

    return data ?? [];
}

export async function createAppointment(formData: {
    staff_id: string;
    service_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    start_time: string;
    end_time: string;
    booked_via: string;
    notes?: string;
}, tenantId?: string) {
    const supabase = await createClient();
    const targetTenantId = tenantId || await getCurrentTenantId();
    if (!targetTenantId) return { error: 'No tenant' };

    const { data, error } = await supabase
        .from('appointments')
        .insert({ ...formData, tenant_id: targetTenantId })
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/appointments');
    return { data };
}

export async function updateAppointmentStatus(id: string, status: string) {
    const supabase = await createClient();

    const { data, error } = await supabase
        .from('appointments')
        .update({ status })
        .eq('id', id)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/appointments');
    return { data };
}

// ═════════════════════════════════════════════════════════════
// SCHEDULES CRUD
// ═════════════════════════════════════════════════════════════

export async function getStaffSchedules(staffId: string) {
    const supabase = await createClient();

    const { data } = await supabase
        .from('staff_schedules')
        .select('*')
        .eq('staff_id', staffId)
        .order('day_of_week', { ascending: true });

    return data ?? [];
}

export async function saveStaffSchedules(
    staffId: string,
    schedules: {
        day_of_week: number;
        start_time: string;
        end_time: string;
        is_working: boolean;
    }[]
) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No tenant' };

    // Delete existing schedules for this staff
    await supabase
        .from('staff_schedules')
        .delete()
        .eq('staff_id', staffId);

    // Insert only working days
    const workingDays = schedules
        .filter((s) => s.is_working && s.start_time && s.end_time)
        .map((s) => ({
            staff_id: staffId,
            tenant_id: tenantId,
            day_of_week: s.day_of_week,
            start_time: s.start_time,
            end_time: s.end_time,
            is_working: true,
        }));

    if (workingDays.length > 0) {
        const { error } = await supabase
            .from('staff_schedules')
            .insert(workingDays);

        if (error) return { error: error.message };
    }

    revalidatePath('/admin/schedules');
    return { success: true };
}

// ═════════════════════════════════════════════════════════════
// AI CALL LOGS
// ═════════════════════════════════════════════════════════════

export async function getCallLogs() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];

    const { data } = await supabase
        .from('ai_call_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(50);

    return data ?? [];
}

// ═════════════════════════════════════════════════════════════
// DASHBOARD STATS
// ═════════════════════════════════════════════════════════════

export async function getDashboardStats() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayISO = today.toISOString();
    const tomorrowISO = new Date(today.getTime() + 86400000).toISOString();

    // Today's appointments
    const { count: todayAppointments } = await supabase
        .from('appointments')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('start_time', todayISO)
        .lt('start_time', tomorrowISO)
        .neq('status', 'cancelled');

    // Active staff
    const { count: totalStaff } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .eq('is_active', true);

    // AI calls this month
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
    const { count: aiCalls } = await supabase
        .from('ai_call_logs')
        .select('*', { count: 'exact', head: true })
        .eq('tenant_id', tenantId)
        .gte('created_at', monthStart);

    // Monthly revenue (sum of service prices for completed appointments)
    const { data: revenueData } = await supabase
        .from('appointments')
        .select('service:services(price)')
        .eq('tenant_id', tenantId)
        .eq('status', 'completed')
        .gte('start_time', monthStart);

    const monthlyRevenue = revenueData?.reduce((sum: number, apt: any) => {
        return sum + (Number(apt.service?.price) || 0);
    }, 0) ?? 0;

    // Upcoming appointments (next 5)
    const { data: upcoming } = await supabase
        .from('appointments')
        .select('*, service:services(name, color), staff:profiles(full_name)')
        .eq('tenant_id', tenantId)
        .gte('start_time', new Date().toISOString())
        .neq('status', 'cancelled')
        .order('start_time', { ascending: true })
        .limit(5);

    // Recent AI calls (last 5)
    const { data: recentCalls } = await supabase
        .from('ai_call_logs')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    return {
        todayAppointments: todayAppointments ?? 0,
        totalStaff: totalStaff ?? 0,
        aiCalls: aiCalls ?? 0,
        monthlyRevenue,
        upcoming: upcoming ?? [],
        recentCalls: recentCalls ?? [],
    };
}

// ═════════════════════════════════════════════════════════════
// SETTINGS
// ═════════════════════════════════════════════════════════════

export async function getTenantSettings() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return null;

    const { data } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tenantId)
        .single();

    return data;
}

export async function updateTenantSettings(updates: {
    name?: string;
    slug?: string;
    timezone?: string;
    phone_number?: string;
}) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No tenant' };

    const { data, error } = await supabase
        .from('tenants')
        .update(updates)
        .eq('id', tenantId)
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/settings');
    return { data };
}


export async function getRecentBookings() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];

    const { data } = await supabase
        .from('appointments')
        .select(`
            id,
            created_at,
            start_time,
            client_name,
            service:services(name)
        `)
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false })
        .limit(5);

    return data || [];
}

// ─── BOSS PROFILES ─────────────────────────────────────────

export async function getBossProfiles() {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return [];

    const { data } = await supabase
        .from('boss_profiles')
        .select('*, user:profiles(full_name, email)')
        .eq('tenant_id', tenantId)
        .eq('is_active', true)
        .order('created_at', { ascending: false });

    return data || [];
}

export async function createBossProfile(bossName: string, userId: string) {
    const supabase = await createClient();
    const tenantId = await getCurrentTenantId();
    if (!tenantId) return { error: 'No tenant' };

    // Generate unique boss code: NAME-XXXX (4-digit random)
    const suffix = Math.floor(1000 + Math.random() * 9000);
    const bossCode = `${bossName.toUpperCase().replace(/\s+/g, '-')}-${suffix}`;

    const { data, error } = await supabase
        .from('boss_profiles')
        .insert({
            user_id: userId,
            tenant_id: tenantId,
            boss_name: bossName,
            boss_code: bossCode,
        })
        .select()
        .single();

    if (error) return { error: error.message };
    revalidatePath('/admin/ai-agent');
    return { data };
}

export async function deleteBossProfile(id: string) {
    const supabase = await createClient();

    const { error } = await supabase
        .from('boss_profiles')
        .delete()
        .eq('id', id);

    if (error) return { error: error.message };
    revalidatePath('/admin/ai-agent');
    return { success: true };
}

// Used by AI to lookup a boss code and resolve tenant + user identity
export async function lookupBossCode(code: string) {
    const supabase = await createClient();

    const { data } = await supabase
        .from('boss_profiles')
        .select('*, user:profiles(full_name, email, tenant_id)')
        .eq('boss_code', code.trim().toUpperCase())
        .eq('is_active', true)
        .single();

    return data || null;
}

// ─── AVAILABILITY LOGIC ──────────────────────────────────────

export async function getAvailableSlots(dateStr: string, serviceName: string, tenantId?: string) {
    const supabase = await createClient();
    const targetTenantId = tenantId || await getCurrentTenantId();
    if (!targetTenantId) return { error: 'No tenant' };

    // 1. Get Service Duration
    const { data: services } = await supabase
        .from('services')
        .select('*')
        .eq('tenant_id', targetTenantId)
        .ilike('name', `%${serviceName}%`)
        .limit(1);

    if (!services || services.length === 0) return { error: `Service "${serviceName}" not found` };
    const service = services[0];
    const duration = service.duration_minutes || 60;

    // 2. Determine Day of Week (0=Sun, 6=Sat)
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getUTCDay();

    // 3. Get Staff Working on this Day
    const { data: schedules } = await supabase
        .from('staff_schedules')
        .select('*, staff:profiles(*)')
        .eq('tenant_id', targetTenantId)
        .eq('day_of_week', dayOfWeek)
        .eq('is_working', true);

    if (!schedules || schedules.length === 0) return { available_slots: [], error: 'No staff working on this day', date: dateStr };

    // 4. Get Existing Appointments
    const datePart = dateStr.split('T')[0];
    const startOfDay = `${datePart}T00:00:00.000Z`;
    // We need to cover potentially spilling into next day in UTC if local time is late, but for now stick to dateStr limits
    const endOfDay = `${datePart}T23:59:59.999Z`;

    const { data: appointments } = await supabase
        .from('appointments')
        .select('staff_id, start_time, end_time')
        .eq('tenant_id', targetTenantId)
        .neq('status', 'cancelled')
        .gte('start_time', startOfDay)
        .lte('start_time', endOfDay);

    const busyMap: Record<string, Array<{ start: number, end: number }>> = {};
    appointments?.forEach(apt => {
        if (!busyMap[apt.staff_id]) busyMap[apt.staff_id] = [];
        busyMap[apt.staff_id].push({
            start: new Date(apt.start_time).getTime(),
            end: new Date(apt.end_time).getTime()
        });
    });

    // 5. Generate Slots (Dynamic Range)
    const availableSlots: string[] = [];
    const foundStaff: Record<string, string> = {};

    // Find Global Open/Close in Minutes
    let minStart = 24 * 60;
    let maxEnd = 0;

    schedules.forEach(s => {
        const [h, m] = s.start_time.split(':').map(Number);
        const start = h * 60 + m;
        const [eh, em] = s.end_time.split(':').map(Number);
        const end = eh * 60 + em;
        if (start < minStart) minStart = start;
        if (end > maxEnd) maxEnd = end;
    });

    // Safety check
    if (minStart >= maxEnd) return { available_slots: [], date: dateStr };

    const baseTime = new Date(`${datePart}T00:00:00.000Z`).getTime();
    const globalOpenTime = baseTime + minStart * 60000;
    // Cap global close at end of day to avoid loops going infinite if bad data
    const globalCloseTime = Math.min(baseTime + maxEnd * 60000, baseTime + 24 * 60 * 60000);

    // Interval 30 mins
    for (let time = globalOpenTime; time < globalCloseTime; time += 30 * 60000) {
        const slotEnd = time + duration * 60000;

        // Check which staff is free
        const freeStaff = schedules.find(sched => {
            // 1. Is staff working at this specific time?
            const [sh, sm] = sched.start_time.split(':').map(Number);
            const sStart = baseTime + (sh * 60 + sm) * 60000;
            const [eh, em] = sched.end_time.split(':').map(Number);
            const sEnd = baseTime + (eh * 60 + em) * 60000;

            if (time < sStart || slotEnd > sEnd) return false;

            // 2. Is staff busy?
            const sId = sched.staff_id;
            const busyList = busyMap[sId] || [];
            const isBusy = busyList.some(b => (time < b.end && slotEnd > b.start));

            return !isBusy;
        });

        if (freeStaff) {
            const timeStr = new Date(time).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });
            if (!availableSlots.includes(timeStr)) {
                availableSlots.push(timeStr);
                foundStaff[timeStr] = freeStaff.staff_id;
            }
        }
    }

    return {
        available_slots: availableSlots,
        service_id: service.id,
        date: dateStr,
        staff_map: foundStaff
    };
}

// ─── AI Chat Action ────────────────────────────────────────
export async function testAIChat(messages: any[], tenantConfig: any, tenantId?: string) {
    'use server';

    console.log('[testAIChat] Received tenantId arg:', tenantId);
    let activeTenantId: string | null | undefined = tenantId;

    if (!activeTenantId) {
        console.log('[testAIChat] No tenantId arg, fetching from session...');
        activeTenantId = await getCurrentTenantId();
        console.log('[testAIChat] Session tenantId:', activeTenantId);
    }

    if (!activeTenantId) {
        // Fallback: check text context or provide dummy for completely unauthed (shouldn't happen in admin)
        console.error('[testAIChat] FAILED to identify tenant.');
        return "Error: Could not identify business context. (ID Missing)";
    }

    const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

    // Fetch Services Context
    const serviceList = await getServices(activeTenantId);
    const serviceNames = serviceList.map((s: any) => `${s.name} ($${s.price}, ${s.duration_minutes}m)`).join(', ');

    const now = new Date();
    const dateString = now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });


    // Fetch Boss Profiles from DB
    const supabaseForBoss = await createClient();
    const { data: bossProfiles } = await supabaseForBoss
        .from('boss_profiles')
        .select('boss_name, boss_code')
        .eq('tenant_id', activeTenantId)
        .eq('is_active', true);

    const bossList = bossProfiles || [];
    const hasBossMode = bossList.length > 0;
    const bossCodesStr = bossList.map((b: any) => `"${b.boss_code}"(${b.boss_name})`).join(', ');

    const systemPrompt = `
    You are ${tenantConfig.persona_name || 'an AI assistant'}, working for "${tenantConfig.name || 'Touch Labs'}".
    Your goal is to help users book appointments.

    Business Description: "${tenantConfig.context || 'A professional service business.'}"

    Current Date: ${dateString} (${now.toISOString()})

    OUR SERVICES:
    ${serviceNames || 'No specific services listed. Ask user what they need.'}

    Config:
    - Greeting: "${tenantConfig.greeting}"
    - Tone: ${tenantConfig.voice_style}

    Instructions:
    - You are a helpful booking assistant.
    - ONLY offer services listed above. Do not hallucinate other services.
    - Use the provided tools to check availability and book appointments. Do not makeup information.
    - Check availability FIRST before offering times.
    - If "available_slots" is empty, you MUST say there are no slots for that day. Do NOT invent times.
    - If no slots are found, suggest alternative days.
    - Be concise and friendly.
    - Do NOT output XML tags or function call text representation; use the tool calling feature directly.
    - NEVER show raw function calls, JSON, or code to the user. Always respond in natural language.

    ADMIN/BOSS MODE:
    - Status: ${hasBossMode ? 'ENABLED' : 'DISABLED'}
    - Registered Boss Codes: ${hasBossMode ? bossCodesStr : 'None registered.'}
    - If the user says a valid boss code from the list above, acknowledge them as "Boss" by their boss name.
    - Once authenticated as Boss, you can use the admin tools to:
      * Manage Staff: Create/Delete/List staff members, Set their schedules
      * Manage Services: Create/Update/Delete services (name, price, duration, etc.)
    - For updating or deleting services, always call get_services first to find the service ID.
    - If user tries to use admin tools without providing a valid code, politely refuse.
    - Always respond in natural, conversational language. Never show function tags or JSON to the user.
    `;

    const adminTools = hasBossMode ? [
        {
            type: 'function',
            function: {
                name: 'create_staff',
                description: 'ADMIN ONLY: Create a new staff member account.',
                parameters: {
                    type: 'object',
                    properties: {
                        full_name: { type: 'string' },
                        email: { type: 'string' },
                        role: { type: 'string', enum: ['admin', 'staff'] },
                        password: { type: 'string' }
                    },
                    required: ['full_name', 'email', 'role']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'delete_staff',
                description: 'ADMIN ONLY: Delete a staff member by ID.',
                parameters: {
                    type: 'object',
                    properties: { staff_id: { type: 'string' } },
                    required: ['staff_id']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'list_staff',
                description: 'ADMIN ONLY: List all staff members with IDs.',
                parameters: { type: 'object', properties: {} }
            }
        },
        {
            type: 'function',
            function: {
                name: 'set_staff_schedule',
                description: 'ADMIN/BOSS ONLY: Set weekly working hours for a staff member.',
                parameters: {
                    type: 'object',
                    properties: {
                        staff_id: { type: 'string' },
                        schedule: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    day_of_week: { type: 'integer', description: '0=Sunday, 1=Monday, ..., 6=Saturday' },
                                    start_time: { type: 'string', description: 'HH:MM format (e.g. 09:00)' },
                                    end_time: { type: 'string', description: 'HH:MM format (e.g. 17:00)' },
                                    is_working: { type: 'boolean' }
                                },
                                required: ['day_of_week', 'is_working']
                            }
                        }
                    },
                    required: ['staff_id', 'schedule']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'create_service',
                description: 'ADMIN/BOSS ONLY: Create a new service offered by the business.',
                parameters: {
                    type: 'object',
                    properties: {
                        name: { type: 'string', description: 'Service name (e.g. Haircut, Massage)' },
                        description: { type: 'string', description: 'Short description of the service' },
                        duration_minutes: { type: 'integer', description: 'Duration in minutes (e.g. 30, 60)' },
                        price: { type: 'number', description: 'Price in dollars (e.g. 50)' },
                        buffer_minutes: { type: 'integer', description: 'Buffer time between appointments in minutes (default 0)' },
                        color: { type: 'string', description: 'Hex color code (default #6366f1)' }
                    },
                    required: ['name', 'duration_minutes', 'price']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'update_service',
                description: 'ADMIN/BOSS ONLY: Update an existing service by ID. Use list services (get_services) first to find the ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        service_id: { type: 'string', description: 'UUID of the service to update' },
                        name: { type: 'string' },
                        description: { type: 'string' },
                        duration_minutes: { type: 'integer' },
                        price: { type: 'number' },
                        buffer_minutes: { type: 'integer' },
                        color: { type: 'string' }
                    },
                    required: ['service_id']
                }
            }
        },
        {
            type: 'function',
            function: {
                name: 'delete_service',
                description: 'ADMIN/BOSS ONLY: Delete a service by ID. Use get_services first to find the ID.',
                parameters: {
                    type: 'object',
                    properties: {
                        service_id: { type: 'string', description: 'UUID of the service to delete' }
                    },
                    required: ['service_id']
                }
            }
        }
    ] : [];

    const tools = [
        {
            type: 'function',
            function: {
                name: 'get_services',
                description: 'Get list of services offered by the business',
                parameters: { type: 'object', properties: {} },
            },
        },
        {
            type: 'function',
            function: {
                name: 'check_availability',
                description: 'Check available slots for a service. Returns a list of times where at least one staff is free.',
                parameters: {
                    type: 'object',
                    properties: {
                        service_name: { type: 'string' },
                        date: { type: 'string', description: 'YYYY-MM-DD format (default to today)' },
                    },
                    required: ['service_name'],
                },
            },
        },
        {
            type: 'function',
            function: {
                name: 'book_appointment',
                description: 'Book an appointment at a specific time.',
                parameters: {
                    type: 'object',
                    properties: {
                        client_name: { type: 'string' },
                        client_phone: { type: 'string' },
                        service_name: { type: 'string' },
                        start_time: { type: 'string', description: 'ISO 8601 datetime string (e.g., 2024-02-20T10:00:00.000Z)' },
                    },
                    required: ['client_name', 'client_phone', 'service_name', 'start_time'],
                },
            },
        },
        ...adminTools
    ];

    const conversation = [
        { role: 'system', content: systemPrompt },
        ...messages,
    ];

    try {
        const completion = await groq.chat.completions.create({
            messages: conversation as any,
            model: 'llama-3.3-70b-versatile',
            tools: tools as any,
            tool_choice: 'auto',
            max_tokens: 1024,
        });

        const responseMessage = completion.choices[0].message;

        if (responseMessage.tool_calls) {
            const toolCall = responseMessage.tool_calls[0];
            const fnName = toolCall.function.name;
            const fnArgs = JSON.parse(toolCall.function.arguments);
            console.log('[AI Tool Call]', fnName, fnArgs);
            let toolResult = '';

            if (fnName === 'get_services') {
                const services = await getServices(activeTenantId);
                toolResult = JSON.stringify(services.map((s: any) => ({ name: s.name, price: s.price, duration: s.duration_minutes + ' min' })));
            } else if (fnName === 'check_availability') {
                const date = fnArgs.date || new Date().toISOString().split('T')[0];
                const result = await getAvailableSlots(date, fnArgs.service_name, activeTenantId);

                if (result.error) {
                    toolResult = JSON.stringify({ error: result.error });
                } else {
                    toolResult = JSON.stringify({
                        available_slots: result.available_slots,
                        date: result.date,
                        info: "These times are available."
                    });
                }
            } else if (fnName === 'book_appointment') {
                const dateStr = fnArgs.start_time.split('T')[0];
                const result = await getAvailableSlots(dateStr, fnArgs.service_name, activeTenantId);

                if (result.error) {
                    toolResult = JSON.stringify({ error: result.error });
                } else {
                    const normalizedTime = fnArgs.start_time.endsWith('Z') || fnArgs.start_time.includes('+')
                        ? fnArgs.start_time
                        : fnArgs.start_time + 'Z';

                    const checkTime = new Date(normalizedTime).getTime();
                    const checkDate = new Date(checkTime);
                    const timeKey = checkDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: 'UTC' });

                    console.log('[Booking Debug]', {
                        original: fnArgs.start_time,
                        normalized: normalizedTime,
                        timeKey,
                        mapKeys: Object.keys(result.staff_map || {})
                    });

                    const staffId = result.staff_map ? result.staff_map[timeKey] : null;

                    if (staffId) {
                        const services = await getServices(activeTenantId);
                        const service = services.find((s: any) => s.id === result.service_id);
                        const duration = service?.duration_minutes || 60;
                        const endTime = new Date(checkTime + duration * 60000).toISOString();

                        const createRes = await createAppointment({
                            staff_id: staffId, // Found ID
                            service_id: result.service_id,
                            client_name: fnArgs.client_name,
                            client_phone: fnArgs.client_phone,
                            booked_via: 'ai_chat',
                            start_time: checkDate.toISOString(), // Use normalized Time
                            end_time: endTime,
                            notes: 'Booked via AI Chat'
                        }, activeTenantId);

                        if (createRes.error) {
                            toolResult = JSON.stringify({ error: createRes.error });
                        } else {
                            toolResult = JSON.stringify({ success: true, booking_id: createRes.data.id, message: `Booking confirmed with Staff(ID: ${staffId})` });
                        }
                    } else {
                        toolResult = JSON.stringify({ error: 'Selected time slot is no longer available.' });
                    }
                }
            } else if (fnName === 'list_staff') {
                const staff = await getStaff(activeTenantId);
                toolResult = JSON.stringify(staff.map((s: any) => ({ id: s.id, name: s.full_name, email: s.email, role: s.role })));
            } else if (fnName === 'create_staff') {
                const res = await createStaffMember({
                    fullName: fnArgs.full_name,
                    email: fnArgs.email,
                    role: fnArgs.role,
                    password: fnArgs.password
                }, activeTenantId);
                toolResult = JSON.stringify(res);
            } else if (fnName === 'delete_staff') {
                const res = await deleteStaffMember(fnArgs.staff_id);
                toolResult = JSON.stringify(res);
            } else if (fnName === 'set_staff_schedule') {
                const res = await saveStaffSchedules(fnArgs.staff_id, fnArgs.schedule);
                toolResult = JSON.stringify(res);
            } else if (fnName === 'create_service') {
                const res = await createService({
                    name: fnArgs.name,
                    description: fnArgs.description || '',
                    duration_minutes: fnArgs.duration_minutes,
                    price: fnArgs.price,
                    buffer_minutes: fnArgs.buffer_minutes || 0,
                    color: fnArgs.color || '#6366f1'
                });
                toolResult = JSON.stringify(res);
            } else if (fnName === 'update_service') {
                const { service_id, ...updates } = fnArgs;
                const currentServices = await getServices(activeTenantId);
                const current = currentServices.find((s: any) => s.id === service_id);
                if (!current) {
                    toolResult = JSON.stringify({ error: 'Service not found with that ID.' });
                } else {
                    const res = await updateService(service_id, {
                        name: updates.name || current.name,
                        description: updates.description || current.description || '',
                        duration_minutes: updates.duration_minutes || current.duration_minutes,
                        price: updates.price ?? current.price,
                        buffer_minutes: updates.buffer_minutes ?? current.buffer_minutes ?? 0,
                        color: updates.color || current.color || '#6366f1'
                    });
                    toolResult = JSON.stringify(res);
                }
            } else if (fnName === 'delete_service') {
                const res = await deleteService(fnArgs.service_id);
                toolResult = JSON.stringify(res);
            }

            const followUpMessages = [
                ...conversation,
                responseMessage,
                {
                    role: 'tool',
                    tool_call_id: toolCall.id,
                    content: toolResult,
                },
            ];

            const finalCompletion = await groq.chat.completions.create({
                messages: followUpMessages as any,
                model: 'llama-3.3-70b-versatile',
            });

            return finalCompletion.choices[0].message.content;
        }

        return responseMessage.content;
    } catch (error: any) {
        console.error('Groq Error:', error);
        return `Error: ${error.message} `;
    }
}

// ─── DEBUG / FIX ACCOUNT ──────────────────────────────────────
export async function debugFixAccount() {
    'use server';
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return { message: "Error: Not logged in" };

    // Use Service Role Client if available to bypass RLS
    let adminSupabase: any = supabase;
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        const { createClient } = await import('@supabase/supabase-js');
        adminSupabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY,
            { auth: { autoRefreshToken: false, persistSession: false } }
        );
    }

    // 1. Check Profile (Use Admin to read even if RLS blocks)
    let { data: profile, error: pError } = await adminSupabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

    if (pError || !profile) {
        console.log('[Fix] Creating missing profile...');
        const newProfile = {
            id: user.id,
            email: user.email || '',
            full_name: 'Admin User',
            role: 'admin',
            tenant_id: null
        };
        const { error: insertError } = await adminSupabase.from('profiles').insert(newProfile);
        if (insertError) return { message: `Profile create failed: ${insertError.message} ` };
        profile = newProfile as any;
    }

    // 2. Check and Validate Tenant
    let tenantId = profile?.tenant_id;
    let tenantExists = false;

    if (tenantId) {
        const { data: t } = await adminSupabase.from('tenants').select('id').eq('id', tenantId).single();
        if (t) tenantExists = true;
    }

    if (!tenantId || !tenantExists) {
        console.log('[Fix] Creating new tenant for orphan user...');

        // Create Tenant
        const { data: tenant, error: tError } = await adminSupabase
            .from('tenants')
            .insert({
                name: 'My New Business',
                slug: `biz - ${Date.now()} `,
                plan: 'free',
                is_active: true
            })
            .select()
            .single();

        if (tError) return { message: `Tenant create failed: ${tError.message} ` };
        tenantId = tenant.id;

        // Link Profile (Using Admin Client to bypass update RLS)
        const { error: uError } = await adminSupabase
            .from('profiles')
            .update({ tenant_id: tenantId })
            .eq('id', user.id);

        if (uError) return { message: `Link failed: ${uError.message} ` };
    }

    return { success: true, tenantId, message: "Account fixed! Please refresh page." };
}
