import { useState, useMemo } from "react";
import { SearchBar } from "@/components/SearchBar";
import { DictionaryEntry } from "@/components/DictionaryEntry";
import { DictionaryStats } from "@/components/DictionaryStats";
import { dictionaryEntries } from "@/data/dictionaryData";
import { Book, Languages } from "lucide-react";

const Index = () => {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) {
      return dictionaryEntries;
    }
    
    const query = searchQuery.toLowerCase().trim();
    return dictionaryEntries.filter(entry => 
      entry.word.toLowerCase().includes(query) ||
      entry.definition.toLowerCase().includes(query) ||
      entry.phonetic?.toLowerCase().includes(query) ||
      entry.example_bariba.some(ex => ex.toLowerCase().includes(query)) ||
      entry.example_francais.some(ex => ex.toLowerCase().includes(query))
    );
  }, [searchQuery]);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Book className="h-8 w-8 text-primary" />
              <Languages className="h-8 w-8 text-accent" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-sans tracking-tight">
              Dictionnaire <span className="bariba-text">Bariba</span> - Français
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Explorez la richesse de la langue bariba (Bààtɔ̀nú) avec ce dictionnaire interactif.
              Recherchez des mots, découvrez leurs significations et écoutez leur prononciation.
            </p>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="container mx-auto px-4 py-8">
        <SearchBar 
          onSearch={setSearchQuery}
          placeholder="Rechercher un mot en bariba ou en français..."
        />
      </section>

      {/* Stats and Results */}
      <main className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar with stats */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8">
              <DictionaryStats entries={dictionaryEntries} />
            </div>
          </aside>

          {/* Dictionary entries */}
          <section className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-foreground font-sans">
                {searchQuery ? `Résultats pour "${searchQuery}"` : "Tous les mots"}
              </h2>
              <span className="text-muted-foreground font-sans">
                {filteredEntries.length} {filteredEntries.length > 1 ? "mots" : "mot"}
              </span>
            </div>

            {filteredEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Book className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">
                  Aucun résultat trouvé
                </h3>
                <p className="text-muted-foreground">
                  Essayez avec d'autres termes de recherche
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {filteredEntries.map((entry, index) => (
                  <DictionaryEntry key={`${entry.word}-${index}`} entry={entry} />
                ))}
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground font-sans">
              Dictionnaire Bariba-Français • Bààtɔ̀nú - Fãsi
            </p>
            <p className="text-xs text-muted-foreground/70 font-sans">
              Préservation et partage de la langue bariba
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
