import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  useLayoutEffect,
  type ReactNode,
} from "react";
import sourceCatalog from "@/data/locales/platform.json";
import sourceKeys from "@/data/locales/keys.json";
import {
  PlatformCatalog,
  type LocaleEntry,
  type LocaleOverride,
  type UiLocale,
} from "@/lib/i18n/catalog";
import { DomLocalizer } from "@/lib/i18n/domLocalizer";
import { supabase } from "@/integrations/supabase/client";
const FR_FALLBACK: Record<string, string> = {
  addComment: "Ajouter un commentaire",
  addContact: "Ajouter un contact de confiance",
  audioComments: "Commentaires audio",
  badges: "Badges",
  cancel: "Annuler",
  followers: "Abonnés",
  following: "Abonnements",
  friends: "Amis",
  hideTranscription: "Masquer la transcription",
  showTranscription: "Afficher la transcription",
  language: "Langue",
  loading: "Chargement…",
  logout: "Se déconnecter",
  noComments: "Aucun commentaire",
  poll: "Sondage",
  profile_logout_confirm: "Voulez-vous vous déconnecter ?",
  screenHome: "Accueil",
  screenProfile: "Profil",
  screenSOS: "Écran SOS",
  search: "Rechercher",
  tapToListen: "Touchez pour écouter",
  tapToVote: "Touchez pour voter",
  transcribing: "Transcription…",
  translate: "Traduire",
  vocalStats: "Statistiques vocales",
  emergency: "Urgence",
  tapToSpeak: "Touchez pour parler",
  location: "Localisation",
  emergencyContacts: "Contacts de confiance",
  family: "Famille",
  hospital: "Hôpital",
  police: "Police",
  cancelAlert: "Alerte annulée",
  callEmergency: "Appel d'urgence en cours",
};

export type FitilaLang = UiLocale;
const keys = sourceKeys as Record<string, { fr: string; ba: string }>;
const bundled = sourceCatalog.entries as LocaleEntry[];
const readLanguage = (): FitilaLang => {
  try {
    return localStorage.getItem("fitila-lang") === "ba" ? "ba" : "fr";
  } catch {
    return "fr";
  }
};
const validOverrides = (rows: unknown): LocaleOverride[] =>
  Array.isArray(rows)
    ? rows
        .filter(
          (row) =>
            row &&
            typeof row.id === "string" &&
            typeof row.fr === "string" &&
            typeof row.ba === "string" &&
            row.fr.length <= 4000 &&
            row.ba.length <= 4000,
        )
        .slice(0, 20000)
    : [];
function cachedOverrides() {
  try {
    return validOverrides(
      JSON.parse(localStorage.getItem("fitila-locale-approved-v1") ?? "[]"),
    );
  } catch {
    return [];
  }
}
interface LanguageContext {
  currentLang: FitilaLang;
  setLanguage: (lang: FitilaLang) => void;
  t: (key: string) => string;
  tr: (text: string) => string;
  translateText: (
    text: string,
    from: FitilaLang,
    to: FitilaLang,
  ) => Promise<string>;
  isTranslating: boolean;
  translationsLoaded: boolean;
  coverage: { total: number; available: number; approved: number };
  refreshTranslations: () => Promise<void>;
}
const FitilaLanguageContext = createContext<LanguageContext | null>(null);
export function FitilaLanguageProvider({ children }: { children: ReactNode }) {
  const [currentLang, setCurrentLang] = useState<FitilaLang>(readLanguage);
  const [overrides, setOverrides] = useState<LocaleOverride[]>(cachedOverrides);
  const catalog = useMemo(
    () => new PlatformCatalog(bundled, overrides),
    [overrides],
  );
  const setLanguage = useCallback((language: FitilaLang) => {
    if (language === "fr" || language === "ba") setCurrentLang(language);
  }, []);
  const refreshTranslations = useCallback(async () => {
    try {
      const rows: LocaleOverride[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await (supabase as any)
          .from("platform_locale_overrides")
          .select("id,fr,ba,revision")
          .eq("status", "approved")
          .order("id")
          .range(from, from + 999)
          .abortSignal(AbortSignal.timeout(5000));
        if (error) return;
        const page = validOverrides(data);
        rows.push(...page);
        if (page.length < 1000) break;
      }
      setOverrides((previous) =>
        JSON.stringify(previous) === JSON.stringify(rows) ? previous : rows,
      );
      try {
        localStorage.setItem("fitila-locale-approved-v1", JSON.stringify(rows));
      } catch {
        /* Memory and bundled resources continue to work. */
      }
    } catch {
      /* Offline: keep the last public publication and bundled catalogue. */
    }
  }, []);
  useEffect(() => {
    void refreshTranslations();
    const storage = (event: StorageEvent) => {
      if (event.key === "fitila-lang") setCurrentLang(readLanguage());
      if (event.key === "fitila-locale-published-at")
        void refreshTranslations();
    };
    const refresh = () => {
      void refreshTranslations();
    };
    window.addEventListener("storage", storage);
    window.addEventListener("online", refresh);
    window.addEventListener("fitila:locale-updated", refresh);
    return () => {
      window.removeEventListener("storage", storage);
      window.removeEventListener("online", refresh);
      window.removeEventListener("fitila:locale-updated", refresh);
    };
  }, [refreshTranslations]);
  useEffect(() => {
    try {
      localStorage.setItem("fitila-lang", currentLang);
    } catch {
      /* Session choice still applies. */
    }
  }, [currentLang]);
  useLayoutEffect(() => {
    document.documentElement.lang = currentLang === "ba" ? "bba" : "fr";
    document.documentElement.dataset.fitilaLocale = currentLang;
    const adapter = new DomLocalizer(document.body, catalog, currentLang);
    adapter.start();
    return () => adapter.stop();
  }, [catalog, currentLang]);
  const tr = useCallback(
    (text: string) => catalog.translate(text, currentLang),
    [catalog, currentLang],
  );
  const t = useCallback(
    (key: string) => {
      const entry = keys[key];
      if (!entry) return tr(FR_FALLBACK[key] ?? key);
      return catalog.translate(entry.fr || FR_FALLBACK[key] || key, currentLang);
    },
    [catalog, currentLang, tr],
  );
  const translateText = useCallback(
    async (text: string, from: FitilaLang, to: FitilaLang) =>
      from === to
        ? text
        : to === "fr"
          ? catalog.toFrench(text)
          : catalog.translate(text, "ba"),
    [catalog],
  );
  const value = useMemo(
    () => ({
      currentLang,
      setLanguage,
      t,
      tr,
      translateText,
      isTranslating: false,
      translationsLoaded: true,
      coverage: catalog.coverage,
      refreshTranslations,
    }),
    [
      currentLang,
      setLanguage,
      t,
      tr,
      translateText,
      catalog,
      refreshTranslations,
    ],
  );
  return (
    <FitilaLanguageContext.Provider value={value}>
      {children}
    </FitilaLanguageContext.Provider>
  );
}
export function useFitilaLanguage() {
  const context = useContext(FitilaLanguageContext);
  if (!context)
    throw new Error(
      "useFitilaLanguage must be used within a FitilaLanguageProvider",
    );
  return context;
}
export type TamTamLang = FitilaLang;
export const TamTamLanguageProvider = FitilaLanguageProvider;
export const useTamTamLanguage = useFitilaLanguage;
