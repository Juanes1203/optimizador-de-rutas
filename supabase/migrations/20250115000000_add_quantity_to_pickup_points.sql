-- Add quantity column to pickup_points table
ALTER TABLE public.pickup_points
ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1;

-- Update existing records to have quantity = 1 if null
UPDATE public.pickup_points
SET quantity = 1
WHERE quantity IS NULL;

