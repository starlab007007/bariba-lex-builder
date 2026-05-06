
# Diagnostic : Page blanche sur https://fitila.bj

## Erreur exacte (console navigateur)
```
Error: supabaseUrl is required.
```
Le client Supabase crash au démarrage car `VITE_SUPABASE_URL` est `undefined` dans le bundle JS déployé.

## Cause racine
Le fichier `.env` est listé dans `.dockerignore` (ligne 5). Docker ne le copie jamais dans le conteneur. Les variables d'environnement Vite (`VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`) sont donc absentes pendant `npm run build` dans Docker, ce qui produit un bundle sans credentials.

Le Dockerfile, docker-composer.yml et deploy.yml sont déjà configurés pour recevoir ces variables via des build args et GitHub Secrets. **Mais ces secrets doivent exister côté GitHub et/ou VPS.**

## Actions à réaliser

### Action 1 (votre côté) : Ajouter les GitHub Secrets
Dans votre repo GitHub : **Settings → Secrets and variables → Actions → New repository secret** :

| Nom | Valeur |
|-----|--------|
| `VITE_SUPABASE_URL` | `https://pmrhezgnyffiskbaiudb.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcmhlemdueWZmaXNrYmFpdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgzNzAsImV4cCI6MjA3ODg2NDM3MH0.BRqdPly5tClRwhuQes1dckaTNQkbjIqZ5I8q6km_lZ4` |

### Action 2 (votre côté) : Créer un .env sur le VPS
Comme sécurité supplémentaire (pour `docker compose build` sur le VPS), créez ce fichier :

```bash
ssh votre-vps
cat > /home/debian/bariba-lex-builder/.env << 'EOF'
VITE_SUPABASE_URL=https://pmrhezgnyffiskbaiudb.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBtcmhlemdueWZmaXNrYmFpdWRiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjMyODgzNzAsImV4cCI6MjA3ODg2NDM3MH0.BRqdPly5tClRwhuQes1dckaTNQkbjIqZ5I8q6km_lZ4
EOF
```

Docker Compose lit automatiquement ce `.env` et passe les valeurs aux build args.

### Action 3 (optionnel, code) : Ajouter une protection contre le crash
Pour éviter une page blanche si les variables manquent à l'avenir, on peut ajouter une vérification dans le code qui affiche un message d'erreur clair au lieu de crasher silencieusement.

### Après ces actions
Relancez le déploiement (push un commit ou re-run le workflow GitHub Actions). La page ne sera plus blanche.

## Résumé
Aucun bug dans le code. Le Dockerfile et le workflow sont corrects. Il manque simplement les **2 secrets GitHub** et/ou le **fichier .env sur le VPS**.
