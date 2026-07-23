-- ====================================================================
-- SUPABASE / POSTGRESQL SCHEMA FOR GLANCE MULTI-BUSINESS BOOKING PORTAL
-- Run this schema in your Supabase project's SQL Editor to create tables.
-- ====================================================================

-- 1. Create Businesses Table
CREATE TABLE IF NOT EXISTS public.businesses (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL,
    owner_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    upi_id TEXT,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Create Staff Table
CREATE TABLE IF NOT EXISTS public.staff (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    role TEXT NOT NULL,
    working_hours JSONB NOT NULL, -- Format: {"start": "08:00", "end": "21:00"}
    color TEXT NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Create Clients Table
CREATE TABLE IF NOT EXISTS public.clients (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    notes TEXT DEFAULT '' NOT NULL,
    created_date TEXT NOT NULL, -- Format: YYYY-MM-DD
    birthday TEXT,              -- Format: YYYY-MM-DD or MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Create Prepaid Packages Table
CREATE TABLE IF NOT EXISTS public.packages (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    client_phone TEXT NOT NULL,
    total_sessions INTEGER NOT NULL,
    sessions_remaining INTEGER NOT NULL,
    price NUMERIC NOT NULL,
    expiry_date TEXT NOT NULL,   -- Format: YYYY-MM-DD
    created_date TEXT NOT NULL,  -- Format: YYYY-MM-DD
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 5. Create Bookings (Appointments) Table
CREATE TABLE IF NOT EXISTS public.bookings (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    staff_id TEXT REFERENCES public.staff(id) ON DELETE CASCADE NOT NULL,
    service_name TEXT NOT NULL,
    date_time TEXT NOT NULL,     -- Format: YYYY-MM-DDTHH:MM
    duration_minutes INTEGER NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('confirmed', 'completed', 'no-show', 'cancelled')),
    notes TEXT,
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    price NUMERIC NOT NULL,
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. Create Payments Ledger Table
CREATE TABLE IF NOT EXISTS public.payments (
    id TEXT PRIMARY KEY,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    client_phone TEXT NOT NULL,
    client_name TEXT NOT NULL,
    amount NUMERIC NOT NULL,
    method TEXT NOT NULL CHECK (method IN ('cash', 'upi', 'card')),
    date TEXT NOT NULL,          -- Format: YYYY-MM-DD or ISO String
    type TEXT NOT NULL CHECK (type IN ('booking', 'package_purchase', 'manual_settlement')),
    linked_booking_id TEXT,      -- Can reference public.bookings(id) optionally
    linked_package_id TEXT,      -- Can reference public.packages(id) optionally
    status TEXT NOT NULL CHECK (status IN ('paid', 'due')),
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. Create Services Directory Table
CREATE TABLE IF NOT EXISTS public.services (
    name TEXT NOT NULL,
    business_id TEXT REFERENCES public.businesses(id) ON DELETE CASCADE NOT NULL,
    price NUMERIC NOT NULL,
    duration_minutes INTEGER NOT NULL,
    category TEXT NOT NULL DEFAULT 'Hair',
    user_id TEXT NOT NULL DEFAULT '',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (business_id, name)
);

-- ====================================================================
-- MIGRATION HELPERS FOR EXISTING TABLES
-- This ensures existing setups accept any custom input for business sector
-- and get the user_id column automatically
-- ====================================================================
ALTER TABLE public.businesses ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.businesses DROP CONSTRAINT IF EXISTS businesses_type_check;
ALTER TABLE public.businesses ALTER COLUMN type TYPE TEXT;
ALTER TABLE public.staff ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.payments ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';

-- ====================================================================
-- ENHANCEMENTS: INDICES FOR OPTIMAL QUERY PERFORMANCE
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON public.businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff(user_id);
CREATE INDEX IF NOT EXISTS idx_clients_user_id ON public.clients(user_id);
CREATE INDEX IF NOT EXISTS idx_packages_user_id ON public.packages(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_user_id ON public.bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_payments_user_id ON public.payments(user_id);
CREATE INDEX IF NOT EXISTS idx_services_user_id ON public.services(user_id);

CREATE INDEX IF NOT EXISTS idx_staff_business_id ON public.staff(business_id);
CREATE INDEX IF NOT EXISTS idx_clients_business_id ON public.clients(business_id);
CREATE INDEX IF NOT EXISTS idx_packages_business_id ON public.packages(business_id);
CREATE INDEX IF NOT EXISTS idx_bookings_business_id ON public.bookings(business_id);
CREATE INDEX IF NOT EXISTS idx_payments_business_id ON public.payments(business_id);
CREATE INDEX IF NOT EXISTS idx_services_business_id ON public.services(business_id);

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) FOR USER ISOLATION
-- ====================================================================
ALTER TABLE public.businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Drop existing general policies if any
DROP POLICY IF EXISTS "Allow all read operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all write operations" ON public.businesses;
DROP POLICY IF EXISTS "Allow all read operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all write operations" ON public.staff;
DROP POLICY IF EXISTS "Allow all read operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all write operations" ON public.clients;
DROP POLICY IF EXISTS "Allow all read operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all write operations" ON public.packages;
DROP POLICY IF EXISTS "Allow all read operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all write operations" ON public.bookings;
DROP POLICY IF EXISTS "Allow all read operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all write operations" ON public.payments;
DROP POLICY IF EXISTS "Allow all read operations" ON public.services;
DROP POLICY IF EXISTS "Allow all write operations" ON public.services;

DROP POLICY IF EXISTS "Allow read own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow write own data" ON public.businesses;
DROP POLICY IF EXISTS "Allow read own data" ON public.staff;
DROP POLICY IF EXISTS "Allow write own data" ON public.staff;
DROP POLICY IF EXISTS "Allow read own data" ON public.clients;
DROP POLICY IF EXISTS "Allow write own data" ON public.clients;
DROP POLICY IF EXISTS "Allow read own data" ON public.packages;
DROP POLICY IF EXISTS "Allow write own data" ON public.packages;
DROP POLICY IF EXISTS "Allow read own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow write own data" ON public.bookings;
DROP POLICY IF EXISTS "Allow read own data" ON public.payments;
DROP POLICY IF EXISTS "Allow write own data" ON public.payments;
DROP POLICY IF EXISTS "Allow read own data" ON public.services;
DROP POLICY IF EXISTS "Allow write own data" ON public.services;

-- Enable clean multi-tenant user isolation policies (casts auth.uid() to text to match user_id)
CREATE POLICY "Allow read own data" ON public.businesses FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.businesses FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.staff FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.staff FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.clients FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.clients FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.packages FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.packages FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.bookings FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.bookings FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.payments FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.payments FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');

CREATE POLICY "Allow read own data" ON public.services FOR SELECT USING (auth.uid()::text = user_id OR user_id = '');
CREATE POLICY "Allow write own data" ON public.services FOR ALL USING (auth.uid()::text = user_id OR user_id = '') WITH CHECK (auth.uid()::text = user_id OR user_id = '');
