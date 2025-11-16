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
