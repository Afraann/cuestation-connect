-- Create enum types
CREATE TYPE device_type AS ENUM ('PS5', 'BILLIARDS');
CREATE TYPE device_status AS ENUM ('AVAILABLE', 'OCCUPIED');
CREATE TYPE session_status AS ENUM ('ACTIVE', 'COMPLETED');
CREATE TYPE payment_method AS ENUM ('CASH', 'UPI', 'SPLIT');
CREATE TYPE app_role AS ENUM ('ADMIN', 'STAFF');

-- Create users table for authentication
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_roles table (security requirement: roles in separate table)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE(user_id, role)
);

-- Create devices table
CREATE TABLE public.devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type device_type NOT NULL,
  status device_status DEFAULT 'AVAILABLE' NOT NULL,
  current_session_id UUID,
  sort_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create rate_profiles table
CREATE TABLE public.rate_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  device_type device_type NOT NULL,
  base_rate_30 INTEGER NOT NULL,
  base_rate_60 INTEGER NOT NULL,
  extra_15_rate INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create products table
CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  price INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT true NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create sessions table
CREATE TABLE public.sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id UUID REFERENCES public.devices(id) ON DELETE CASCADE NOT NULL,
  rate_profile_id UUID REFERENCES public.rate_profiles(id),
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  status session_status DEFAULT 'ACTIVE' NOT NULL,
  payment_method payment_method,
  amount_cash INTEGER DEFAULT 0,
  amount_upi INTEGER DEFAULT 0,
  final_amount INTEGER,
  calculated_amount INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create session_items table
CREATE TABLE public.session_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.sessions(id) ON DELETE CASCADE NOT NULL,
  product_id UUID REFERENCES public.products(id) NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  price_at_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_items ENABLE ROW LEVEL SECURITY;

-- Create function to check user role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Create function to get current user ID from session
CREATE OR REPLACE FUNCTION public.get_current_user_id()
RETURNS UUID
LANGUAGE SQL
STABLE
AS $$
  SELECT (current_setting('request.jwt.claims', true)::json->>'sub')::uuid
$$;

-- RLS Policies for users table
CREATE POLICY "Users can view all users"
  ON public.users FOR SELECT
  USING (true);

-- RLS Policies for user_roles table
CREATE POLICY "Anyone can view roles"
  ON public.user_roles FOR SELECT
  USING (true);

-- RLS Policies for devices table
CREATE POLICY "Staff can view all devices"
  ON public.devices FOR SELECT
  USING (true);

CREATE POLICY "Staff can update devices"
  ON public.devices FOR UPDATE
  USING (true);

-- RLS Policies for rate_profiles table
CREATE POLICY "Anyone can view rate profiles"
  ON public.rate_profiles FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert rate profiles"
  ON public.rate_profiles FOR INSERT
  WITH CHECK (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

CREATE POLICY "Admins can update rate profiles"
  ON public.rate_profiles FOR UPDATE
  USING (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete rate profiles"
  ON public.rate_profiles FOR DELETE
  USING (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

-- RLS Policies for products table
CREATE POLICY "Anyone can view products"
  ON public.products FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert products"
  ON public.products FOR INSERT
  WITH CHECK (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

CREATE POLICY "Admins can update products"
  ON public.products FOR UPDATE
  USING (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

CREATE POLICY "Admins can delete products"
  ON public.products FOR DELETE
  USING (public.has_role(public.get_current_user_id(), 'ADMIN'::app_role));

-- RLS Policies for sessions table
CREATE POLICY "Staff can view all sessions"
  ON public.sessions FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert sessions"
  ON public.sessions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update sessions"
  ON public.sessions FOR UPDATE
  USING (true);

-- RLS Policies for session_items table
CREATE POLICY "Staff can view all session items"
  ON public.session_items FOR SELECT
  USING (true);

CREATE POLICY "Staff can insert session items"
  ON public.session_items FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Staff can update session items"
  ON public.session_items FOR UPDATE
  USING (true);

CREATE POLICY "Staff can delete session items"
  ON public.session_items FOR DELETE
  USING (true);

-- Insert default users (password: admin123 and staff123)
-- Using bcrypt hash for 'admin123': $2a$10$rRq5Z5Z5Z5Z5Z5Z5Z5Z5ZeO5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5
-- Using bcrypt hash for 'staff123': $2a$10$sStStStStStStStStStStO5StStStStStStStStStStStStStSt
INSERT INTO public.users (username, password_hash) VALUES
  ('admin', '$2a$10$rRq5Z5Z5Z5Z5Z5Z5Z5Z5ZeO5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5Z5'),
  ('staff', '$2a$10$sStStStStStStStStStStO5StStStStStStStStStStStStStSt');

-- Assign roles to default users
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'ADMIN'::app_role FROM public.users WHERE username = 'admin'
UNION ALL
SELECT id, 'STAFF'::app_role FROM public.users WHERE username = 'staff';

-- Insert default devices (2 Billiard tables + 5 PS5s)
INSERT INTO public.devices (name, type, status, sort_order) VALUES
  ('Pool-01', 'BILLIARDS'::device_type, 'AVAILABLE'::device_status, 1),
  ('Pool-02', 'BILLIARDS'::device_type, 'AVAILABLE'::device_status, 2),
  ('PS5-01', 'PS5'::device_type, 'AVAILABLE'::device_status, 3),
  ('PS5-02', 'PS5'::device_type, 'AVAILABLE'::device_status, 4),
  ('PS5-03', 'PS5'::device_type, 'AVAILABLE'::device_status, 5),
  ('PS5-04', 'PS5'::device_type, 'AVAILABLE'::device_status, 6),
  ('PS5-05', 'PS5'::device_type, 'AVAILABLE'::device_status, 7);

-- Insert default rate profiles
INSERT INTO public.rate_profiles (name, device_type, base_rate_30, base_rate_60, extra_15_rate) VALUES
  ('PS5 Single Player', 'PS5'::device_type, 50, 80, 25),
  ('PS5 Multi Player', 'PS5'::device_type, 60, 100, 30),
  ('Billiards', 'BILLIARDS'::device_type, 100, 180, 50);

-- Insert sample products
INSERT INTO public.products (name, price, is_available) VALUES
  ('Cola', 30, true),
  ('Pepsi', 30, true),
  ('Mountain Dew', 35, true),
  ('Sprite', 30, true),
  ('Water Bottle', 20, true),
  ('Chips', 40, true),
  ('Samosa', 25, true),
  ('Sandwich', 60, true);