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
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE handle_new_user();
