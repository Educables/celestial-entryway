-- Update existing matusalakiflom@gmail.com user to admin role
UPDATE public.user_roles
SET role = 'admin'
WHERE user_id = '5837ebb0-bf18-4a38-82d8-fa451aa99822';