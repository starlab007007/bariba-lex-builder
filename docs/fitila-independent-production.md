# FITILA — hébergement indépendant de Lovable

## Architecture cible

- Frontend React/Vite : image Docker Nginx issue **uniquement de GitHub** (workflow `fitila-independent-production.yml`).
- Données, authentification, Storage et Edge Functions : Supabase **FITILA** `dvswhjawiooprghzeyol`.
- Services ASR / ByT5 / TTS / inférence DUNYA : microservices privés du backend FITILA ; ne pas réaffecter un domaine avant les tests de santé de chaque service.
- Reverse proxy public et TLS : VPS contrôlé par FITILA, proxy vers `127.0.0.1:8088` (le conteneur Nginx n'est **jamais** directement exposé sur Internet).
- Les images doivent être accessibles au VPS : configurer un accès GHCR en lecture seule si le package est privé. Ne pas enregistrer de jeton GHCR dans le dépôt.

## Préparation CI/CD

1. GitHub **Environment** `fitila-production` avec approbation humaine obligatoire.
2. Secrets de cet environnement : `FITILA_VPS_HOST`, `FITILA_VPS_USER`, `FITILA_VPS_SSH_KEY`, `FITILA_VPS_KNOWN_HOSTS` (vraie clé hôte épinglée, pas `ssh-keyscan` non contrôlé).
3. Variable `FITILA_SUPABASE_PUBLISHABLE_KEY` : clé **publishable** uniquement. Ne jamais fournir `service_role` au navigateur.
4. Réserver le port `127.0.0.1:8088` ; contrôler que le conteneur nommé `fitila-web` est bien dédié à FITILA. Ne pas exécuter le déploiement si ce nom est utilisé par une autre application.
5. Préparer le reverse proxy (Nginx ou Traefik) et certificats TLS séparément. Conserver l'ancienne application jusqu'à vérification de la nouvelle.
6. Déclencher manuellement le workflow avec `publish_only=true` pour construire l'image sans intervention sur le VPS.
7. Inspecter l'image, vérifier les routes `/app`, `/dico`, `/translator`, `/fitila-ia` et les parcours connexion/déconnexion, puis seulement déployer avec `publish_only=false`.
8. Vérifier que le DNS, OAuth redirect URLs, CORS des microservices, Storage URLs et PWA service worker pointent vers le domaine FITILA et non Lovable.
9. Effectuer un test sans réseau : les packs locaux fonctionnent ; les fonctions distantes déclarent honnêtement leur indisponibilité.

## Risques à auditer avant bascule

- `previewAuthStorage.ts` était un mécanisme Lovable : le client Supabase utilise maintenant localStorage sur le domaine FITILA. Les sessions de navigateur ne migrent **pas** automatiquement entre domaines ; les utilisateurs devront se reconnecter.
- `vite.config.ts` contient un cache service worker ; contrôler les assets et la purge lors de la bascule.
- Le Dockerfile et nginx.conf existaient déjà ; vérifier les montages persistants des packs DUNYA et leur hébergement. Le conteneur seul **ne monte pas** automatiquement les modèles.
- L'existence d'Edge Functions et d'une URL Supabase n'implique pas que Whisper/Omnilingual, ByT5, TTS et Qwen aient migré : valider chaque backend avant de supprimer un hébergement externe.
- La commande Docker remplace le conteneur `fitila-web` et revient à l'image précédente en cas d'échec HTTP local ; elle n'automatise **pas** le basculement DNS ou reverse proxy et ne garantit pas une disponibilité sans interruption.

## Désactivation de Lovable

Seulement après validation fonctionnelle du domaine autonome : retirer tout paramétrage de déploiement Lovable, dissocier l'intégration GitHub de Lovable, supprimer les redirections OAuth Lovable et arrêter les publications Lovable. **Ne supprimer aucun projet ni aucune donnée depuis Lovable tant que la sauvegarde et le test de restauration ne sont pas effectués.**
