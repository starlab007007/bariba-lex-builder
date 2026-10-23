-- Revue de capacité avant mise en production : corrige, sur les tables
-- FITILA que ce travail a introduites ou touche directement, le motif
-- "auth_rls_initplan" signalé par l'advisor de performance Supabase
-- (auth.uid()/has_role(auth.uid()...) ré-évalué PAR LIGNE dans une policy
-- RLS au lieu d'une seule fois par requête) — comportement identique,
-- juste plus rapide sous charge. Ajoute aussi deux index de clé
-- étrangère manquants, également signalés par l'advisor.

alter policy "platform_audit_log_insert_self" on public.platform_audit_log
  with check (actor = (select auth.uid()));

alter policy "platform_audit_log_select_admin" on public.platform_audit_log
  using (has_role((select auth.uid()), 'admin'::app_role));

alter policy "Admins can manage all submissions" on public.word_submissions
  using (has_role((select auth.uid()), 'admin'::app_role))
  with check (has_role((select auth.uid()), 'admin'::app_role));

alter policy "Users can create submissions" on public.word_submissions
  with check ((select auth.uid()) = user_id);

alter policy "Users can view own submissions" on public.word_submissions
  using ((select auth.uid()) = user_id);

create index if not exists idx_dictionary_entries_created_by on public.dictionary_entries (created_by);
create index if not exists idx_dictionary_entries_updated_by on public.dictionary_entries (updated_by);
create index if not exists idx_training_phrases_created_by on public.training_phrases (created_by);
