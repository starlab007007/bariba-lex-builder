import { SmartSearchBar } from "@/components/SmartSearchBar";
import { DictionaryEntry } from "@/components/DictionaryEntry";
import { DictionaryStats } from "@/components/DictionaryStats";
import { useSmartDictionarySearch } from "@/hooks/useSmartDictionarySearch";
import { Book, Languages, Globe, ArrowLeftRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const Index = () => {
  const {
    searchQuery,
    setSearchQuery,
    searchDirection,
    setSearchDirection,
    wordSuggestions,
    fullSearchResults,
    showFullResults,
    performFullSearch,
    getSearchPlaceholder,
    getSearchDirectionLabel,
    isLoading,
    totalWords
  } = useSmartDictionarySearch();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border/50">
        <div className="container mx-auto px-4 py-12">
          <div className="text-center space-y-6">
            <div className="flex items-center justify-center gap-3 mb-4">
              <Book className="h-8 w-8 text-primary" />
              <ArrowLeftRight className="h-6 w-6 text-accent" />
              <Languages className="h-8 w-8 text-primary" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-foreground font-sans tracking-tight">
              Dictionnaire <span className="bariba-text">Bariba</span> - Français
            </h1>
            <div className="flex items-center justify-center gap-2 mb-4">
              <Badge variant="secondary" className="font-sans">
                <Globe className="h-4 w-4 mr-1" />
                Bààtɔ̀nú ↔ Français
              </Badge>
              <Badge variant="outline" className="font-sans">
                Recherche bidirectionnelle
              </Badge>
            </div>
            <p className="text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Explorez la richesse de la langue bariba (Bààtɔ̀nú) avec ce dictionnaire interactif exhaustif.
              Recherchez des mots en bariba ou en français, découvrez leurs significations et leurs prononciations.
            </p>
          </div>
        </div>
      </header>

      {/* Search Section */}
      <section className="container mx-auto px-4 py-8">
        <SmartSearchBar
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          searchDirection={searchDirection}
          onDirectionChange={setSearchDirection}
          placeholder={getSearchPlaceholder()}
          totalWords={totalWords}
          wordSuggestions={wordSuggestions}
          onPerformFullSearch={performFullSearch}
          showFullResults={showFullResults}
        />
      </section>

      {/* Stats and Results */}
      <main className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-4 gap-8">
          {/* Sidebar with stats */}
          <aside className="lg:col-span-1">
            <div className="sticky top-8 space-y-6">
              <DictionaryStats entries={showFullResults ? fullSearchResults.entries : []} />
              
              {/* Search Direction Info */}
              <div className="dictionary-card bg-gradient-to-br from-accent/5 to-primary/5">
                <div className="space-y-3">
                  <h3 className="font-bold text-lg text-foreground font-sans">
                    Mode de recherche
                  </h3>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="font-sans">
                      {getSearchDirectionLabel()}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {searchDirection === "bariba-to-french" && "Recherche dans les mots bariba pour trouver leurs traductions françaises."}
                    {searchDirection === "french-to-bariba" && "Recherche dans les mots français pour trouver leurs équivalents bariba."}
                    {searchDirection === "all" && "Recherche bidirectionnelle dans toutes les langues simultanément."}
                  </p>
                </div>
              </div>
            </div>
          </aside>

          {/* Dictionary entries */}
          <section className="lg:col-span-3 space-y-6">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h2 className="text-2xl font-bold text-foreground font-sans">
                  {searchQuery && showFullResults ? `Résultats pour "${searchQuery}"` : 
                   searchQuery && !showFullResults ? `Suggestions pour "${searchQuery}"` : 
                   "Dictionnaire complet"}
                </h2>
                {searchQuery && (
                  <p className="text-sm text-muted-foreground mt-1 font-sans">
                    Mode: {getSearchDirectionLabel()}
                    {!showFullResults && wordSuggestions.length > 0 && " • Recherche intelligente"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2">
                {showFullResults ? (
                  <>
                    <Badge variant="outline" className="font-sans">
                      {fullSearchResults.totalResults} {fullSearchResults.totalResults > 1 ? "mots" : "mot"}
                    </Badge>
                    {searchQuery && fullSearchResults.totalResults > 0 && (
                      <Badge variant="secondary" className="font-sans">
                        Recherche complète
                      </Badge>
                    )}
                  </>
                ) : (
                  <>
                    <Badge variant="outline" className="font-sans">
                      {totalWords} mots disponibles
                    </Badge>
                    {wordSuggestions.length > 0 && (
                      <Badge variant="secondary" className="font-sans">
                        {wordSuggestions.length} suggestion{wordSuggestions.length > 1 ? "s" : ""}
                      </Badge>
                    )}
                  </>
                )}
              </div>
            </div>

            {isLoading ? (
              <div className="text-center py-16">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center animate-pulse">
                  <Book className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">
                  Chargement du dictionnaire...
                </h3>
                <p className="text-muted-foreground mb-4">
                  Traitement de milliers d'entrées en cours
                </p>
                <div className="text-sm text-muted-foreground">
                  Veuillez patienter pendant le chargement complet
                </div>
              </div>
            ) : showFullResults && fullSearchResults.totalResults === 0 && searchQuery ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-muted rounded-full flex items-center justify-center">
                  <Book className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">
                  Aucun résultat trouvé
                </h3>
                <p className="text-muted-foreground mb-4">
                  Essayez avec d'autres termes ou changez le mode de recherche
                </p>
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Suggestions :</p>
                  <div className="flex flex-wrap justify-center gap-2">
                    <button 
                      onClick={() => setSearchQuery("aagu")}
                      className="text-sm px-3 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      <span className="bariba-text">aagu</span>
                    </button>
                    <button 
                      onClick={() => setSearchQuery("salut")}
                      className="text-sm px-3 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      salut
                    </button>
                    <button 
                      onClick={() => setSearchQuery("menuisier")}
                      className="text-sm px-3 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                    >
                      menuisier
                    </button>
                  </div>
                </div>
              </div>
            ) : !searchQuery || (!showFullResults && wordSuggestions.length === 0) ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-primary/20 to-accent/20 rounded-full flex items-center justify-center">
                  <Languages className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">
                  Dictionnaire Bariba-Français complet
                </h3>
                <p className="text-muted-foreground mb-4">
                  Tapez un mot pour commencer votre recherche
                </p>
                <div className="text-sm text-muted-foreground">
                  Plus de {totalWords} mots disponibles en recherche bidirectionnelle
                </div>
              </div>
            ) : showFullResults ? (
              <div className="space-y-6">
                {fullSearchResults.entries.map((entry, index) => (
                  <DictionaryEntry key={`${entry.word}-${index}`} entry={entry} />
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-center py-8">
                  <h3 className="text-lg font-semibold text-foreground mb-2 font-sans">
                    Suggestions intelligentes
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {wordSuggestions.length} suggestion{wordSuggestions.length > 1 ? "s" : ""} trouvée{wordSuggestions.length > 1 ? "s" : ""} pour "{searchQuery}"
                  </p>
                  <Button onClick={performFullSearch} className="mb-4">
                    Voir tous les résultats
                  </Button>
                </div>
                
                <div className="grid gap-4">
                  {wordSuggestions.map((suggestion, index) => (
                    <div key={`${suggestion.word}-${index}`} 
                         className="p-4 border border-border/50 rounded-lg bg-card hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h4 className={`text-lg font-semibold ${suggestion.type === 'bariba' ? 'bariba-text' : ''}`}>
                              {suggestion.word}
                            </h4>
                            <Badge variant={suggestion.type === 'bariba' ? 'default' : 'secondary'} className="text-xs">
                              {suggestion.type === 'bariba' ? 'Bariba' : 'Français'}
                            </Badge>
                            {suggestion.isExact && (
                              <Badge variant="outline" className="text-xs">Correspondance exacte</Badge>
                            )}
                          </div>
                          <p className="text-muted-foreground text-sm mb-2">
                            {suggestion.entry.definition}
                          </p>
                          {suggestion.entry.phonetic && (
                            <p className="text-xs text-muted-foreground/70">
                              Phonétique: {suggestion.entry.phonetic}
                            </p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSearchQuery(suggestion.word);
                            performFullSearch();
                          }}
                        >
                          Voir détails
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground font-sans">
              <span>Dictionnaire Bariba-Français</span>
              <span>•</span>
              <span className="bariba-text">Bààtɔ̀nú ↔ Fãsi</span>
              <span>•</span>
              <span>{totalWords} mots</span>
            </div>
            <p className="text-xs text-muted-foreground/70 font-sans">
              Préservation et partage de la langue bariba • Recherche bidirectionnelle intelligente
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;