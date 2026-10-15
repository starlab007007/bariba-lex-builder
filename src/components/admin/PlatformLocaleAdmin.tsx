import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useFitilaLanguage } from "@/contexts/FitilaLanguageContext";
import catalogue from "@/data/locales/platform.json";
import audit from "@/data/locales/audit.json";
import { localeKey, localeId, type LocaleEntry } from "@/lib/i18n/catalog";
type Saved = {
  id: string;
  fr: string;
  ba: string;
  status: "draft" | "approved";
  revision: number;
};
const entries = catalogue.entries as LocaleEntry[];
const paths = audit.files as Record<string, string[]>;
export default function PlatformLocaleAdmin() {
  const { isAdmin, user } = useAuth(),
    client = useQueryClient(),
    language = useFitilaLanguage();
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState("missing"),
    [page, setPage] = useState(0);
  const [selected, setSelected] = useState<LocaleEntry | null>(null),
    [ba, setBa] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [notice, setNotice] = useState("");
  const db = supabase as any;
  const published = useQuery({
    queryKey: ["platform-locale-admin", user?.id],
    enabled: isAdmin,
    queryFn: async () => {
      const result: Saved[] = [];
      for (let from = 0; from < 20000; from += 1000) {
        const { data, error } = await db
          .from("platform_locale_overrides")
          .select("id,fr,ba,status,revision")
          .order("id")
          .range(from, from + 999);
        if (error) throw error;
        result.push(...data);
        if (data.length < 1000) break;
      }
      return result;
    },
  });
  const saved = useMemo(
    () => new Map((published.data ?? []).map((row) => [row.id, row])),
    [published.data],
  );
  const [newFr, setNewFr] = useState("");
  const allEntries = useMemo(() => {
    const known = new Map(entries.map((row) => [row.id, row]));
    for (const row of published.data ?? [])
      if (!known.has(row.id))
        known.set(row.id, {
          ...row,
          sources: [{ source: "validation", id: row.id }],
        });
    return [...known.values()];
  }, [published.data]);
  const visible = useMemo(
    () =>
      allEntries.filter((row) => {
        const current = saved.get(row.id),
          state = current?.status ?? (row.ba ? "catalogue" : "missing");
        return (
          (!query ||
            localeKey(row.fr).includes(localeKey(query)) ||
            (paths[row.id] ?? []).some((path) => path.includes(query))) &&
          (filter === "all" || state === filter)
        );
      }),
    [query, filter, saved, allEntries],
  );
  const open = (row: LocaleEntry) => {
    setSelected(row);
    setBa(saved.get(row.id)?.ba ?? row.ba ?? "");
    setConfirmed(false);
    setNotice("");
  };
  const notify = async () => {
    await client.invalidateQueries({ queryKey: ["platform-locale-admin"] });
    window.dispatchEvent(new Event("fitila:locale-updated"));
    try {
      localStorage.setItem("fitila-locale-published-at", String(Date.now()));
    } catch {}
    await language.refreshTranslations();
  };
  const save = async (status: "draft" | "approved") => {
    if (!selected || !ba.trim() || (status === "approved" && !confirmed))
      return;
    setBusy(true);
    setNotice("");
    try {
      const previous = saved.get(selected.id);
      if (previous?.status === "approved" && status === "draft")
        throw new Error(
          "Une publication existante se modifie après validation ; elle reste publiée pendant votre travail.",
        );
      const payload = {
        id: selected.id,
        fr: selected.fr,
        ba: ba.trim(),
        status,
      };
      const request = previous
        ? db
            .from("platform_locale_overrides")
            .update(payload)
            .eq("id", selected.id)
            .eq("revision", previous.revision)
        : db.from("platform_locale_overrides").insert(payload);
      const { data, error } = await request.select("id").maybeSingle();
      if (error) throw error;
      if (!data)
        throw new Error(
          "Une autre personne a modifié ce libellé. Rechargez avant de publier.",
        );
      await notify();
      setConfirmed(false);
      setNotice(
        status === "approved"
          ? "Traduction validée et publiée."
          : "Brouillon enregistré.",
      );
    } catch (error) {
      setNotice(
        error instanceof Error ? error.message : "Enregistrement impossible.",
      );
    } finally {
      setBusy(false);
    }
  };
  const exportCatalogue = () => {
    const content = allEntries.map((row) => ({
      id: row.id,
      fr: row.fr,
      ba: saved.get(row.id)?.ba ?? row.ba ?? "",
      status: saved.get(row.id)?.status ?? row.status,
      files: paths[row.id] ?? [],
      sources: row.sources,
    }));
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(content, null, 2)], {
        type: "application/json",
      }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = "fitila-traductions-fr-baatonum.json";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const importDrafts = async (file: File) => {
    setBusy(true);
    setNotice("");
    try {
      if (file.size > 10_000_000) throw new Error("Fichier trop volumineux.");
      const content = JSON.parse(await file.text());
      if (!Array.isArray(content) || content.length > 20000)
        throw new Error("Format de catalogue invalide.");
      const known = new Map(allEntries.map((row) => [row.id, row])),
        seen = new Set<string>(),
        rows: { id: string; fr: string; ba: string; status: "draft" }[] = [];
      for (const item of content) {
        if (!item || typeof item !== "object") continue;
        const source =
          known.get(item.id) ??
          (typeof item.fr === "string" &&
          item.fr.trim().length > 0 &&
          item.fr.length <= 4000 &&
          localeId(item.fr) === item.id
            ? {
                id: item.id,
                fr: item.fr,
                ba: null,
                status: "missing",
                sources: [],
              }
            : undefined);
        if (
          !source ||
          typeof item.fr !== "string" ||
          localeKey(source.fr) !== localeKey(item.fr) ||
          typeof item.ba !== "string" ||
          !item.ba.trim() ||
          item.ba.length > 4000 ||
          saved.has(item.id) ||
          seen.has(item.id)
        )
          continue;
        seen.add(item.id);
        rows.push({
          id: source.id,
          fr: source.fr,
          ba: item.ba.trim(),
          status: "draft",
        });
      }
      let count = 0;
      for (let from = 0; from < rows.length; from += 100) {
        const { error } = await db
          .from("platform_locale_overrides")
          .insert(rows.slice(from, from + 100));
        if (error) throw error;
        count += Math.min(100, rows.length - from);
      }
      await notify();
      setNotice(
        `${count} brouillons importés. Les publications existantes sont conservées. Validez les traductions avant publication.`,
      );
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Import impossible.");
    } finally {
      setBusy(false);
    }
  };
  if (!isAdmin) return <p>Accès administrateur requis.</p>;
  return (
    <section className="space-y-5" aria-label="Traductions de la plateforme">
      <div className="flex flex-wrap gap-2 rounded-2xl border bg-white p-3">
        <input
          translate="no"
          aria-label="Nouveau libellé français"
          value={newFr}
          onChange={(e) => setNewFr(e.target.value)}
          maxLength={4000}
          placeholder="Nouveau libellé français"
          className="min-w-0 flex-1 rounded-xl border p-2"
        />
        <button
          disabled={!newFr.trim()}
          onClick={() => {
            const fr = newFr.trim(),
              id = localeId(fr);
            open(
              allEntries.find((row) => row.id === id) ?? {
                id,
                fr,
                ba: null,
                status: "missing",
                sources: [],
              },
            );
            setNewFr("");
          }}
          className="rounded-xl border px-3 disabled:opacity-40"
        >
          Ajouter un libellé
        </button>
      </div>
      <header className="rounded-3xl border border-[#E4DFCC] bg-white p-5">
        <h2 className="text-xl font-bold">Français ↔ Baatɔnum</h2>
        <p className="mt-2 text-sm text-[#716B5F]">
          Interface, contenus pédagogiques et messages. Une référence du
          catalogue ne constitue pas une validation linguistique.
        </p>
        <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[
            [language.coverage.total, "Chaînes recensées"],
            [language.coverage.available, "Traductions disponibles"],
            [language.coverage.approved, "Validées et publiées"],
            [
              language.coverage.total - language.coverage.available,
              "À compléter",
            ],
          ].map(([n, label]) => (
            <div key={label} className="rounded-2xl bg-[#F7F5EC] p-3">
              <strong className="block text-2xl">{n}</strong>
              <span className="text-xs">{label}</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[#716B5F]">
          Les formulations manquantes restent en français. La saisie, les
          traductions demandées et les réponses d’exercice gardent leur langue
          originale.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={exportCatalogue}
            className="rounded-xl border px-3 py-2 text-sm"
          >
            Exporter le catalogue JSON
          </button>
          <label className="cursor-pointer rounded-xl border px-3 py-2 text-sm">
            Importer des brouillons
            <input
              aria-label="Importer le catalogue de traductions"
              type="file"
              accept="application/json,.json"
              disabled={busy}
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = "";
                if (file) void importDrafts(file);
              }}
            />
          </label>
          <div translate="no" className="ml-auto flex gap-2">
            {(["fr", "ba"] as const).map((locale) => (
              <button
                key={locale}
                onClick={() => language.setLanguage(locale)}
                aria-pressed={language.currentLang === locale}
                className="rounded-xl border px-3 py-2"
              >
                {locale === "fr" ? "Français" : "Baatɔnum"}
              </button>
            ))}
          </div>
        </div>
      </header>
      {published.error && (
        <p role="alert">
          La file de validation est indisponible. Le catalogue embarqué reste
          accessible.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="Rechercher un libellé ou un fichier"
          placeholder="Rechercher un libellé ou un fichier"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(0);
          }}
          className="min-w-0 flex-1 rounded-xl border bg-white px-3 py-2"
        />
        <select
          aria-label="Statut des traductions"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          className="rounded-xl border bg-white px-3 py-2"
        >
          <option value="all">Tous</option>
          <option value="missing">À compléter</option>
          <option value="catalogue">Référence du catalogue</option>
          <option value="draft">Brouillons</option>
          <option value="approved">Validées</option>
        </select>
      </div>
      <div className="grid items-start gap-4 xl:grid-cols-2">
        <div className="overflow-hidden rounded-2xl border bg-white">
          <div className="max-h-[65vh] overflow-auto">
            {visible.slice(page * 40, page * 40 + 40).map((row) => (
              <button
                key={row.id}
                onClick={() => open(row)}
                className="block w-full border-b p-3 text-left hover:bg-[#FBF8EE]"
              >
                <p translate="no" className="break-words text-sm font-semibold">
                  {row.fr}
                </p>
                <p className="mt-1 truncate text-[10px] text-[#716B5F]">
                  {(paths[row.id] ?? [])[0]}
                </p>
              </button>
            ))}
          </div>
          <div className="flex items-center justify-between p-3 text-xs">
            <button
              disabled={page === 0}
              onClick={() => setPage(page - 1)}
              className="min-h-10 rounded-lg border px-3 disabled:opacity-40"
            >
              Précédent
            </button>
            <span>{visible.length} libellés</span>
            <button
              disabled={(page + 1) * 40 >= visible.length}
              onClick={() => setPage(page + 1)}
              className="min-h-10 rounded-lg border px-3 disabled:opacity-40"
            >
              Suivant
            </button>
          </div>
        </div>
        {selected ? (
          <div className="space-y-3 rounded-2xl border bg-white p-4">
            <h3 className="font-bold">Traduction du libellé</h3>
            <p
              translate="no"
              className="whitespace-pre-wrap break-words rounded-xl bg-[#F7F5EC] p-3 text-sm"
            >
              {selected.fr}
            </p>
            <label className="block text-sm font-semibold">
              Baatɔnum
              <textarea
                translate="no"
                lang="bba"
                value={ba}
                onChange={(e) => {
                  setBa(e.target.value);
                  setConfirmed(false);
                }}
                maxLength={4000}
                className="mt-2 min-h-32 w-full rounded-xl border p-3 font-normal"
              />
            </label>
            <details className="text-xs">
              <summary>Voir les références et les fichiers</summary>
              <div translate="no" className="mt-2 space-y-1 break-words">
                {selected.sources.map((source, index) => (
                  <p key={index}>
                    {source.source} · {source.id}
                  </p>
                ))}
                {(paths[selected.id] ?? []).map((file) => (
                  <p key={file}>{file}</p>
                ))}
              </div>
            </details>
            <label className="flex items-start gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmed}
                onChange={(e) => setConfirmed(e.target.checked)}
              />
              <span>
                J’ai vérifié le sens, les nombres, les noms et la formulation
                Baatɔnum avant publication.
              </span>
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                disabled={
                  busy ||
                  !ba.trim() ||
                  saved.get(selected.id)?.status === "approved"
                }
                onClick={() => void save("draft")}
                className="min-h-11 rounded-xl border px-4 text-sm disabled:opacity-40"
              >
                Enregistrer le brouillon
              </button>
              <button
                disabled={busy || !confirmed || !ba.trim()}
                onClick={() => void save("approved")}
                className="min-h-11 rounded-xl bg-[#3F6E52] px-4 text-sm font-bold text-white disabled:opacity-40"
              >
                Valider et publier
              </button>
            </div>
          </div>
        ) : (
          <p className="rounded-2xl border bg-white p-5 text-sm">
            Sélectionnez un libellé pour vérifier sa traduction.
          </p>
        )}
      </div>
      {notice && (
        <p role="status" className="rounded-xl bg-[#F3E3B9] p-3 text-sm">
          {notice}
        </p>
      )}
    </section>
  );
}
