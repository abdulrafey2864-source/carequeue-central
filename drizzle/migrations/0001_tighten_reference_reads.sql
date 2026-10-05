DROP POLICY IF EXISTS "read departments" ON public.departments;
CREATE POLICY "read departments" ON public.departments FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "read settings" ON public.queue_settings;
CREATE POLICY "read settings" ON public.queue_settings FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()));

DROP POLICY IF EXISTS "read doctors" ON public.doctors;
CREATE POLICY "read doctors" ON public.doctors FOR SELECT TO authenticated
USING (
  user_id = auth.uid()
  OR public.has_role(auth.uid(), 'admin')
  OR public.has_role(auth.uid(), 'staff')
  OR public.has_role(auth.uid(), 'doctor')
  OR (active AND EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid()))
);