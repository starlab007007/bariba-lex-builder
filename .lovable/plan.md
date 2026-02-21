

# Diagnostic complet et corrections FITILA

## Problemes identifies

### 1. CRITIQUE : Les 3 espaces HuggingFace retournent 404

Les URLs des espaces HuggingFace suivants sont **toutes inaccessibles** (erreur 404) :

- **ByT5 Traduction** : `zimesongbian-modele-byt5-bariba-expert-api-v03-improve.hf.space`
- **Baatonum TTS** : `zimesongbian-baatonum-tts-api-v001.hf.space`
- **Baatonum STT** : `zimesongbian-baatonum-asr-stt-api-v001-improve.hf.space`

Meme avec un token HuggingFace valide, les espaces prives restent accessibles si l'URL est correcte. Le 404 signifie que les espaces ont ete renommes, deplaces ou supprimes puis recrees avec d'autres noms.

**Impact** : Toutes les fonctionnalites vocales et de traduction sont cassees (STT bariba, TTS bariba, traduction ByT5). C'est la cause des erreurs "Edge Function returned a non-2xx status code".

**Action requise de votre part** : Fournir les URLs correctes de vos 3 espaces HuggingFace. Pour les trouver :
1. Allez sur https://huggingface.co/settings/spaces
2. Copiez l'URL de chaque espace (traduction, TTS, STT)
3. Partagez-les ici

**Corrections code** : Une fois les URLs fournies, je mettrai a jour :
- Le secret `BYT5_SPACE_URL` (traduction)
- Le secret `HF_SPACE_URL` (TTS)
- L'URL en dur dans `supabase/functions/bariba-stt/index.ts` (ligne 14)
- Les URLs dans `supabase/functions/hf-keep-alive/index.ts` (lignes 11, 15, 19)

---

### 2. UI : Barre grise en bas de l'ecran (au lieu de noir)

Le probleme est dans le composant `KuaishouBottomNav.tsx`. La barre de navigation utilise la variable CSS `--kuaishou-nav-bg` qui est definie en blanc (`0 0% 100%`). Sous l'application, entre la barre de navigation et le bord de l'ecran Android, il y a un espace gris visible.

**Corrections** :
- **index.html** : Ajouter `viewport-fit=cover` dans la balise meta viewport pour que l'app couvre toute la zone d'ecran
- **KuaishouBottomNav.tsx** : Changer le fond de la barre de navigation de blanc a noir pour correspondre au style TikTok
- **index.css** : Mettre a jour `--kuaishou-nav-bg` a noir (`0 0% 0%`) et ajuster les couleurs d'icones pour le fond noir
- **body/html** : Ajouter un fond noir au body pour eliminer la zone grise visible sous la navigation

---

### 3. APK : Avertissement "non securise"

Cet avertissement est **normal** pour un APK en mode debug (non signe avec un certificat de release). Ce n'est pas un bug de l'application.

**Corrections** :
- Ajouter `android:usesCleartextTraffic="false"` dans la configuration Capacitor pour bloquer les connexions non securisees
- Mettre a jour `capacitor.config.ts` avec les options de securite Android
- Fournir les instructions pour signer l'APK avec un keystore de release

---

### 4. Performance : Optimisations generales

**Corrections** :
- Ajouter `React.memo` et du lazy loading aux composants lourds (feed cards, camera)
- Optimiser les animations Framer Motion (reduire les re-renders)
- Ajouter des preconnexions aux domaines HuggingFace dans `index.html`

---

## Plan technique detaille

### Fichiers a modifier

| Fichier | Changement |
|---------|-----------|
| `index.html` | Ajouter `viewport-fit=cover`, fond noir sur body, preconnexions HF |
| `src/index.css` | Changer `--kuaishou-nav-bg` en noir, ajuster couleurs d'icones nav |
| `src/components/tamtam/KuaishouBottomNav.tsx` | Style navigation noir, icones blancs |
| `capacitor.config.ts` | Ajouter options de securite Android |
| `supabase/functions/bariba-stt/index.ts` | Mettre a jour l'URL du Space STT (apres reception de la bonne URL) |
| `supabase/functions/hf-keep-alive/index.ts` | Mettre a jour les 3 URLs des Spaces (apres reception des bonnes URLs) |

### Secrets a mettre a jour (apres reception des URLs)

| Secret | Usage |
|--------|-------|
| `BYT5_SPACE_URL` | URL espace traduction ByT5 |
| `HF_SPACE_URL` | URL espace TTS Baatonum |

### Ce qui sera corrige immediatement (sans attendre les URLs)

1. Barre grise en bas -> fond noir style TikTok
2. Viewport cover pour eliminer les espaces vides sur mobile
3. Configuration securite APK
4. Optimisations performance

### Ce qui necessite votre action

Les 3 URLs correctes de vos espaces HuggingFace prives. Sans ces URLs, la traduction, la voix et la transcription resteront inoperantes.

