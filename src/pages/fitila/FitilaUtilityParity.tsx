import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Accessibility, Activity, AlertTriangle, BadgeCheck, Bell, Bookmark, CloudOff, CloudUpload, Download, Eraser, FileScan,
  FileText, FolderCheck, GitMerge, GraduationCap, History, Inbox, Keyboard, Languages, Lock, LogOut, Mic, MessagesSquare, PenLine,
  Film, QrCode, Receipt, RefreshCw, ScanText, Search, Settings2, Shield, ShieldCheck, Smartphone, Sliders, Store, Users, Volume2,
  Compass, Wallet, PiggyBank, Zap, Hand, BarChart3, UserCog, Rss, Trash2, Globe, Database, HeartPulse, Cog,
  type LucideIcon,
} from 'lucide-react';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';
import { ActionList, Chip, ChipWrap, FeatureGrid, FitilaPage, MetricStrip, SwitchTile, type Feature } from '@/components/fitila/FitilaUi';
import { SIG } from '@/components/fitila/signatureTheme';
import { useAuth } from '@/contexts/AuthContext';

type Def = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  tabs: [string, LucideIcon][];
  body?: Record<string, Feature[]>;
  grid?: Feature[];
  list?: Feature[];
};
const f = (icon: LucideIcon, title: string, desc: string): Feature => ({ icon, title, desc });

// Libellés et contenus repris de FitilaModuleScreen / UtilityScreen (fitila_flutter/lib/main.dart).
const DEFS: Record<string, Def> = {
  messages: {
    title: 'Messages', subtitle: 'Messages privés, vocaux et groupes', icon: MessagesSquare,
    tabs: [['Vue', Inbox], ['Vocaux', Mic], ['Groupes', Users], ['Modération', Shield]],
    grid: [
      f(Inbox, 'Boîte de réception', 'Messages privés, non lus, favoris et recherche.'),
      f(MessagesSquare, 'Conversation', 'Texte, audio, traduction et pièces jointes.'),
      f(Bell, 'Notifications', 'Mentions, réponses, corrections et annonces.'),
    ],
    body: {
      Vocaux: [
        f(Mic, 'Message vocal', 'Enregistrer, transcrire, traduire et envoyer avec consentement.'),
        f(Volume2, 'Lecture accessible', 'Vitesse, replay, transcription et lecture Bariba/Français.'),
        f(CloudUpload, 'Sync médias', 'Upload audio, statut, reprise réseau et file offline.'),
      ],
      Groupes: [
        f(Users, 'Communautés', 'Groupes village, classe, famille, enseignants et modérateurs.'),
        f(MessagesSquare, 'Threads', 'Réponses, mentions, réactions, partage de post et traduction.'),
        f(UserCog, 'Rôles', 'Admin groupe, membre, invité et contrôle visuel.'),
      ],
      Modération: [
        f(AlertTriangle, 'Signalement', 'Spam, abus, contenu sensible et escalade admin.'),
        f(ShieldCheck, 'Contrôle visuel', 'Confirmation avant partage public ou message sensible.'),
        f(Lock, 'Confidentialité', 'Blocage, sourdine, suppression et protection profil.'),
      ],
    },
  },
  drafts: {
    title: 'Brouillons', subtitle: 'Brouillons du créateur et autosauvegarde', icon: FileText,
    tabs: [['Vue', FileText], ['Créateur', Film], ['Classe', GraduationCap], ['Sync', RefreshCw]],
    grid: [
      f(Film, 'Brouillons créateur', 'Templates, médias, captions, effets et état publication.'),
      f(GraduationCap, 'Brouillons classe', 'Réponses texte/audio, auto-évaluation et soumission différée.'),
      f(PenLine, 'Notes IA', 'Prompts, réponses, traductions et documents en attente.'),
      f(RefreshCw, 'Reprise', 'Ouvrir, publier, supprimer, programmer ou synchroniser.'),
    ],
  },
  offline: {
    title: 'Hors ligne', subtitle: 'Cache local et synchronisation différée', icon: CloudOff,
    tabs: [['Vue', CloudOff], ['Cache', Database], ['Queue', RefreshCw], ['Conflits', GitMerge]],
    grid: [
      f(Database, 'Cache local', 'Dictionnaire, leçons, templates, posts, brouillons et paramètres.'),
      f(RefreshCw, 'Queue sync', 'Réponses classe, posts, médias, contributions et messages.'),
      f(GitMerge, 'Conflits', 'Comparaison local/serveur, priorité et résolution utilisateur.'),
      f(HeartPulse, 'Diagnostic', 'Taille cache, dernières erreurs, retry et purge contrôlée.'),
    ],
  },
  wallet: {
    title: 'Portefeuille', subtitle: 'Solde, paiements et historiques', icon: Wallet,
    tabs: [['Vue', Wallet], ['Tontine', PiggyBank], ['Reçus', Receipt], ['Sécurité', Lock]],
    grid: [
      f(Wallet, 'Solde', 'Crédit, bonus, historique et statut paiement.'),
      f(PiggyBank, 'Tontine', 'Groupes, cotisations, rappels, preuves et reçus.'),
      f(Receipt, 'Reçus', 'PDF, partage, QR de vérification et export.'),
      f(Lock, 'Sécurité paiement', 'PIN, confirmation visuelle, limites et journal.'),
    ],
  },
  history: {
    title: 'Historique', subtitle: 'Activité, recherches et contenus vus', icon: History,
    tabs: [['Vue', History], ['Recherches', Search], ['Activité', Activity], ['Exports', Download]],
    grid: [
      f(Search, 'Recherches', 'Dictionnaire, traducteur, IA, Tem-IA et classe.'),
      f(Activity, 'Activité', 'Posts vus, leçons ouvertes, corrections, scans et exports.'),
      f(Bookmark, 'Favoris', 'Mots, templates, leçons, réponses IA et contenus enregistrés.'),
      f(Trash2, 'Confidentialité', 'Effacer historique, export données et rétention locale.'),
    ],
  },
  scan: {
    title: 'Scanner', subtitle: 'QR, documents et photo-traduction', icon: QrCode,
    tabs: [['Vue', QrCode], ['QR', QrCode], ['Document', FileScan], ['OCR', ScanText]],
    grid: [
      f(QrCode, 'QR', 'Profil, reçu, classe, contenu et vérification rapide.'),
      f(FileScan, 'Document', 'Photo, recadrage, OCR, traduction et résumé IA.'),
      f(ScanText, 'OCR Bariba/FR', 'Extraction texte, correction, dictionnaire et audio.'),
      f(ShieldCheck, 'Sécurité', 'Consentement, données sensibles et stockage local contrôlé.'),
    ],
  },
  discover: {
    title: 'Découvrir', subtitle: 'Tendances, créateurs et contenus', icon: Compass,
    tabs: [['Vue', Compass], ['Actions', Hand], ['Backend', Cog], ['Offline', Zap]],
    list: [
      f(Compass, 'Découvrir', 'Tendances, créateurs et contenus'),
      f(ShieldCheck, 'Contrôle visuel', 'Vérifie les actions sensibles comme dans le web React.'),
      f(Cog, 'Connexion backend', 'Point prêt pour brancher Supabase dans la prochaine étape.'),
    ],
  },
  shop: {
    title: 'Boutique', subtitle: 'Boutique, packs et services', icon: Store,
    tabs: [['Vue', Store], ['Actions', Hand], ['Backend', Cog], ['Offline', Zap]],
    list: [
      f(Store, 'Boutique', 'Boutique, packs et services'),
      f(ShieldCheck, 'Contrôle visuel', 'Vérifie les actions sensibles comme dans le web React.'),
      f(Cog, 'Connexion backend', 'Point prêt pour brancher Supabase dans la prochaine étape.'),
    ],
  },
};

const PREFS: { key: string; icon: LucideIcon; title: string; def: boolean }[] = [
  { key: 'bariba_first', icon: Globe, title: 'Afficher le Bariba en premier', def: false },
  { key: 'offline_cache', icon: Zap, title: 'Activer le cache offline', def: true },
  { key: 'auto_audio', icon: Volume2, title: 'Lecture audio automatique', def: true },
  { key: 'notifications', icon: Bell, title: 'Notifications fil, classe et corrections', def: true },
  { key: 'big_touch', icon: Hand, title: 'Grands contrôles tactiles', def: false },
  { key: 'diagnostics', icon: BarChart3, title: 'Partager diagnostics anonymes', def: false },
  { key: 'admin_tools', icon: UserCog, title: 'Afficher les outils admin', def: false },
];
const SEC_PREFS: { key: string; icon: LucideIcon; title: string; def: boolean }[] = [
  { key: 'pin_lock', icon: Lock, title: 'Verrouillage par code / biométrie', def: false },
  { key: 'visual_security', icon: ShieldCheck, title: 'Confirmation avant actions sensibles', def: true },
];

const SETTINGS_TABS: [string, LucideIcon][] = [
  ['Général', Sliders], ['Sécurité', Lock], ['Offline', CloudOff], ['Notifications', Bell], ['Accessibilité', Accessibility], ['Backend', Cog],
];
const SETTINGS_BODY: Record<string, Feature[]> = {
  Offline: [
    f(Database, 'Stockage local', 'Dictionnaire, leçons, templates, posts, brouillons et paramètres.'),
    f(RefreshCw, 'File de synchronisation', 'Réponses classe, médias, contributions, messages et paiements.'),
    f(Eraser, 'Nettoyage cache', 'Taille, purge sélective, migration et diagnostic.'),
  ],
  Notifications: [
    f(Rss, 'Fil et messages', 'Mentions, commentaires, nouveaux posts et messages vocaux.'),
    f(GraduationCap, 'Classe', 'Corrections, notes, devoirs, relances et feedback enseignant.'),
    f(AlertTriangle, 'Alertes', 'SOS, santé, sécurité, sync bloquée et actions sensibles.'),
  ],
  Accessibilité: [
    f(Hand, 'Ergonomie', 'Grands boutons, contrastes, densité UI et lecture facile.'),
    f(Volume2, 'Audio', 'TTS, STT, lecture automatique, vitesse et mode classe.'),
    f(Keyboard, 'Clavier Bariba', 'Suggestions, haptique, normalisation et compagnon flottant.'),
  ],
  Backend: [
    f(Cog, 'Supabase endpoints', 'Auth, profils, feed, classe, dictionnaire, storage, IA et realtime.'),
    f(HeartPulse, 'Diagnostic système', 'Statut services, latence, erreurs, logs et version app.'),
    f(UserCog, 'Administration', 'Modération, audit, imports, exports et outils de maintenance.'),
  ],
};

function usePref(key: string, def: boolean) {
  const k = `fitila_pref_${key}`;
  const [v, setV] = useState<boolean>(() => {
    try { const s = localStorage.getItem(k); return s === null ? def : s === '1'; } catch { return def; }
  });
  const set = (nv: boolean) => { setV(nv); try { localStorage.setItem(k, nv ? '1' : '0'); } catch { /* stockage indisponible */ } };
  return [v, set] as const;
}
function Pref({ p }: { p: { key: string; icon: LucideIcon; title: string; def: boolean } }) {
  const [v, set] = usePref(p.key, p.def);
  return <SwitchTile icon={p.icon} title={p.title} value={v} onChange={set} />;
}

function SettingsScreen() {
  const [tab, setTab] = useState('Général');
  const { signOut } = useAuth();
  const nav = useNavigate();
  return (
    <FitilaPage>
      <FitilaPageHeader title="Paramètres" subtitle="Langue, mode offline, audio, sécurité et session." />
      <div className="mt-[18px]">
        <ChipWrap>
          {SETTINGS_TABS.map(([name, icon]) => <Chip key={name} label={name} icon={icon} selected={tab === name} onClick={() => setTab(name)} />)}
        </ChipWrap>
      </div>
      <div className="mt-[12px] space-y-[12px]">
        {tab === 'Général' && (
          <>
            <div className="border-t" style={{ borderColor: SIG.hairline }}>{PREFS.map((p) => <Pref key={p.key} p={p} />)}</div>
            <FeatureGrid items={[
              f(Languages, 'Langues', 'Français, Bàátɔ̀nú, affichage prioritaire et clavier.'),
              f(Database, 'Cache offline', 'Dictionnaire, leçons, brouillons, posts et file de sync.'),
              f(ShieldCheck, 'Sécurité', 'Session, PIN, contrôle visuel, confidentialité et consentement.'),
              f(Cog, 'Backend', 'Endpoints Supabase, realtime, storage, fonctions IA et logs.'),
            ]} />
            <ActionList items={[
              f(HeartPulse, 'Diagnostic système', 'Auth, dictionnaire, feed, templates, IA, traduction et classe.'),
              f(RefreshCw, 'Queue de synchronisation', 'Brouillons, médias, réponses classe et contributions offline.'),
              f(FolderCheck, 'Règles de modération', 'Signalements, publication, visibilité et validation humaine.'),
            ]} />
            <div className="px-[18px]">
              <button
                type="button"
                onClick={async () => { await signOut(); nav('/auth'); }}
                className="flex h-[48px] w-full items-center justify-center gap-2 rounded-full border bg-white text-[14px] font-extrabold"
                style={{ borderColor: SIG.hairlineStrong }}
              >
                <LogOut className="h-[18px] w-[18px]" /> Se déconnecter
              </button>
            </div>
          </>
        )}
        {tab === 'Sécurité' && (
          <>
            <div className="border-t" style={{ borderColor: SIG.hairline }}>{SEC_PREFS.map((p) => <Pref key={p.key} p={p} />)}</div>
            <p className="px-[18px] text-[12.5px] font-extrabold" style={{ color: SIG.muted }}>Données</p>
            <ActionList items={[
              f(Download, 'Exporter mes données', "Profil, historique de traduction et progression d'apprentissage (JSON)."),
              f(Trash2, 'Supprimer mon compte', "Envoie une demande de suppression à un administrateur."),
            ]} />
          </>
        )}
        {SETTINGS_BODY[tab] && <ActionList items={SETTINGS_BODY[tab]} />}
      </div>
    </FitilaPage>
  );
}

export default function FitilaUtilityParity() {
  const key = useLocation().pathname.split('/').filter(Boolean)[0] || 'history';
  if (key === 'settings') return <SettingsScreen />;
  return <UtilityScreen def={DEFS[key] ?? DEFS.history} />;
}

function UtilityScreen({ def }: { def: Def }) {
  const [tab, setTab] = useState('Vue');
  const items = (tab !== 'Vue' && def.body?.[tab]) || def.grid;
  const isGrid = !def.body?.[tab] || ['Vocaux', 'Modération'].includes(tab);
  return (
    <FitilaPage>
      <FitilaPageHeader title={def.title} subtitle={def.subtitle} />
      <div className="mt-[18px] space-y-[12px]">
        <MetricStrip metrics={[{ label: 'Etat', value: 'Pret' }, { label: 'Sync', value: 'Locale' }, { label: 'Acces', value: 'Mobile' }]} />
        <ChipWrap>
          {def.tabs.map(([name, icon]) => <Chip key={name} label={name} icon={icon} selected={tab === name} onClick={() => setTab(name)} />)}
        </ChipWrap>
        {def.list ? <ActionList items={def.list} /> : isGrid ? <FeatureGrid items={items ?? []} /> : <ActionList items={items ?? []} />}
      </div>
    </FitilaPage>
  );
}
