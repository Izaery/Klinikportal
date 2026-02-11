
-- RLS Policies aktualisieren: INSERT
DROP POLICY IF EXISTS "Authorized users can create patients" ON public.patients;
CREATE POLICY "Authorized users can create patients"
ON public.patients
FOR INSERT
WITH CHECK (
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'INTAKE'::app_role, 'arzt_a'::app_role, 'arzt_b'::app_role, 'arzt_c'::app_role, 'arzt_d'::app_role, 'arzt_allgemein'::app_role])
);

-- RLS Policies aktualisieren: UPDATE
DROP POLICY IF EXISTS "Authorized users can update patients" ON public.patients;
CREATE POLICY "Authorized users can update patients"
ON public.patients
FOR UPDATE
USING (
  has_any_role(auth.uid(), ARRAY['ADMIN'::app_role, 'MANAGER'::app_role, 'INTAKE'::app_role, 'arzt_a'::app_role, 'arzt_b'::app_role, 'arzt_c'::app_role, 'arzt_d'::app_role, 'arzt_allgemein'::app_role])
);
