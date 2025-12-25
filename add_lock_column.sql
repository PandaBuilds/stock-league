-- Add is_locked column to leagues table
ALTER TABLE public.leagues 
ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;

-- ensure existing rows default to false
UPDATE public.leagues SET is_locked = false WHERE is_locked IS NULL;
