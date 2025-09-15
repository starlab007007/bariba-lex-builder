import { SmartSearchBar } from "@/components/SmartSearchBar";
import { DictionaryEntry } from "@/components/DictionaryEntry";
import { DirectTranslation } from "@/components/DirectTranslation";
import { DictionaryStats } from "@/components/DictionaryStats";
import { PhraseTranslator } from "@/components/PhraseTranslator";
import { useSmartDictionarySearch } from "@/hooks/useSmartDictionarySearch";
import { Book, Languages, Globe, ArrowLeftRight, MessageSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
        <div className="container mx-auto px-4 py-8 lg:py-12">
          <div className="text-center space-y-4 lg:space-y-6">
            <div className="flex items-center justify-center gap-2 lg:gap-3 mb-3 lg:mb-4">
              <Book className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
              <ArrowLeftRight className="h-5 w-5 lg:h-6 lg:w-6 text-accent" />
              <Languages className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-sans tracking-tight">
              Dictionnaire & Traducteur <span className="bariba-text">Bààtɔ̀nú</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-2 mb-3 lg:mb-4">
              <Badge variant="secondary" className="font-sans text-xs lg:text-sm">
                <Globe className="h-3 w-3 lg:h-4 lg:w-4 mr-1" />
                <span className="bariba-text">Bààtɔ̀nú</span> ↔ Français
              </Badge>
              <Badge variant="outline" className="font-sans text-xs lg:text-sm">
                Dictionnaire & Traduction
              </Badge>
            </div>
            <p className="text-lg lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-4">
              Explorez la richesse de la langue bariba (<span className="bariba-text">Bààtɔ̀nú</span>) avec ce dictionnaire interactif 
              et traduisez des phrases complètes entre le français et le bariba.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs */}
      <div className="container mx-auto px-4 py-8">
        <Tabs defaultValue="dictionary" className="w-full">
          <TabsList className="grid w-full max-w-md mx-auto grid-cols-2 mb-8">
            <TabsTrigger value="dictionary" className="flex items-center gap-2">
              <Book className="h-4 w-4" />
              Dictionnaire
            </TabsTrigger>
            <TabsTrigger value="translator" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Traducteur
            </TabsTrigger>
          </TabsList>

          <TabsContent value="dictionary" className="space-y-8">
            {/* Search Section */}
            <section>
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
            <main className="pb-8 lg:pb-12">
              <div className="grid lg:grid-cols-4 gap-6 lg:gap-8">
                {/* Sidebar with stats - Hidden on mobile, collapsible on tablet */}
                <aside className="hidden lg:block lg:col-span-1">
                  <div className="sticky top-8 space-y-4 lg:space-y-6">
                    <DictionaryStats entries={showFullResults ? fullSearchResults.entries : []} />
                    
                    {/* Search Direction Info */}
                    <div className="dictionary-card bg-gradient-to-br from-accent/5 to-primary/5">
                      <div className="space-y-3">
                        <h3 className="font-bold text-base lg:text-lg text-foreground font-sans">
                          Direction de recherche
                        </h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="default" className="font-sans text-xs">
                            {searchDirection === "bariba-to-french" && (
                              <><span className="bariba-text">Bààtɔ̀nú</span> → Français</>
                            )}
                            {searchDirection === "french-to-bariba" && (
                              <>Français → <span className="bariba-text">Bààtɔ̀nú</span></>
                            )}
                            {searchDirection === "all" && (
                              <><span className="bariba-text">Bààtɔ̀nú</span> ↔ Français</>
                            )}
                          </Badge>
                        </div>
                        <p className="text-xs lg:text-sm text-muted-foreground leading-relaxed">
                          {searchDirection === "bariba-to-french" && "Recherche dans les mots bariba pour trouver leurs traductions françaises."}
                          {searchDirection === "french-to-bariba" && "Recherche dans les mots français pour trouver leurs équivalents bariba."}
                          {searchDirection === "all" && "Recherche bidirectionnelle dans toutes les langues simultanément."}
                        </p>
                      </div>
                    </div>
                  </div>
                </aside>

                {/* Dictionary entries */}
                <section className="lg:col-span-3 space-y-4 lg:space-y-6">
                  {/* Mobile Direction Info */}
                  <div className="lg:hidden dictionary-card bg-gradient-to-br from-accent/5 to-primary/5">
                    <div className="space-y-2">
                      <h3 className="font-bold text-sm text-foreground font-sans">
                        Direction actuelle
                      </h3>
                      <Badge variant="default" className="font-sans text-xs">
                        {searchDirection === "bariba-to-french" && (
                          <><span className="bariba-text">Bààtɔ̀nú</span> → Français</>
                        )}
                        {searchDirection === "french-to-bariba" && (
                          <>Français → <span className="bariba-text">Bààtɔ̀nú</span></>
                        )}
                        {searchDirection === "all" && (
                          <><span className="bariba-text">Bààtɔ̀nú</span> ↔ Français</>
                        )}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-start justify-between flex-wrap gap-4">
                    <div className="min-w-0 flex-1">
                      <h2 className="text-xl lg:text-2xl font-bold text-foreground font-sans break-words">
                        {searchQuery && showFullResults ? `Résultats pour "${searchQuery}"` : 
                         searchQuery && !showFullResults ? `Suggestions pour "${searchQuery}"` : 
                         "Dictionnaire complet"}
                      </h2>
                      {searchQuery && (
                        <p className="text-xs lg:text-sm text-muted-foreground mt-1 font-sans">
                          Direction: {searchDirection === "bariba-to-french" && "Bààtɔ̀nú → Français"}
                          {searchDirection === "french-to-bariba" && "Français → Bààtɔ̀nú"}
                          {searchDirection === "all" && "Bidirectionnelle"}
                          {!showFullResults && wordSuggestions.length > 0 && " • Recherche intelligente"}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      {showFullResults ? (
                        <>
                          <Badge variant="outline" className="font-sans text-xs">
                            {fullSearchResults.totalResults} {fullSearchResults.totalResults > 1 ? "mots" : "mot"}
                          </Badge>
                          {searchQuery && fullSearchResults.totalResults > 0 && (
                            <Badge variant="secondary" className="font-sans text-xs">
                              Recherche complète
                            </Badge>
                          )}
                        </>
                      ) : (
                        <>
                          <Badge variant="outline" className="font-sans text-xs lg:text-sm">
                            {totalWords} mots
                          </Badge>
                          {wordSuggestions.length > 0 && (
                            <Badge variant="secondary" className="font-sans text-xs lg:text-sm">
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
                    <div className="space-y-4 lg:space-y-6">
                      {/* Traduction directe en première position si applicable */}
                      {searchQuery && fullSearchResults.entries.length > 0 && (searchDirection !== "all") && (
                        (() => {
                          const directEntry = fullSearchResults.entries.find(entry => {
                            if (searchDirection === "bariba-to-french") {
                              return entry.word.toLowerCase() === searchQuery.toLowerCase();
                            } else if (searchDirection === "french-to-bariba") {
                              return entry.french_keywords?.some(k => k.toLowerCase() === searchQuery.toLowerCase());
                            }
                            return false;
                          });
                          
                          return directEntry ? (
                            <DirectTranslation 
                              searchQuery={searchQuery}
                              searchDirection={searchDirection}
                              entry={directEntry}
                            />
                          ) : null;
                        })()
                      )}
                      
                      {fullSearchResults.entries.map((entry, index) => (
                        <DictionaryEntry key={`${entry.word}-${index}`} entry={entry} />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="text-center py-6 lg:py-8">
                        <h3 className="text-base lg:text-lg font-semibold text-foreground mb-2 font-sans">
                          Suggestions intelligentes
                        </h3>
                        <p className="text-sm lg:text-base text-muted-foreground mb-4">
                          {wordSuggestions.length} suggestion{wordSuggestions.length > 1 ? "s" : ""} trouvée{wordSuggestions.length > 1 ? "s" : ""} pour "{searchQuery}"
                        </p>
                        <Button onClick={performFullSearch} size="sm" className="mb-4">
                          Voir tous les résultats
                        </Button>
                      </div>
                      
                      <div className="grid gap-3 lg:gap-4">
                        {wordSuggestions.map((suggestion, index) => (
                          <div key={`${suggestion.word}-${index}`} 
                               className="p-3 lg:p-4 border border-border/50 rounded-lg bg-card hover:bg-muted/30 transition-colors">
                            <div className="flex items-start justify-between gap-3 lg:gap-4">
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-wrap items-center gap-2 mb-2">
                                  <h4 className={`text-base lg:text-lg font-semibold truncate ${suggestion.type === 'bariba' ? 'bariba-text' : ''}`}>
                                    {suggestion.word}
                                  </h4>
                                  <Badge variant={suggestion.type === 'bariba' ? 'default' : 'secondary'} className="text-xs shrink-0">
                                    {suggestion.type === 'bariba' ? 'Bààtɔ̀nú' : 'Français'}
                                  </Badge>
                                  {suggestion.isExact && (
                                    <Badge variant="outline" className="text-xs shrink-0">Exact</Badge>
                                  )}
                                </div>
                                <p className="text-muted-foreground text-sm mb-2 line-clamp-2">
                                  {suggestion.entry.definition}
                                </p>
                                {suggestion.entry.phonetic && (
                                  <p className="text-xs text-muted-foreground/70 truncate">
                                    Phonétique: {suggestion.entry.phonetic}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="shrink-0 text-xs lg:text-sm"
                                onClick={() => {
                                  setSearchQuery(suggestion.word);
                                  performFullSearch();
                                }}
                              >
                                Détails
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
          </TabsContent>

          <TabsContent value="translator">
            <PhraseTranslator />
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 py-6 lg:py-8">
          <div className="text-center space-y-3 lg:space-y-4">
            <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-4 text-xs lg:text-sm text-muted-foreground font-sans">
              <span>Dictionnaire & Traducteur <span className="bariba-text">Bààtɔ̀nú</span>-Français</span>
              <span className="hidden sm:inline">•</span>
              <span className="bariba-text">Bààtɔ̀nú ↔ Fãsi</span>
              <span className="hidden sm:inline">•</span>
              <span>{totalWords} mots</span>
            </div>
            <p className="text-xs text-muted-foreground/70 font-sans px-4">
              Préservation et partage de la langue bariba • Recherche bidirectionnelle & traduction intelligente
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;