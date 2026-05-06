
# Plan : SEO avancé + Branding complet Fitila

## Objectif
Faire en sorte que la recherche "fitila" sur Google affiche des résultats riches similaires à TikTok (logo, description, sitelinks) et supprimer toute trace de Lovable.

---

## 1. Générer le logo Fitila
- Créer un logo Fitila professionnel (fond transparent) pour favicon, OG image, et affichage in-app
- Générer une OG image (1200x630) pour les partages sociaux
- Remplacer les icônes PWA existantes (192px, 512px)

## 2. SEO structuré (JSON-LD) pour résultats riches Google
Ajouter dans `index.html` les schémas structurés :
- **Organization** : nom, logo, URL, réseaux sociaux
- **WebSite** avec **SearchAction** (pour la barre de recherche Google)
- **SiteNavigationElement** : liens vers les sections clés (Dictionnaire, Apprendre, Traducteur, Fitila IA, Radio) — ce sont les "sitelinks" que Google affichera

## 3. Métadonnées SEO optimisées
- Titre optimisé : "FITILA - Langue Bariba, Culture & IA | fitila.bj"
- Description riche avec mots-clés : bariba, culture, apprendre, dictionnaire, IA
- Canonical URL vers fitila.bj
- `og:url`, `og:site_name` complets
- Twitter metadata complète

## 4. Fichiers SEO techniques
- **sitemap.xml** : toutes les routes principales
- **robots.txt** : ajouter référence au sitemap
- **manifest.webmanifest** : recréer avec branding Fitila

## 5. Supprimer toute référence Lovable
- Retirer le commentaire "Lovable Cloud" dans `index.html`
- Le badge est déjà masqué
- Les fichiers internes (services, hooks) qui mentionnent "lovable" dans des commentaires techniques ne sont pas visibles par les utilisateurs, donc pas prioritaires

## Détails techniques

### JSON-LD Organization
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "FITILA",
  "url": "https://fitila.bj",
  "logo": "https://fitila.bj/fitila-logo.png",
  "description": "Plateforme de promotion de la langue Bariba..."
}
```

### JSON-LD WebSite + SearchAction
```json
{
  "@type": "WebSite",
  "url": "https://fitila.bj",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://fitila.bj/fitila/dictionary?q={search_term_string}"
  }
}
```

### JSON-LD SiteNavigationElement
Liens : Dictionnaire Bariba, Apprendre le Bariba, Traducteur, Fitila IA, Radio Bariba, Clavier Bariba

### Fichiers modifiés
- `index.html` — meta tags + JSON-LD + suppression mentions Lovable
- `public/robots.txt` — ajout sitemap
- `public/sitemap.xml` — nouveau
- `public/manifest.webmanifest` — recréé
- Images générées : logo, OG image, icônes PWA
