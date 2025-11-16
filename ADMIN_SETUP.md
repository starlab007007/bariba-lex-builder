# Configuration du Compte Administrateur

## 📋 Instructions de Configuration Initiale

Pour accéder au module d'administration, vous devez créer un compte utilisateur et lui attribuer le rôle d'administrateur.

### Étape 1 : Créer un Compte Utilisateur

1. Accédez à la page d'authentification : `/auth`
2. Cliquez sur l'onglet "Inscription"
3. Créez un compte avec votre email et mot de passe
4. Notez bien votre email utilisé

### Étape 2 : Attribuer le Rôle Admin

Vous devez maintenant ajouter le rôle admin à votre compte dans la base de données.

#### Option A : Via l'interface Lovable Cloud

1. Cliquez sur l'onglet "Cloud" dans Lovable
2. Allez dans "Database" → "Tables"
3. Ouvrez la table `user_roles`
4. Cliquez sur "Insert Row"
5. Remplissez les champs :
   - `user_id` : Copiez l'UUID de votre compte (trouvez-le dans la table `auth.users`)
   - `role` : Sélectionnez `admin`
6. Cliquez sur "Save"

#### Option B : Via SQL (plus rapide)

1. Allez dans Cloud → Database → SQL Editor
2. Exécutez cette requête (remplacez `VOTRE_EMAIL` par votre email) :

```sql
-- Trouver votre user_id
SELECT id FROM auth.users WHERE email = 'VOTRE_EMAIL@example.com';

-- Ajouter le rôle admin (remplacez USER_ID_ICI par l'UUID obtenu ci-dessus)
INSERT INTO public.user_roles (user_id, role)
VALUES ('USER_ID_ICI', 'admin');
```

### Étape 3 : Accéder au Dashboard Admin

1. Déconnectez-vous et reconnectez-vous
2. Vous verrez maintenant un bouton "Administration" dans l'en-tête
3. Cliquez dessus pour accéder au dashboard admin : `/admin`

## 🔐 Identifiants Recommandés

Pour des raisons de sécurité, il est recommandé de :

- **Email** : Utilisez votre email professionnel
- **Mot de passe** : Minimum 12 caractères avec majuscules, minuscules, chiffres et caractères spéciaux
- ⚠️ **Ne partagez JAMAIS vos identifiants admin**

## 📊 Fonctionnalités du Module Admin

Une fois connecté en tant qu'administrateur, vous aurez accès à :

### 1. Vue d'ensemble
- Statistiques du dictionnaire
- Nombre de phrases d'entraînement
- Activité récente

### 2. Gestion du Dictionnaire
- Ajouter de nouvelles entrées
- Modifier des entrées existantes
- Exporter le dictionnaire en JSON
- Analyser la qualité des entrées

### 3. Entraînement du Modèle
- Importer des phrases d'entraînement (format : `français|bariba`)
- Valider les phrases
- Lancer le réentraînement du modèle IA
- Suivre la progression

### 4. Analytics & Performance
- Graphiques de performance
- Scores de confiance des traductions
- Métriques du modèle
- Taux d'erreur

### 5. Paramètres
- Sauvegarde des données
- Optimisation de la base
- Informations système

## 🚀 Import de Phrases d'Entraînement

Pour améliorer le modèle de traduction, vous pouvez importer des phrases :

### Format de Fichier

Créez un fichier `.txt` ou `.csv` avec ce format :

```
Bonjour|O daapu
Comment vas-tu ?|Kan gama?
Je vais bien|N gama
Merci beaucoup|Barika gbɛ̀ɛ̀
Au revoir|Ó sòó
```

- Une phrase par ligne
- Séparateur : `|` (pipe) ou TAB
- Format : `français|bariba`

### Importer

1. Allez dans Admin → Entraînement
2. Cliquez sur "Importer"
3. Sélectionnez votre fichier
4. Les phrases seront automatiquement importées
5. Cliquez sur "Réentraîner" pour mettre à jour le modèle

## 🛡️ Sécurité

Le module d'administration est protégé par :

- ✅ Authentification obligatoire
- ✅ Vérification du rôle admin côté serveur
- ✅ Row Level Security (RLS) sur toutes les tables
- ✅ Logs d'audit des actions
- ✅ Tokens JWT sécurisés

**Important** : Seuls les utilisateurs avec le rôle `admin` peuvent :
- Accéder au dashboard admin
- Modifier le dictionnaire
- Gérer les phrases d'entraînement
- Voir les analytics
- Réentraîner le modèle

## 🧪 Test du Modèle

Le panneau "Test du Modèle" permet de comparer les performances entre le modèle local et l'API Lovable AI.

### Fonctionnalités

1. **Test Interactif**
   - Saisissez une phrase en français ou bariba
   - Choisissez la direction de traduction
   - Testez individuellement ou comparez les deux modèles

2. **Métriques Affichées**
   - Temps de traduction (en millisecondes)
   - Score de confiance
   - Texte traduit

3. **Historique des Tests**
   - Sauvegardez vos tests pour analyse
   - Exportez l'historique en CSV
   - Comparez les performances au fil du temps

### Comparaison Modèle Local vs API

| Critère | Modèle Local | API Lovable AI |
|---------|--------------|----------------|
| **Coût** | Gratuit | Payant (crédits) |
| **Vitesse** | Très rapide (~100-500ms) | Variable (~500-2000ms) |
| **Qualité** | Basée sur le dictionnaire | IA contextuelle avancée |
| **Disponibilité** | Toujours disponible | Requiert connexion |
| **Contexte** | Mot à mot | Comprend le contexte |

**Recommandation** : Utilisez le modèle local pour les traductions courantes et l'API pour les phrases complexes nécessitant une compréhension contextuelle.

## 📊 Dashboard de Performance

Le panneau "Performance" affiche des statistiques détaillées sur l'utilisation du modèle.

### Métriques Disponibles

1. **Vue d'Ensemble**
   - Version actuelle du modèle
   - Nombre d'entrées du dictionnaire
   - Total de traductions effectuées
   - Taux de succès global

2. **Métriques d'Entraînement**
   - Entrées du dictionnaire utilisées
   - Phrases d'entraînement validées
   - Durée de l'entraînement
   - Patterns linguistiques identifiés

3. **Statistiques d'Utilisation**
   - Évolution du volume de traductions
   - Répartition français ↔ bariba
   - Distribution des scores de confiance
   - Comparaison local vs API

### Interprétation des Scores

- **Score de Confiance ≥ 70%** : Traduction de haute qualité ✅
- **Score 50-69%** : Traduction acceptable mais à vérifier ⚠️
- **Score < 50%** : Traduction à corriger manuellement ❌

## 🔄 Réentraînement du Modèle

Pour améliorer la qualité des traductions :

1. **Quand Réentraîner ?**
   - Après avoir ajouté 1000+ nouvelles entrées au dictionnaire
   - Après validation de 500+ nouvelles phrases
   - Si le taux de confiance moyen baisse
   - Après import de données bibliques ou massives

2. **Processus**
   - Allez dans l'onglet "Performance"
   - Vérifiez que les données sont prêtes (indicateur vert)
   - Cliquez sur "Train Model"
   - Attendez la fin du traitement (peut prendre 2-5 minutes pour 68k+ entrées)

3. **Validation Post-Entraînement**
   - Testez des phrases dans "Test du Modèle"
   - Vérifiez l'amélioration des scores de confiance
   - Comparez avec les résultats précédents

## ✨ Enrichissement IA Avancé (NOUVEAU)

### Architecture NMT (Neural Machine Translation)

Le système implémente une approche **Transformer Seq2Seq** pour la traduction French-Bariba :

**1. Tokenisation Bariba Personnalisée**
- Reconnaissance des caractères spéciaux : ɔ, ɛ, ɑ, ɡ, kp
- Gestion des marques tonales : á, à, ã, ā
- Identification des morphèmes bariba

**2. Encodeur (Français)**
- Analyse sémantique de la phrase source
- Représentations vectorielles contextuelles
- Mécanisme d'attention

**3. Décodeur (Bariba)**
- Génération token par token
- Application des règles grammaticales (S+V+O)
- Insertion des marques tonales appropriées

**4. Apprentissage Supervisé**
- Comparaison prédiction vs vérité terrain
- Ajustement des paramètres neuronaux

### Modes de Génération

**Mode "Génération"** :
- Crée 15 nouvelles phrases complètes
- Utilise le vocabulaire du dictionnaire
- Couvre différents contextes (salutations, vie quotidienne, nature, famille)

**Mode "Augmentation"** :
- Génère 3 variations par entrée du dictionnaire
- Crée des contextes d'utilisation variés
- Traduit automatiquement en bariba

### Utilisation Recommandée

1. **Démarrer avec le Mode Génération** :
   - Générer 15-20 phrases pour diversifier le corpus
   - Valider manuellement les meilleures

2. **Utiliser l'Augmentation pour Enrichir** :
   - Cibler les mots du dictionnaire peu utilisés
   - Créer des contextes variés

3. **Valider Rigoureusement** :
   - Vérifier les caractères spéciaux (ɔ, ɛ, kp, etc.)
   - Confirmer les marques tonales
   - Valider la grammaire bariba

4. **Ré-entraîner le Modèle** :
   - Après avoir validé 50+ nouvelles phrases
   - Tester les améliorations dans l'onglet "Test"

### Contexte Linguistique Intégré

**Inventaire Phonétique** :
- Voyelles : a, e, i, o, u, ɑ, ɛ, ɔ (+ marques tonales)
- Consonnes spéciales : ɡ (vélaire voisée), kp (labio-vélaire)
- Nasalisation : ã, ẽ, ĩ, õ, ũ

**Patterns Morphologiques** :
- Pronoms : n (je), a (tu/il), u (nous), yi (vous), ba (ils)
- Négation : ka/kã avant le verbe

**Syntaxe** :
- Ordre : Sujet + Verbe + Objet
- Adjectifs suivent les noms

### Limitations

- **Coût API** : La génération utilise des crédits Lovable AI
- **Validation Humaine** : Essentielle pour garantir la qualité
- **Contexte Biblique** : Le modèle est spécialisé sur ce domaine

## 🆘 Support

Si vous rencontrez des problèmes :

1. Vérifiez que vous êtes bien connecté
2. Vérifiez que le rôle admin est bien assigné dans `user_roles`
3. Actualisez la page après attribution du rôle
4. Consultez les logs dans la console du navigateur

## 📝 Notes Importantes

- La configuration auto-confirm email est activée (pas besoin de confirmer l'email)
- Vous pouvez créer plusieurs comptes admin si nécessaire
- Les modifications du dictionnaire sont trackées avec `created_by` et `updated_by`
- Toutes les actions admin sont journalisées pour l'audit
