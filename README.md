# FITILA

FITILA est une plateforme web et mobile centrée sur le bàátɔ̀nú : apprentissage, dictionnaire, traduction, voix, contenus culturels et outils de création.

## Architecture de référence

- Web : React + Vite
- Mobile : Flutter
- Backend unique : Supabase FITILA `dvswhjawiooprghzeyol`
- Déploiement web : GitHub Actions → VPS Docker/Traefik
- Domaine : `https://fitila.bj`

Le projet ne dépend plus d'un backend de prototypage externe. Le Web et Flutter doivent utiliser le même projet Supabase FITILA.

## Développement web

```bash
npm ci
npm run dev
```

Build :

```bash
npm run build
```

## Apprendre

Le contenu canonique est versionné dans :

- `src/data/apprendre_v2.json`
- `src/data/scenes_v2.json`

et centralisé dans Supabase via :

- `supabase/migrations/20260928090000_apprendre_module_content.sql`
- `tools/apprendre-content-import/`

Le web lit Supabase en priorité et conserve les JSON embarqués comme repli. Flutter conserve également une copie embarquée pour le mode hors-ligne.

## Flutter

La branche Flutter Build19 de référence est :

`feat/apprendre-v2.4-build19-20260927`

Toute future consolidation Flutter/Web doit partir d'une branche unifiée dérivée de cette référence, sans réintroduire d'ancien backend.

## Administration

- `/admin`
- `/admin/users`
- `/admin/apprendre-content`
- `/admin/apprendre-voice`

## Sécurité

Ne jamais committer :
- clés service_role ;
- mots de passe DB ;
- tokens d'accès Supabase ;
- secrets de fournisseurs IA.

Les clés publishables publiques peuvent être utilisées côté client.
