-- 1. Drop existing constraints
ALTER TABLE public.holdings DROP CONSTRAINT IF EXISTS holdings_portfolio_id_fkey;
ALTER TABLE public.portfolios DROP CONSTRAINT IF EXISTS portfolios_member_id_fkey;
ALTER TABLE public.league_members DROP CONSTRAINT IF EXISTS league_members_league_id_fkey;

-- 2. Re-add specific constraints with ON DELETE CASCADE
-- This ensures that when a parent is deleted, valid children are auto-deleted.

-- League Members -> League
ALTER TABLE public.league_members
ADD CONSTRAINT league_members_league_id_fkey
FOREIGN KEY (league_id)
REFERENCES public.leagues(id)
ON DELETE CASCADE;

-- Portfolios -> League Members
ALTER TABLE public.portfolios
ADD CONSTRAINT portfolios_member_id_fkey
FOREIGN KEY (member_id)
REFERENCES public.league_members(id)
ON DELETE CASCADE;

-- Holdings -> Portfolios
ALTER TABLE public.holdings
ADD CONSTRAINT holdings_portfolio_id_fkey
FOREIGN KEY (portfolio_id)
REFERENCES public.portfolios(id)
ON DELETE CASCADE;
