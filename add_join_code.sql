-- Add join_code column to leagues table
ALTER TABLE public.leagues 
ADD COLUMN join_code text UNIQUE;

-- Comment: This allows nulls by default, so existing leagues won't break 
-- but won't have a code unless updated.
