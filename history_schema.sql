create table public.portfolio_history (
  id uuid default uuid_generate_v4() primary key,
  portfolio_id uuid references public.portfolios(id) not null,
  recorded_at date default CURRENT_DATE,
  total_value numeric not null,
  unique(portfolio_id, recorded_at)
);
