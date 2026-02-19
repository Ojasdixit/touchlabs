// Database types matching the Supabase schema
// These types represent the BookFlow AI database structure

export type UserRole = 'superadmin' | 'admin' | 'staff';
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'no_show' | 'completed';
export type BookedVia = 'phone' | 'app' | 'web';
export type CallDirection = 'inbound' | 'outbound';
export type CallStatus = 'in_progress' | 'completed' | 'failed' | 'escalated';
export type CallIntent = 'book' | 'cancel' | 'reschedule' | 'inquiry';
export type TenantPlan = 'free' | 'starter' | 'professional' | 'enterprise';

export interface Tenant {
    id: string;
    name: string;
    slug: string;
    phone_number: string | null;
    timezone: string;
    plan: TenantPlan;
    ai_config: AIConfig | null;
    is_active: boolean;
    created_at: string;
}

export interface AIConfig {
    persona_name: string;
    greeting: string;
    escalation_phone: string | null;
    voice_style: string;
    max_retries: number;
}

export interface Profile {
    id: string;
    tenant_id: string;
    role: UserRole;
    full_name: string;
    phone: string | null;
    email: string | null;
    avatar_url: string | null;
    expo_push_token: string | null;
    is_active: boolean;
    created_at: string;
}

export interface Service {
    id: string;
    tenant_id: string;
    name: string;
    description: string | null;
    duration_minutes: number;
    price: number;
    buffer_minutes: number;
    color: string;
    is_active: boolean;
    created_at: string;
}

export interface StaffSchedule {
    id: string;
    staff_id: string;
    tenant_id: string;
    day_of_week: number; // 0=Sun to 6=Sat
    start_time: string;  // HH:mm:ss
    end_time: string;    // HH:mm:ss
    is_working: boolean;
}

export interface StaffOverride {
    id: string;
    staff_id: string;
    tenant_id: string;
    date: string;        // YYYY-MM-DD
    start_time: string | null;
    end_time: string | null;
    is_available: boolean;
    reason: string | null;
}

export interface Appointment {
    id: string;
    tenant_id: string;
    staff_id: string;
    service_id: string;
    client_name: string;
    client_phone: string;
    client_email: string | null;
    start_time: string;
    end_time: string;
    status: AppointmentStatus;
    booked_via: BookedVia;
    ai_call_sid: string | null;
    notes: string | null;
    created_at: string;
    updated_at: string;
    // Joined relations (optional)
    service?: Service;
    staff?: Profile;
}

export interface AICallLog {
    id: string;
    tenant_id: string;
    call_sid: string;
    caller_phone: string;
    direction: CallDirection;
    transcript: string | null;
    intent: CallIntent | null;
    llm_provider: string;
    appointment_id: string | null;
    status: CallStatus;
    duration_seconds: number | null;
    created_at: string;
}

// ─── Helper types for forms and UI ──────────────────

export interface TimeSlot {
    start: string;
    end: string;
    staff_id: string;
    staff_name: string;
}

export interface ServiceFormData {
    name: string;
    description: string;
    duration_minutes: number;
    price: number;
    buffer_minutes: number;
    color: string;
}

export interface AppointmentFormData {
    service_id: string;
    staff_id: string;
    client_name: string;
    client_phone: string;
    client_email?: string;
    start_time: string;
    notes?: string;
}

export interface StaffScheduleFormData {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_working: boolean;
}
