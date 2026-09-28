# Test des migrations « voix Apprendre »

Rejoue les deux migrations `supabase/migrations/20260927100000_*.sql` et `20260927100100_*.sql`
dans un vrai PostgreSQL (PGlite, compilé en WebAssembly), avec un schéma minimal imitant
Supabase (`auth`, `storage`, rôles `anon` et `authenticated`), puis vérifie 32 règles :
consentement, soumission, refus de valider sa propre prise, activation par l'admin,
lecture anonyme limitée aux voix actives, retrait automatique quand un texte change,
activation automatique après deux avis, retrait du consentement.

```
cd fitila_flutter/tool/audio_catalog/db_test
npm init -y && npm install @electric-sql/pglite
node apprendre_voice_db_test.mjs
```
Chaque ligne commence par OK ou FAIL ; le code de sortie vaut 1 en cas d'échec.
