alter table public.leagues 
add column if not exists anonymous_mode boolean default false;
