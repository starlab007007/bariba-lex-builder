-- Audit sécurité avant mise en production : ferme un vecteur d'abus
-- confirmé exploitable par un client anonyme (aucune suppression de
-- données ici — uniquement des révocations de droits, réversibles).
--
-- zz_probe / zz_probe_anon : scaffolding de diagnostic de latence créée
-- hors-git lors des tests de la branche DUNYA voix, jamais référencée
-- dans le code applicatif (Flutter, edge functions, pg_cron). Les deux
-- étaient accordées à `anon` ET `authenticated` ET déclenchent un appel
-- HTTP serveur (pg_net) vers N'IMPORTE QUELLE edge function du projet,
-- nommée librement par l'appelant, sans limite de débit : un visiteur
-- non authentifié pouvait ainsi déclencher à volonté des appels coûteux
-- (IA, TTS/STT...) via le serveur Postgres lui-même. zz_probe contenait
-- en plus un JWT codé en dur dans son corps.
revoke execute on function public.zz_probe(text, text, jsonb) from public, anon, authenticated;
revoke execute on function public.zz_probe_anon(text, text, jsonb) from public, anon, authenticated;

-- get_user_phone : la logique interne ne renvoie déjà le numéro que si
-- auth.uid() = target_user_id (un anonyme ou un autre utilisateur ne
-- reçoit jamais rien — pas une fuite exploitable), mais rien ne
-- justifie que anon/PUBLIC puisse même l'appeler.
revoke execute on function public.get_user_phone(uuid) from public;
grant execute on function public.get_user_phone(uuid) to authenticated;

-- rls_auto_enable : fonction de event trigger (un appel RPC direct
-- échoue de toute façon avec une erreur Postgres hors de ce contexte),
-- mais ne doit pas rester listée comme appelable via l'API publique.
revoke execute on function public.rls_auto_enable() from public;
