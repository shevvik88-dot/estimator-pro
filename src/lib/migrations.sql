-- Run this in the Supabase SQL editor (Dashboard → SQL Editor → New query)

CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  full_name text,
  company_name text DEFAULT 'My Company',
  license_number text,
  phone text,
  address text,
  city text,
  state text,
  region text,
  plan text DEFAULT 'free',
  estimates_used int DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_email text,
  client_phone text,
  project_address text,
  city text,
  state text,
  region text,
  region_multiplier numeric DEFAULT 1.0,
  status text DEFAULT 'draft',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  title text,
  work_type text,
  inputs jsonb DEFAULT '{}',
  generated_estimate jsonb,
  subtotal numeric,
  multiplier numeric DEFAULT 1.0,
  total numeric,
  version int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users own their profile" ON profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "Users own their projects" ON projects FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Users own their estimates" ON estimates FOR ALL USING (auth.uid() = user_id);

-- Auto-create a profile row whenever a new user signs up
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = 'public' AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- Restrict handle_new_user to trigger-only invocation.
-- anon and authenticated roles must not call it directly via /rest/v1/rpc/.
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon, authenticated, PUBLIC;

-- ── Price Overrides (legacy — superseded by user_prices) ───────────────────
-- Functions removed from db.js; table kept in DB for historical data.
CREATE TABLE price_overrides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  item_key text NOT NULL,
  custom_rate numeric NOT NULL,
  unit text,
  label text,
  UNIQUE(user_id, item_key)
);
ALTER TABLE price_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own their prices" ON price_overrides FOR ALL USING (auth.uid() = user_id);

-- ── Contract tracking ──────────────────────────────────────────────────────
ALTER TABLE estimates ADD COLUMN IF NOT EXISTS contract_generated boolean DEFAULT false;

-- ── Template Items (shared price catalog) ──────────────────────────────────
CREATE TABLE template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  subcategory text,
  name text NOT NULL,
  description text,
  unit text,
  labor_rate numeric,
  material_rate numeric,
  base_rate numeric,
  min_amount numeric,
  notes text,
  work_types text[],
  sort_order int DEFAULT 0
);
-- Read-only for all authenticated users; no write access via frontend.
ALTER TABLE template_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read template_items" ON template_items FOR SELECT USING (true);

-- ── User Prices (per-contractor rate overrides on template_items) ──────────
CREATE TABLE user_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  template_item_id uuid NOT NULL REFERENCES template_items(id) ON DELETE CASCADE,
  custom_rate numeric NOT NULL,
  UNIQUE(user_id, template_item_id)
);
ALTER TABLE user_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own prices" ON user_prices FOR ALL USING (auth.uid() = user_id);
