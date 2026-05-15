# Plan : MoMo Demo + Radar IA automatique + WhatsApp WAHA

## Contexte
Recherche dans le code : il n'y a **aucun module "Radar IA" existant**, ni table `radar_signals`, `annonces`, `acheteurs`, ni système de paiement MoMo. Seule la table `tamtam_products` existe. Avant d'implémenter, je dois confirmer les hypothèses ci-dessous.

## Partie 1 — Numéro MTN MoMo demo

Créer un système de paiement mock côté edge function :

- Table `momo_demo_wallets` (numéro `0191299191`, solde initial `10 000 000 XOF`).
- Edge function `momo-pay` :
  - Si `phone === '0191299191'` → succès garanti, débite le solde demo (sans descendre sous 0, ou ignore si insuffisant en mode demo permanent).
  - Sinon → renvoie `{success: false, message: "Numéro non démo"}` (pas d'intégration MoMo réelle pour l'instant).
- Hook React `useMomoPayment(phone, amount)` à brancher sur le bouton "Payer" du module Market / annonces.

> **Question ouverte** : sur quel écran/bouton précis du flux brancher ce paiement ? (par défaut je l'intègre sur le checkout `tamtam_products`).

## Partie 2 — Radar IA → annonces / acheteurs

Comme aucun module "Radar IA" n'existe, je propose la structure suivante :

### Schéma DB
- `radar_signals` (raw) : `id`, `raw_text`, `source`, `phone`, `name`, `created_at`, `processed boolean`.
- `annonces` (vendeurs) : `id`, `title`, `description`, `seller_name`, `seller_phone`, `category`, `price`, `source_signal_id`, `created_at`.
- `acheteurs` (demandes) : `id`, `query`, `buyer_name`, `buyer_phone`, `category`, `budget`, `source_signal_id`, `created_at`.
- RLS : lecture publique, insert via edge function (service role).

### Edge function `radar-ia-process`
1. Trigger : cron `pg_cron` toutes les 5 min sur signaux `processed = false`.
2. Pour chaque signal :
   - Appel **Lovable AI** (`google/gemini-2.5-flash`) avec prompt structuré → JSON `{type: 'offer'|'demand', name, phone, category, title, description, price?}`.
   - Insert dans `annonces` ou `acheteurs` selon `type`.
   - Marque `processed = true`.
3. Si `phone` détecté valide → déclenche `whatsapp-notify`.

### Edge function `whatsapp-notify` (WAHA)
- Lit `WAHA_BASE_URL` + `WAHA_API_KEY` + `WAHA_SESSION` (secrets à ajouter).
- POST `${WAHA_BASE_URL}/api/sendText` body `{session, chatId: phone+"@c.us", text}`.
- Message FR : confirmation que l'annonce/demande a été enregistrée + lien.

### UI
- Page `/radar-ia` : liste des signaux bruts + boutons "Reprocess".
- Sections "Annonces" et "Acheteurs" déjà visibles (pages séparées + onglets dans Tamtam Market).

## Partie 3 — Secrets requis
- `WAHA_BASE_URL`, `WAHA_API_KEY`, `WAHA_SESSION` → tool `add_secret` après confirmation.

## Étapes de livraison
1. Migration : tables `momo_demo_wallets`, `radar_signals`, `annonces`, `acheteurs` + RLS.
2. Edge functions : `momo-pay`, `radar-ia-process`, `whatsapp-notify`.
3. Cron pg_cron sur `radar-ia-process`.
4. UI : page `/radar-ia` (liste + reprocess), onglets Annonces/Acheteurs dans Market, intégration `useMomoPayment` au checkout.
5. Secrets WAHA via `add_secret`.

## Questions à confirmer avant implémentation
1. **Source des signaux Radar IA** : comment arrivent-ils dans `radar_signals` ? (saisie manuelle, scraping, webhook externe, audio transcrit ?). Sans cette source, la table restera vide.
2. **Bouton MoMo** : confirmer que le checkout cible est `tamtam_products` (annonces Market).
3. **Format message WhatsApp** : valider un template type "Bonjour {name}, votre annonce '{title}' a bien été enregistrée sur Fitila."
4. **Secrets WAHA prêts** ? (URL instance, API key, nom de session)
