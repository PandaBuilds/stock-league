-- Create a table for public profiles (linked to Supabase Auth)
create table public.profiles (
  id uuid references auth.users not null primary key,
  username text unique,
  avatar_url text, -- We will just use a string for the avatar ID or URL
  updated_at timestamp with time zone default timezone('utc'::text, now())
);

-- Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

create policy "Public profiles are viewable by everyone."
  on profiles for select
  using ( true );

create policy "Users can insert their own profile."
  on profiles for insert
  with check ( auth.uid() = id );

create policy "Users can update own profile."
  on profiles for update
  using ( auth.uid() = id );

-- Leagues Table
create table public.leagues (
  id uuid default uuid_generate_v4() primary key,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  name text not null,
  admin_id uuid references public.profiles(id) not null,
  start_date timestamp with time zone,
  end_date timestamp with time zone,
  budget numeric default 100000, -- Default $100k
  is_active boolean default true
);

-- League Members Table
create table public.league_members (
  id uuid default uuid_generate_v4() primary key,
  league_id uuid references public.leagues(id) not null,
  user_id uuid references public.profiles(id) not null,
  joined_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_masked boolean default false,
  unique(league_id, user_id)
);

-- Portfolios Table (One per member per league)
create table public.portfolios (
  id uuid default uuid_generate_v4() primary key,
  member_id uuid references public.league_members(id) not null,
  cash_balance numeric default 100000, -- Starts with league budget
  total_value numeric default 100000 -- Cash + Holdings Value
);

-- Stocks Table (Master list of stocks available or tracked)
create table public.stocks (
  symbol text primary key,
  name text,
  current_price numeric,
  last_updated timestamp with time zone
);

-- Holdings Table
create table public.holdings (
  id uuid default uuid_generate_v4() primary key,
  portfolio_id uuid references public.portfolios(id) not null,
  stock_symbol text references public.stocks(symbol) not null,
  quantity numeric default 0,
  avg_price numeric default 0,
  unique(portfolio_id, stock_symbol)
);
