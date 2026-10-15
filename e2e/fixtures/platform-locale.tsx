import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { createPortal } from "react-dom";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/AuthContext";
import {
  FitilaLanguageProvider,
  useFitilaLanguage,
} from "@/contexts/FitilaLanguageContext";
import FitilaNavPanel from "@/components/fitila/FitilaNavPanel";
import TamTamTranslator from "@/pages/tamtam/TamTamTranslator";
import PlatformLocaleAdmin from "@/components/admin/PlatformLocaleAdmin";
import "@/index.css";
const client = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});
function Fixture() {
  const locale = useFitilaLanguage(),
    [text, setText] = useState("Annuler Ali 1200"),
    [label, setLabel] = useState("Annuler"),
    [show, setShow] = useState(false),
    [portal, setPortal] = useState(false);
  useEffect(() => {
    (window as any).__locale = locale.setLanguage;
  }, [locale.setLanguage]);
  if (new URLSearchParams(location.search).has("admin"))
    return <PlatformLocaleAdmin />;
  return (
    <div className="grid min-w-0 gap-4 p-4 md:grid-cols-[250px_1fr]">
      <aside>
        <FitilaNavPanel />
      </aside>
      <main className="min-w-0 space-y-3">
        <div translate="no" className="flex gap-2">
          <button onClick={() => locale.setLanguage("fr")}>FR test</button>
          <button onClick={() => locale.setLanguage("ba")}>BA test</button>
        </div>
        {new URLSearchParams(location.search).has("translator") ? (
          <div className="h-[700px]">
            <TamTamTranslator />
          </div>
        ) : (
          <>
            <h1>Annuler</h1>
            <p data-testid="changing">{label}</p>
            <button
              data-testid="change"
              onClick={() =>
                setLabel(label === "Annuler" ? "Retour" : "Annuler")
              }
            >
              Modifier
            </button>
            <label>
              Texte
              <input
                data-testid="draft"
                placeholder="Annuler"
                aria-label="Annuler"
                value={text}
                onChange={(e) => setText(e.target.value)}
                className="max-w-full border"
              />
            </label>
            <textarea data-testid="textarea" defaultValue="Annuler" />
            <div
              contentEditable
              suppressContentEditableWarning
              data-testid="editor"
            >
              Annuler
            </div>
            <p data-i18n-preserve data-testid="original">
              Annuler
            </p>
            <p lang="bba" data-testid="native">
              Mɛɛribu
            </p>
            <button
              data-testid="late"
              onClick={() => {
                setTimeout(() => setShow(true), 20);
              }}
            >
              Ouvrir
            </button>
            {show && (
              <div data-testid="late-content" title="Supprimer">
                Supprimer
              </div>
            )}
            <button data-testid="portal" onClick={() => setPortal(!portal)}>
              Ouvrir
            </button>
            {portal &&
              createPortal(
                <p data-testid="portal-content">Supprimer</p>,
                document.body,
              )}
            <button data-testid="remove" onClick={() => setShow(false)}>
              Fermer
            </button>
            <p data-testid="unknown">
              Phrase sans référence : Ali ne donne pas 1200.
            </p>
          </>
        )}
      </main>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={client}>
    <AuthProvider>
      <MemoryRouter>
        <FitilaLanguageProvider>
          <Fixture />
        </FitilaLanguageProvider>
      </MemoryRouter>
    </AuthProvider>
  </QueryClientProvider>,
);
