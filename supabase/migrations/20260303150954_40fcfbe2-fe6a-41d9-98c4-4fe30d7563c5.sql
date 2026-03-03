
-- Add pre_interview_confirmed column for tracking confirmation status
ALTER TABLE public.patients ADD COLUMN pre_interview_confirmed boolean DEFAULT false;
