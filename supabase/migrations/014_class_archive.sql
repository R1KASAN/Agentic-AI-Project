-- Migration for soft-delete/archiving classes
ALTER TABLE public.classes ADD COLUMN archived_at TIMESTAMPTZ DEFAULT NULL;

-- Optional RPC for archiving classes safely
CREATE OR REPLACE FUNCTION soft_archive_class(class_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Verify the user is the teacher of the class
  IF NOT EXISTS (
    SELECT 1 FROM public.classes
    WHERE id = class_id AND teacher_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Not authorized to archive this class';
  END IF;

  UPDATE public.classes
  SET archived_at = now()
  WHERE id = class_id AND teacher_id = auth.uid();
END;
$$;
