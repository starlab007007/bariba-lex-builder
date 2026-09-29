// Portage fidèle du Hub Apprendre (`apprendre_hub.dart`, branche
// feat/apprendre-v2.4-build19-20260927) — écran d'accueil du module,
// assemble tous les écrans déjà portés et vérifiés (Séance, Révision,
// Scènes, Fondation) autour du contenu chargé via `useApprendreContent()`
// (Supabase d'abord, repli JSON embarqué sinon — voir `contentLoader.ts`).
//
// Référence : apprendre_v24_spec.md §11 (liste exacte des 11 sections et
// leurs conditions d'affichage — suivie ici dans l'ordre, section par
// section, avec les libellés et seuils exacts).
//
// Composant autonome, prêt à monter : ne touche pas au routage existant
// (`FitilaLearn.tsx` reste l'écran actuellement en ligne — le remplacement
// est une décision produit à valider par l'utilisateur, hors périmètre de
// ce portage). `onOpenVoiceStudio`/`onOpenVoiceReview`/`onOpenProgress`
// sont de simples callbacks optionnels : cet écran ne décide pas où ces
// actions mènent (pas d'écran `ApProgressScreen` porté, et « Studio Voix »/
// « Validation voix » restent dans `ApprendreVoiceAdmin.tsx`, existant).

import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft, BrainCog, ChevronRight, SlidersHorizontal, Flame, Zap, Eye, Languages, TextCursor, Copy, Clock, Shuffle, Mic,
  GraduationCap, ShieldCheck, Sparkles, TrendingUp, Volume2, type LucideIcon,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import type { ApFoundation, ApTheme } from '@/lib/apprendre/content';
import { ApprendreStore } from '@/lib/apprendre/store';
import { ScenesProgress } from '@/lib/apprendre/scenes';
import { ApSessionPlanner, skillsFor } from '@/lib/apprendre/planner';
import { type ApSkillIconName, skillIconName } from '@/lib/apprendre/session';
import { skillLabel } from '@/lib/apprendre/tasks';
import { useApprendreContent } from '@/lib/apprendre/contentLoader';
import { useApVoiceAccess } from '@/hooks/useApVoiceAccess';
import { useApprendrePublishedAudio } from '@/components/fitila/BaribaAudioText';
import { AP_COLORS } from './apColors';
import {
  ApHubCardBox, ApHubPill, ApHubPrimaryButton, ApHubSectionTitle,
  ApGuideHero, ApDailySessionCard, ApDueTile, ApFoundationTile, ApThemeTile,
  ApScenesEntryCard, ApProverbCard, ApLinkChip,
} from './ApHubSections';
import ApSessionScreen from './ApSessionScreen';
import ApReviewScreen from './ApReviewScreen';
import ApScenesHubScreen from './ApScenesHubScreen';
import ApFoundationScreen from './ApFoundationScreen';
import ApOnboardingScreen from './ApOnboardingScreen';
import { PageSkeleton } from '@/components/fitila/FitilaUi';

const SKILL_ICON_COMPONENTS: Record<ApSkillIconName, LucideIcon> = {
  eye: Eye,
  languages: Languages,
  'text-cursor': TextCursor,
  copy: Copy,
  clock: Clock,
  shuffle: Shuffle,
  mic: Mic,
  'graduation-cap': GraduationCap,
};
function skillIconFor(skill: string): LucideIcon {
  return SKILL_ICON_COMPONENTS[skillIconName(skill)];
}

export interface ApHubScreenProps {
  onBack?: () => void;
  /** Ouvre l'écran Studio Voix existant (`ApprendreVoiceAdmin.tsx`) — non fourni = chip masqué même si le rôle le permettrait. */
  onOpenVoiceStudio?: () => void;
  /** Ouvre l'écran de validation voix existant — même remarque. */
  onOpenVoiceReview?: () => void;
  /** Aucun `ApProgressScreen` n'est porté côté web : callback optionnel, chip toujours visible mais sans action par défaut. */
  onOpenProgress?: () => void;
  /** Liens legacy injectés par l'appelant (équivalent de `widget.links` côté Dart). */
  extraLinks?: { label: string; icon?: LucideIcon; onClick: () => void }[];
  /** Route canonique Web correspondante au sous-écran Flutter. */
  routePath?: string;
  /** Synchronise les overlays internes avec l'URL Web canonique. */
  onNavigate?: (path: string) => void;
}

type Overlay =
  | { kind: 'daily' }
  | { kind: 'review' }
  | { kind: 'scenes' }
  | { kind: 'foundation'; unit: ApFoundation }
  | { kind: 'onboarding' };

export default function ApHubScreen({ onBack, onOpenVoiceStudio, onOpenVoiceReview, onOpenProgress, extraLinks, routePath, onNavigate }: ApHubScreenProps) {
  const { data, isLoading, error, refetch } = useApprendreContent();
  const voiceAccess = useApVoiceAccess();
  const { data: audioManifest } = useApprendrePublishedAudio();
  const { user } = useAuth();

  // `store`/`scenesProgress` sont ouverts une seule fois (localStorage) et
  // reconstruits après chaque retour de séance pour refléter la progression
  // fraîchement mutée par `ApSessionRunner`/`ScenesProgress.recordScore`
  // (même logique que `ApReviewScreen`/`ApScenesHubScreen`, voir leur `now`/`gen`).
  const [store] = useState(() => ApprendreStore.open());
  const [scenesProgress] = useState(() => ScenesProgress.open());
  const [refreshKey, setRefreshKey] = useState(0);
  const [overlay, setOverlay] = useState<Overlay | null>(null);

  const closeOverlay = () => {
    setOverlay(null);
    onNavigate?.('/learn');
    setRefreshKey((k) => k + 1); // relit `store.progress`/`scenesProgress` pour les compteurs du Hub
  };

  // Recalculés à chaque fermeture d'overlay (`refreshKey`) et dépendants du
  // contenu chargé — `void refreshKey` ci-dessous n'est qu'un marqueur de
  // dépendance volontaire, `store.progress` étant muté en place (pas un
  // nouvel objet), useMemo ne le détecterait pas sans cette clé.
  const now = useMemo(() => Date.now(), [refreshKey]);
  const content = data?.content;
  const scenesContent = data?.scenesContent;
  const planner = useMemo(() => (content ? new ApSessionPlanner(content) : null), [content]);

  const progress = store.progress;
  // Le profil implicite du module est 'fr' quand jamais configuré (spec §11,
  // note d'onboarding) — l'onboarding lui-même (`ApOnboardingScreen`) n'est
  // pas porté côté web ; on ne fait ici que reproduire son repli, sans
  // ouvrir d'écran de configuration.
  const profile = progress.profile ?? 'fr';
  const due = content ? progress.dueCardIds(now) : [];
  const nextFoundation = content?.foundations.find((f) => !progress.foundationDone(f.id));
  const activeSkills = skillsFor(profile);

  const startDaily = () => { onNavigate?.('/learn/daily'); setOverlay({ kind: 'daily' }); };
  const openReview = () => { onNavigate?.('/learn/review'); setOverlay({ kind: 'review' }); };
  const openScenes = () => { onNavigate?.('/learn/scenes'); setOverlay({ kind: 'scenes' }); };
  const openFoundation = (unit: ApFoundation) => { onNavigate?.('/learn/foundations/' + unit.id); setOverlay({ kind: 'foundation', unit }); };

  // Comme Flutter : profil jamais choisi → l'onboarding s'ouvre une fois au premier affichage.
  const [onboardingShown, setOnboardingShown] = useState(false);
  useEffect(() => {
    if (content && store.progress.profile == null && !onboardingShown && !routePath?.match(/\/learn\/.+/)) {
      setOnboardingShown(true);
      setOverlay({ kind: 'onboarding' });
    }
  }, [content, onboardingShown, store, routePath]);

  useEffect(() => {
    if (!routePath || !content) return;
    if (routePath.endsWith('/daily')) setOverlay({ kind: 'daily' });
    else if (routePath.endsWith('/review')) setOverlay({ kind: 'review' });
    else if (routePath.endsWith('/scenes')) setOverlay({ kind: 'scenes' });
    else {
      const match = routePath.match(/\/learn\/foundations\/([^/]+)/);
      if (match) {
        const unit = content.foundations.find((f) => f.id === decodeURIComponent(match[1]));
        if (unit) setOverlay({ kind: 'foundation', unit });
      } else if (routePath === '/learn' || routePath === '/') {
        setOverlay((o) => (o?.kind === 'onboarding' ? o : null));
      }
    }
  }, [routePath, content]);

  const finishOnboarding = (choice: { profile: string; direction: string } | null) => {
    store.progress.profile = choice?.profile ?? store.progress.profile ?? 'fr';
    if (choice) store.progress.direction = choice.direction;
    store.save();
    setOverlay(null);
    setRefreshKey((k) => k + 1);
  };
  if (overlay?.kind === 'onboarding' && content) {
    return (
      <ApOnboardingScreen
        profiles={content.raw.profiles}
        initialProfile={store.progress.profile}
        initialDirection={store.progress.direction}
        onDone={finishOnboarding}
      />
    );
  }

  if (overlay?.kind === 'daily' && planner) {
    return (
      <ApSessionScreen
        title="Séance du jour"
        tasks={planner.dailySession(progress, now)}
        store={store}
        sessionKey="seance_du_jour"
        onClose={closeOverlay}
      />
    );
  }
  if (overlay?.kind === 'review' && content) {
    return <ApReviewScreen content={content} store={store} onBack={closeOverlay} />;
  }
  if (overlay?.kind === 'scenes' && scenesContent) {
    return <ApScenesHubScreen content={scenesContent} progress={scenesProgress} store={store} onBack={closeOverlay} />;
  }
  if (overlay?.kind === 'foundation' && content) {
    return <ApFoundationScreen unit={overlay.unit} content={content} store={store} onBack={closeOverlay} />;
  }

  if (isLoading) {
    return (
      <div className="h-full" style={{ backgroundColor: AP_COLORS.ivory }}>
        <PageSkeleton />
      </div>
    );
  }
  if (error || !content || !scenesContent) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center" style={{ backgroundColor: AP_COLORS.ivory }}>
        <p className="text-sm" style={{ color: AP_COLORS.ink }}>Le contenu Apprendre n’a pas pu être chargé.</p>
        <button onClick={() => refetch()} className="rounded-full px-4 py-2 text-sm font-bold" style={{ backgroundColor: AP_COLORS.gold, color: AP_COLORS.goldInk }}>
          Réessayer
        </button>
      </div>
    );
  }

  const hour = new Date(now).getHours();
  const greeting = hour < 12 ? 'A kpuna n do ?' : 'Mɛɛribu';
  const greetingSub = hour < 12 ? '« As-tu bien dormi ? » — le salut du matin' : 'Apprendre le bàátɔ̀nú et le français';

  const proverbs = content.raw.proverbs;
  const proverb = proverbs.length > 0 ? proverbs[new Date(now).getDate() % proverbs.length] : undefined;

  return (
    <div className="h-full overflow-y-auto" style={{ backgroundColor: AP_COLORS.ivory }}>
      <div className="mx-auto max-w-[900px] px-5 pb-10 pt-4">
        <div className="mb-4 flex min-h-12 items-center pl-14">
          <div className="min-w-0">
            <h1 className="truncate text-[22px] font-black leading-tight" style={{ color: AP_COLORS.ink }}>Apprendre</h1>
            <p className="truncate text-[13px]" style={{ color: AP_COLORS.muted }}>Mɛɛribu · bàátɔ̀nú ⇄ français</p>
          </div>
          <button
            type="button"
            onClick={() => setOverlay({ kind: 'onboarding' })}
            aria-label="Profil et sens d’apprentissage"
            title="Profil et sens d’apprentissage"
            className="ml-auto flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border bg-white"
            style={{ borderColor: AP_COLORS.line, color: AP_COLORS.ink }}
          >
            <SlidersHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* 1. En-tête de salutation */}
        <div className="flex items-start gap-3">
          {onBack && (
            <button onClick={onBack} aria-label="Retour" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
              <ArrowLeft className="h-5 w-5" style={{ color: AP_COLORS.ink }} />
            </button>
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate text-2xl font-bold" style={{ color: AP_COLORS.ink }}>{greeting}</p>
            <p className="mt-0.5 truncate text-sm" style={{ color: AP_COLORS.muted }}>{greetingSub}</p>
          </div>
          <ApHubPill label={`${progress.streak} j`} icon={Flame} background={AP_COLORS.clayTint} foreground={AP_COLORS.clayInk} />
        </div>

        {/* 2. _GuideHero */}
        <div className="mt-4">
          {nextFoundation ? (
            <ApGuideHero
              title={nextFoundation.title_fr}
              subtitle={`Fondation ${nextFoundation.order} · ${nextFoundation.minutes} min`}
              action="Commencer"
              onTap={() => openFoundation(nextFoundation)}
            />
          ) : (
            <ApGuideHero
              title="Toutes les fondations sont validées"
              subtitle="Continue avec le vocabulaire et les scènes"
              action={due.length === 0 ? 'Séance du jour' : 'Réviser mes mots'}
              onTap={due.length === 0 ? startDaily : openReview}
            />
          )}
        </div>

        {/* 3. _DailySessionCard */}
        <div className="mt-4">
          <ApDailySessionCard skills={activeSkills} skillIcon={skillIconFor} skillLabelFor={skillLabel} onStart={startDaily} />
        </div>

        {/* 4. Section Révision */}
        <ApHubSectionTitle
          title="Révision"
          trailing={
            <button onClick={openReview} className="text-[13px] font-bold" style={{ color: AP_COLORS.goldDeep }}>
              {due.length === 0 ? 'Ouvrir' : `${due.length} mots · tout voir`}
            </button>
          }
        />
        {due.length === 0 ? (
          <ApHubCardBox onClick={openReview}>
            <div className="flex items-center gap-3">
              <BrainCog className="h-5 w-5 shrink-0" style={{ color: AP_COLORS.goldDeep }} />
              <p className="flex-1 text-sm" style={{ color: AP_COLORS.inkSoft }}>
                {progress.seenWords === 0
                  ? 'Tes premiers mots apparaîtront ici après ta première séance.'
                  : `Aucun mot ne s’efface aujourd’hui. Bravo ! ${progress.activeWords} mots actifs sur ${progress.seenWords} vus.`}
              </p>
              <ChevronRight className="h-5 w-5 shrink-0" style={{ color: AP_COLORS.muted }} />
            </div>
          </ApHubCardBox>
        ) : (
          <div className="space-y-2">
            {due.slice(0, 3).map((id) => {
              const card = content.cards.get(id);
              if (!card) return null;
              const retention = progress.srs[id]?.retention(now) ?? 0;
              return <ApDueTile key={id} ba={card.ba} fr={card.fr} retention={retention} onTap={openReview} />;
            })}
            <div className="pt-1">
              <ApHubPrimaryButton label="Réviser maintenant" icon={Zap} onClick={openReview} />
            </div>
          </div>
        )}

        {/* 5. Fondations */}
        <ApHubSectionTitle title="Fondations" trailing={<span className="text-[13px]" style={{ color: AP_COLORS.muted }}>{progress.foundationsDone}/{content.foundations.length}</span>} />
        <div className="flex gap-2.5 overflow-x-auto pb-1">
          {content.foundations.map((unit) => (
            <ApFoundationTile
              key={unit.id}
              unit={unit}
              done={progress.foundationDone(unit.id)}
              current={unit.id === nextFoundation?.id}
              onTap={() => openFoundation(unit)}
            />
          ))}
        </div>

        {/* 6. Vocabulaire */}
        <ApHubSectionTitle title="Vocabulaire" />
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          {content.themes.map((theme: ApTheme) => (
            <ApThemeTile
              key={theme.id}
              theme={theme}
              learned={progress.learnedIn(theme)}
              onTap={() => onNavigate?.('/learn/themes/' + theme.id)}
            />
          ))}
        </div>

        {/* 7. Scènes de vie */}
        <ApHubSectionTitle title="Scènes de vie" />
        <ApScenesEntryCard onOpen={openScenes} />

        {/* 8. Sagesse (seulement si des proverbes existent) */}
        {proverb && (
          <div className="mt-4">
            <ApProverbCard proverb={proverb} />
          </div>
        )}

        {/* 9. Bandeau voix hors-ligne (seulement si une voix de référence est publiée) */}
        {audioManifest && audioManifest.size > 0 && (
          <div className="mt-4 flex items-center gap-2.5 rounded-2xl border px-3.5 py-2.5" style={{ borderColor: AP_COLORS.line, backgroundColor: AP_COLORS.surface }}>
            <Volume2 className="h-4 w-4 shrink-0" style={{ color: AP_COLORS.goldDeep }} />
            <p className="text-[12.5px]" style={{ color: AP_COLORS.inkSoft }}>
              {audioManifest.size} texte{audioManifest.size > 1 ? 's' : ''} avec voix de référence, disponibles hors-ligne une fois écoutés.
            </p>
          </div>
        )}

        {/* 10. Mon parcours */}
        <ApHubSectionTitle title="Mon parcours" />
        <div className="flex flex-wrap gap-2">
          {voiceAccess.speaker && onOpenVoiceStudio && <ApLinkChip label="Studio Voix" icon={Mic} onTap={onOpenVoiceStudio} />}
          {voiceAccess.reviewer && onOpenVoiceReview && <ApLinkChip label="Validation voix" icon={ShieldCheck} onTap={onOpenVoiceReview} />}
          <ApLinkChip label="Révision" icon={Sparkles} onTap={openReview} />
          <ApLinkChip label="Scènes de vie" icon={Volume2} onTap={openScenes} />
          <ApLinkChip label="Ma progression" icon={TrendingUp} onTap={onOpenProgress ?? (() => {})} />
          {(extraLinks ?? []).map((link) => (
            <ApLinkChip key={link.label} label={link.label} icon={link.icon ?? Sparkles} onTap={link.onClick} />
          ))}
        </div>

        {/* 11. Mention de source */}
        <p className="mt-6 text-center text-[11px]" style={{ color: AP_COLORS.muted }}>
          Formes bariba issues du dictionnaire bariba-français (page citée sur chaque mot). Les tons et prononciations
          restent à confirmer par des locuteurs référents.
        </p>
        {!user && (
          <p className="mt-2 text-center text-[10.5px]" style={{ color: AP_COLORS.muted }}>
            Progression enregistrée sur cet appareil uniquement.
          </p>
        )}
      </div>
    </div>
  );
}
