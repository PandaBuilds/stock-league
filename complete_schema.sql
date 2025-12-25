-- ==========================================
-- COMPLETE STOCK LEAGUE DATABASE SCHEMA
-- ==========================================

-- 1. PROFILES (Linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text,
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone." on profiles for select using ( true );
create policy "Users can insert their own profile." on profiles for insert with check ( auth.uid() = id );
create policy "Users can update own profile." on profiles for update using ( auth.uid() = id );

-- 2. LEAGUES
create table public.leagues (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  admin_id uuid references public.profiles(id) not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  budget numeric default 100000,
  is_active boolean default true,
  join_code text unique, -- Added for 4-digit join codes
  anonymous_mode boolean default false -- Added for data masking
);

-- 3. LEAGUE MEMBERS
create table public.league_members (
  id uuid default uuid_generate_v4() primary key,
  league_id uuid references public.leagues(id) not null, -- ON DELETE CASCADE added below
  user_id uuid references public.profiles(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_masked boolean default false,
  unique(league_id, user_id)
);

-- 4. PORTFOLIOS
create table public.portfolios (
  id uuid default uuid_generate_v4() primary key,
  member_id uuid references public.league_members(id) not null, -- ON DELETE CASCADE added below
  cash_balance numeric default 100000,
  total_value numeric default 100000
);

-- 5. PORTFOLIO HISTORY (For charts)
create table public.portfolio_history (
  id uuid default uuid_generate_v4() primary key,
  portfolio_id uuid references public.portfolios(id) not null, -- ON DELETE CASCADE added below
  recorded_at date not null,
  total_value numeric not null,
  unique(portfolio_id, recorded_at)
);

-- 6. STOCKS (Master List)
create table public.stocks (
  symbol text primary key,
  name text,
  current_price numeric,
  last_updated timestamp with time zone
);

-- 7. HOLDINGS
create table public.holdings (
  id uuid default uuid_generate_v4() primary key,
  portfolio_id uuid references public.portfolios(id) not null, -- ON DELETE CASCADE added below
  stock_symbol text references public.stocks(symbol) not null,
  quantity numeric default 0,
  avg_price numeric default 0,
  unique(portfolio_id, stock_symbol)
);

-- ==========================================
-- CONSTRAINTS & CASCADES (For Clean Deletion)
-- ==========================================

-- Drop defaults if they exist (to be safe)
ALTER TABLE public.league_members DROP CONSTRAINT IF EXISTS league_members_league_id_fkey;
ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_member_id_fkey;
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_portfolio_id_fkey;
ALTER TABLE public.portfolio_history DROP CONSTRAINT IF EXISTS portfolio_history_portfolio_id_fkey;

-- Re-add with CASCADE
ALTER TABLE public.league_members
ADD CONSTRAINT league_members_league_id_fkey
FOREIGN KEY (league_id) REFERENCES public.leagues(id) ON DELETE CASCADE;

ALTER TABLE public.portfolios
ADD CONSTRAINT portfolios_member_id_fkey
FOREIGN KEY (member_id) REFERENCES public.league_members(id) ON DELETE CASCADE;

ALTER TABLE public.holdings
ADD CONSTRAINT holdings_portfolio_id_fkey
FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

ALTER TABLE public.portfolio_history
ADD CONSTRAINT portfolio_history_portfolio_id_fkey
FOREIGN KEY (portfolio_id) REFERENCES public.portfolios(id) ON DELETE CASCADE;

-- ==========================================
-- AUTOMATION TRIGGERS
-- ==========================================

-- Auto-create Profile on Signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger Setup
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
