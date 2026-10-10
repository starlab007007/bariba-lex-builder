-- DUNYA IA — verrouillage de la modération des contributions.
-- Un utilisateur peut lire ses contributions et en créer au statut pending,
-- mais ne peut ni s'auto-approuver, ni modifier review_status.

drop policy if exists dunya_contributions_own on dunya.contributions;

revoke update, delete on dunya.contributions from authenticated;
grant select, insert on dunya.contributions to authenticated;

drop policy if exists dunya_own_contributions on dunya.contributions;
create policy dunya_own_contributions
on dunya.contributions
for select to authenticated
using (user_id = (select auth.uid()));

drop policy if exists dunya_create_contributions on dunya.contributions;
create policy dunya_create_contributions
on dunya.contributions
for insert to authenticated
with check (
  user_id = (select auth.uid())
  and review_status = 'pending'
  and status = 'submitted'
);
