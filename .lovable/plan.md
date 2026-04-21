

# Plan — Corriger l'envoi des vocaux (écran blanc) côté élève et enseignant N1/N2

## Diagnostic

Quand un élève ou un enseignant clique sur **Envoyer** un vocal dans une classe N1/N2, l'app affiche un **écran blanc**. Trois causes racines identifiées :

### 🔴 Cause 1 — RLS storage rejette le corrigé personnalisé enseignant (bug principal)
Dans `AnswerReview.tsx` lignes 272–273, le corrigé vocal **personnalisé** s'upload vers :
```
teacher-personal/{answer.id}/{ts}.webm
```
La policy RLS (migration `20260420105920`) n'autorise INSERT que pour 2 préfixes :
- `{auth.uid}/...` (élève)
- `teacher/...` (enseignant)

Le préfixe `teacher-personal/...` **n'est couvert par aucune policy** → Supabase renvoie 403 `new row violates row-level security policy`. L'erreur est attrapée par le `try/catch`, MAIS :

### 🔴 Cause 2 — Toast crashe quand le message est non-string
Dans `VoiceAnswerRecorder` ligne 62 : `description: e.message`. Quand `e.message` est `undefined` (cas RLS avec objet Supabase) ou un objet, certains lecteurs de toast plantent. Combiné à l'absence d'**ErrorBoundary** autour de `UniversalAnswerCard` et `AnswerReview` → tout le sous-arbre React démonte → **écran blanc**.

### 🟡 Cause 3 — Compatibilité navigateur (Safari iOS / vieux Android)
- `useAudioRecorder` passe `{ mimeType }` au constructeur `MediaRecorder` même si non supporté → `NotSupportedError` sur Safari iOS < 14.5
- `getUserMedia` avec `sampleRate: 16000` strict échoue sur certains Android → `OverconstrainedError`
- `recorder.audioBlob.type` peut être `''` sur Safari iOS → `contentType: ''` rejeté côté Storage
- Le helper `getRecorderTimeslice()` retourne 1000ms sur iOS, mais le `requestData()` final n'est pas attendu → blob vide sur iOS si user clique stop puis envoyer trop vite

## Implémentation

### A. Corriger les RLS storage pour `teacher-personal/...` (migration SQL)

Ajouter 3 nouvelles policies sur `storage.objects` du bucket `classe-answers-audio` :
1. **INSERT** : enseignant/admin peut uploader sous `teacher-personal/{answer_id}/...`
2. **DELETE** : idem
3. (SELECT déjà couvert par "Teachers read all answer audio")

```sql
CREATE POLICY "Teachers upload personal correction audio"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher-personal'
  AND public.is_teacher_or_admin(auth.uid())
);

CREATE POLICY "Teachers delete personal correction audio"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'classe-answers-audio'
  AND (storage.foldername(name))[1] = 'teacher-personal'
  AND public.is_teacher_or_admin(auth.uid())
);
```

### B. Renforcer `VoiceAnswerRecorder.tsx` — pas d'écran blanc

1. Wrapper l'intégralité du rendu dans un **ErrorBoundary** local (composant interne) qui affiche un message d'erreur amical au lieu de démonter le parent
2. Normaliser le toast d'erreur :
   ```ts
   const msg = e?.message || (typeof e === 'string' ? e : JSON.stringify(e)) || 'Erreur inconnue';
   toast({ title: '❌ Erreur d\'envoi', description: String(msg).slice(0, 200), variant: 'destructive' });
   ```
3. Garde-fous avant upload :
   - Vérifier `recorder.audioBlob.size > 0` (sinon toast "enregistrement vide" + reset)
   - Forcer `contentType` à `'audio/webm'` ou `'audio/mp4'` si `.type` est vide
4. Catch global autour de `recorder.startRecording()` avec toast spécifique si micro refusé (NotAllowedError, NotFoundError, OverconstrainedError)
5. Bouton **Envoyer** désactivé tant que `audioBlob.size === 0`

### C. Renforcer `useAudioRecorder.ts` — compat tous navigateurs

1. **MediaRecorder construction sécurisée** :
   ```ts
   const mimeType = getSupportedAudioMimeType();
   let mediaRecorder: MediaRecorder;
   try {
     mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
   } catch {
     mediaRecorder = new MediaRecorder(stream); // fallback navigateur défaut
   }
   ```
2. **Contraintes audio assouplies** : passer `sampleRate` et `channelCount` en `ideal` au lieu de strict, fallback sur `{ audio: true }` si `OverconstrainedError`
3. **stopRecording attente flush iOS** : ajouter `await new Promise(r => setTimeout(r, 200))` après `requestData()` avant `stop()` sur iOS
4. **Garantir blob non vide** : si `chunks.length === 0` après stop, `resolve(null)` (déjà fait) — le composant doit alors afficher un toast "réessaye"
5. **Permission micro proactive** : exposer `error` détaillé (`NotAllowedError` → "Micro refusé. Active-le dans les réglages")

### D. Wrapper les zones critiques avec ErrorBoundary

Créer un petit composant réutilisable `src/components/common/SafeBoundary.tsx` (class component) et l'utiliser autour de :
- `<AnswerReview>` dans le dashboard enseignant (PendingGrading, StudentDetail)
- `<UniversalAnswerCard>` dans les leçons N1/N2

Ainsi même si une exception remonte, on voit un message rouge au lieu d'un écran blanc.

### E. Compatibilité Capacitor (mobile natif)

Vérifier dans `AndroidManifest.xml` que `RECORD_AUDIO` est déclaré (déjà mémorisé dans `mem://infrastructure/mobile/apk-permission-config`). Pas de changement code Capacitor requis — le hook `useAudioRecorder` utilise l'API Web standard que Capacitor WebView supporte sur Android 10+ et iOS 14.5+.

## Fichiers

**Migration SQL**
- Nouvelle migration : 2 nouvelles RLS policies pour `teacher-personal/...`

**Modifications**
- `src/components/classe/VoiceAnswerRecorder.tsx` — ErrorBoundary local, toast safe, garde-fous blob, contentType fallback
- `src/hooks/useAudioRecorder.ts` — construction MediaRecorder sécurisée, contraintes ideal, attente flush iOS, gestion erreurs micro

**Nouveaux**
- `src/components/common/SafeBoundary.tsx` — ErrorBoundary réutilisable

**Intégration ErrorBoundary**
- `src/components/teacher/AnswerReview.tsx` — wrap rendu
- `src/components/classe/UniversalAnswerCard.tsx` — wrap rendu
- `src/components/teacher/PendingGrading.tsx` & `StudentDetail.tsx` — wrap chaque carte (sécurité supplémentaire)

## Garanties

- ✅ Élève N1/N2 : envoi vocal réussi sans écran blanc, toast confirmation
- ✅ Enseignant N1/N2 : corrigé vocal **général** (`teacher/...`) ET **personnalisé** (`teacher-personal/...`) fonctionnent
- ✅ Si erreur réseau/permission : message rouge clair, l'app reste utilisable (pas de démontage)
- ✅ Compatible Chrome, Firefox, Edge, Opera, Safari macOS, Safari iOS 14.5+, Android WebView, Capacitor natif
- ✅ Fallback automatique du codec audio selon le navigateur (WebM/Opus, MP4/AAC)
- ✅ ErrorBoundary capture toute exception React et affiche un fallback au lieu d'un écran blanc

## Hors scope

- Transcription IA des vocaux (à demander explicitement)
- Compression côté client des audios > 5 MB (taille raisonnable des réponses < 1 min)

