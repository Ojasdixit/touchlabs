-- ═══════════════════════════════════════════════════════════
-- BookFlow AI — Database Schema Migration
-- Run this in your Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Tenants ───────────────────────────────────────────────
CREATE TABLE tenants (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name             TEXT NOT NULL,
  slug             TEXT UNIQUE NOT NULL,
  phone_number     TEXT,
  timezone         TEXT DEFAULT 'UTC',
  plan             TEXT DEFAULT 'free' CHECK (plan IN ('free', 'starter', 'professional', 'enterprise')),
  ai_config        JSONB DEFAULT '{}',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Profiles (linked to Supabase Auth) ────────────────────
CREATE TABLE profiles (
  id               UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id        UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role             TEXT NOT NULL CHECK (role IN ('superadmin', 'admin', 'staff')),
  full_name        TEXT NOT NULL,
  phone            TEXT,
  email            TEXT,
  avatar_url       TEXT,
  expo_push_token  TEXT,
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Services ──────────────────────────────────────────────
CREATE TABLE services (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
  price            NUMERIC(10,2) DEFAULT 0,
  buffer_minutes   INTEGER DEFAULT 0,
  color            TEXT DEFAULT '#6366f1',
  is_active        BOOLEAN DEFAULT TRUE,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── Staff Schedules (recurring weekly) ────────────────────
CREATE TABLE staff_schedules (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  day_of_week      INTEGER NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time       TIME NOT NULL,
  end_time         TIME NOT NULL,
  is_working       BOOLEAN DEFAULT TRUE,
  UNIQUE(staff_id, day_of_week)
);

-- ─── Staff Overrides (specific date exceptions) ────────────
CREATE TABLE staff_overrides (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id         UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  date             DATE NOT NULL,
  start_time       TIME,
  end_time         TIME,
  is_available     BOOLEAN DEFAULT FALSE,
  reason           TEXT,
  UNIQUE(staff_id, date)
);

-- ─── Appointments ──────────────────────────────────────────
CREATE TABLE appointments (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  staff_id         UUID NOT NULL REFERENCES profiles(id),
  service_id       UUID NOT NULL REFERENCES services(id),
  client_name      TEXT NOT NULL,
  client_phone     TEXT NOT NULL,
  client_email     TEXT,
  start_time       TIMESTAMPTZ NOT NULL,
  end_time         TIMESTAMPTZ NOT NULL,
  status           TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled', 'no_show', 'completed')),
  booked_via       TEXT DEFAULT 'web' CHECK (booked_via IN ('phone', 'app', 'web')),
  ai_call_sid      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ─── AI Call Logs ──────────────────────────────────────────
CREATE TABLE ai_call_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  call_sid         TEXT UNIQUE,
  caller_phone     TEXT,
  direction        TEXT CHECK (direction IN ('inbound', 'outbound')),
  transcript       TEXT,
  intent           TEXT CHECK (intent IN ('book', 'cancel', 'reschedule', 'inquiry')),
  llm_provider     TEXT,
  appointment_id   UUID REFERENCES appointments(id),
  status           TEXT DEFAULT 'in_progress' CHECK (status IN ('in_progress', 'completed', 'failed', 'escalated')),
  duration_seconds INTEGER,
  created_at       TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════════════════
-- Indexes for performance
-- ═══════════════════════════════════════════════════════════
CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);
CREATE INDEX idx_services_tenant ON services(tenant_id);
CREATE INDEX idx_appointments_tenant ON appointments(tenant_id);
CREATE INDEX idx_appointments_staff ON appointments(staff_id);
CREATE INDEX idx_appointments_start ON appointments(start_time);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_staff_schedules_staff ON staff_schedules(staff_id);
CREATE INDEX idx_ai_call_logs_tenant ON ai_call_logs(tenant_id);
CREATE INDEX idx_ai_call_logs_sid ON ai_call_logs(call_sid);

-- ═══════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════     

-- Enable RLS on all tables
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_call_logs ENABLE ROW LEVEL SECURITY;

-- ─── Profiles Policies ────────────────────────────────────
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (id = auth.uid());

CREATE POLICY "Admin can view all tenant profiles"
  ON profiles FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ─── Services Policies ───────────────────────────────────
CREATE POLICY "Anyone in tenant can view services"
  ON services FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
  );

CREATE POLICY "Admin can manage services"
  ON services FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ─── Appointments Policies ────────────────────────────────
CREATE POLICY "Staff see own appointments"
  ON appointments FOR SELECT
  USING (staff_id = auth.uid());

CREATE POLICY "Admin manages all tenant appointments"
  ON appointments FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ─── Staff Schedules Policies ─────────────────────────────
CREATE POLICY "Staff view own schedule"
  ON staff_schedules FOR SELECT
  USING (staff_id = auth.uid());

CREATE POLICY "Admin manages all schedules"
  ON staff_schedules FOR ALL
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ─── AI Call Logs Policies ────────────────────────────────
CREATE POLICY "Admin can view call logs"
  ON ai_call_logs FOR SELECT
  USING (
    tenant_id = (SELECT tenant_id FROM profiles WHERE id = auth.uid())
    AND (SELECT role FROM profiles WHERE id = auth.uid()) IN ('admin', 'superadmin')
  );

-- ═══════════════════════════════════════════════════════════
-- Trigger: Auto-update updated_at on appointments
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ═══════════════════════════════════════════════════════════
-- Trigger: Auto-create profile on Supabase Auth signup
-- ═══════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', 'New User'),
    NEW.email,
    'staff'  -- default role, admin changes this
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_user();
