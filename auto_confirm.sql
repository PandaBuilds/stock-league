-- Function to auto-confirm users
create or replace function public.auto_confirm_user() 
returns trigger as $$
begin
  new.email_confirmed_at = now();
  return new;
end;
$$ language plpgsql security definer;

-- Trigger to run BEFORE a new user is inserted into the auth.users table
create trigger on_auth_user_created_confirm
  before insert on auth.users
  for each row execute procedure public.auto_confirm_user();
