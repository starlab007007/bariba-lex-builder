CREATE POLICY "Teachers delete answers"
  ON public.classe_student_answers FOR DELETE
  TO authenticated
  USING (public.is_teacher_or_admin(auth.uid()));