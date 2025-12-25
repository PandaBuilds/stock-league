-- Create a function that handles new user signup
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, username, avatar_url)
  values (new.id, new.raw_user_meta_data->>'username', new.raw_user_meta_data->>'avatar_url');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger the function every time a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Since you already signed up, we need to manually insert your profile row to fix the current error
-- This query uses the ID of the currently logged in user (you) to create a profile row if missing.
-- Run this block in SQL editor:

/* 
insert into public.profiles (id, username)
select id, email 
from auth.users 
where id not in (select id from public.profiles);
*/
