
# Correction de la page blanche sur fitila.bj

## Probleme

Le fichier `.env` est exclu par `.dockerignore`. Les variables `VITE_SUPABASE_URL` et `VITE_SUPABASE_PUBLISHABLE_KEY` ne sont jamais disponibles pendant `npm run build` dans Docker. Sans elles, le client Supabase plante au demarrage et la page reste blanche.

## Solution

Passer ces variables comme **ARG** Docker (ce sont des cles publiques/anon, pas des secrets sensibles).

### 1. Dockerfile - Ajouter les ARG Supabase

```dockerfile
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY

ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
ENV VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY
```

### 2. docker-composer.yml - Passer les args au build

```yaml
build:
  context: .
  args:
    VITE_SUPABASE_URL: ${VITE_SUPABASE_URL}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${VITE_SUPABASE_PUBLISHABLE_KEY}
```

### 3. deploy.yml - Exporter les variables sur le VPS avant le build

Dans le script de deploiement SSH, ajouter :
```bash
export VITE_SUPABASE_URL=https://pmrhezgnyffiskbaiudb.supabase.co
export VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Ou mieux : creer un fichier `.env` sur le VPS dans `/home/debian/bariba-lex-builder/` avec ces valeurs, et docker compose les lira automatiquement.

### 4. deploy.yml - CI build job (optionnel)

Ajouter les memes variables dans le job `build` du workflow GitHub Actions pour que le check de build passe aussi :
```yaml
env:
  VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
  VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
```

---

## Action requise de votre part

Vous devrez ajouter ces 2 secrets dans votre repo GitHub (Settings > Secrets) :
- `VITE_SUPABASE_URL` = `https://pmrhezgnyffiskbaiudb.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = la cle anon du projet

Et/ou creer un `.env` sur votre VPS dans le dossier du projet.
