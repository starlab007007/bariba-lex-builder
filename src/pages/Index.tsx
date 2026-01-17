import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { SmartSearchBar } from "@/components/SmartSearchBar";
import { DictionaryEntry } from "@/components/DictionaryEntry";
import { DirectTranslation } from "@/components/DirectTranslation";
import { DictionaryStats } from "@/components/DictionaryStats";
import { PhraseTranslator } from "@/components/PhraseTranslator";
import { SelectedEntryDisplay } from "@/components/SelectedEntryDisplay";
import { SimilarSuggestions } from "@/components/SimilarSuggestions";
import { AssetDiagnostic } from "@/components/AssetDiagnostic";

import { useSmartDictionarySearch } from "@/hooks/useSmartDictionarySearch";
import { Book, Languages, Globe, ArrowLeftRight, MessageSquare, LogIn, Shield, LogOut, Trophy, Mic, MessagesSquare, HardDrive } from "lucide-react";
import { VoiceTab } from "@/components/voice/VoiceTab";
import { ConversationMode } from "@/components/voice/ConversationMode";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const Index = () => {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  
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
    totalWords,
    selectEntry,
    selectedEntry
  } = useSmartDictionarySearch();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Header - Responsive */}
      <header className="bg-gradient-to-br from-primary/10 via-background to-accent/5 border-b border-border/50">
        <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-12">
          {/* Auth Buttons - Responsive */}
          <div className="flex flex-wrap justify-end mb-3 sm:mb-4 gap-1.5 sm:gap-2">
            {user ? (
              <>
                <Button
                  onClick={() => navigate('/gamification')}
                  variant="outline"
                  size="sm"
                  className="text-xs sm:text-sm h-8 sm:h-9"
                >
                  <Trophy className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Récompenses</span>
                  <span className="sm:hidden">Points</span>
                </Button>
                {isAdmin && (
                  <Button
                    onClick={() => navigate('/admin')}
                    variant="outline"
                    size="sm"
                    className="text-xs sm:text-sm h-8 sm:h-9"
                  >
                    <Shield className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Administration</span>
                    <span className="sm:hidden">Admin</span>
                  </Button>
                )}
                <Button onClick={signOut} variant="ghost" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                  <LogOut className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">Déconnexion</span>
                  <span className="sm:hidden">Quitter</span>
                </Button>
              </>
            ) : (
              <Button onClick={() => navigate('/auth')} variant="default" size="sm" className="text-xs sm:text-sm h-8 sm:h-9">
                <LogIn className="mr-1 sm:mr-2 h-3 w-3 sm:h-4 sm:w-4" />
                Connexion
              </Button>
            )}
          </div>
          
          <div className="text-center space-y-3 sm:space-y-4 lg:space-y-6">
            <div className="flex items-center justify-center gap-2 sm:gap-2 lg:gap-3 mb-2 sm:mb-3 lg:mb-4">
              <Book className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary" />
              <ArrowLeftRight className="h-4 w-4 sm:h-5 sm:w-5 lg:h-6 lg:w-6 text-accent" />
              <Languages className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-primary" />
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-foreground font-sans tracking-tight px-2">
              Dictionnaire & Traducteur <span className="bariba-text">Bààtɔ̀nú</span>
            </h1>
            <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 mb-2 sm:mb-3 lg:mb-4 px-2">
              <Badge variant="secondary" className="font-sans text-xs sm:text-xs lg:text-sm">
                <Globe className="h-3 w-3 sm:h-3 sm:w-3 lg:h-4 lg:w-4 mr-1" />
                <span className="bariba-text">Bààtɔ̀nú</span> ↔ Français
              </Badge>
              <Badge variant="outline" className="font-sans text-xs sm:text-xs lg:text-sm">
                Dictionnaire & Traduction
              </Badge>
            </div>
            <p className="text-sm sm:text-base lg:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed px-3 sm:px-4">
              Explorez la richesse de la langue bariba (<span className="bariba-text">Bààtɔ̀nú</span>) avec ce dictionnaire interactif 
              et traduisez des phrases complètes entre le français et le bariba.
            </p>
          </div>
        </div>
      </header>

      {/* Main Content with Tabs - Responsive */}
      <div className="container mx-auto px-3 sm:px-4 py-4 sm:py-6 lg:py-8">
        <Tabs defaultValue="assets" className="w-full">
          <TabsList className="grid w-full max-w-3xl mx-auto grid-cols-5 mb-4 sm:mb-6 lg:mb-8">
            <TabsTrigger value="assets" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
              <HardDrive className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Assets</span>
              <span className="sm:hidden">📁</span>
            </TabsTrigger>
            <TabsTrigger value="dictionary" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
              <Book className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Dictionnaire</span>
              <span className="sm:hidden">Dict.</span>
            </TabsTrigger>
            <TabsTrigger value="translator" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
              <MessageSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Traducteur</span>
              <span className="sm:hidden">Trad.</span>
            </TabsTrigger>
            <TabsTrigger value="voice" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
              <Mic className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Voix</span>
              <span className="sm:hidden">🎤</span>
            </TabsTrigger>
            <TabsTrigger value="conversation" className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-2.5">
              <MessagesSquare className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Chat</span>
              <span className="sm:hidden">💬</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="assets" className="space-y-8">
            <AssetDiagnostic />
          </TabsContent>

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
                  ) : selectedEntry ? (
                    /* Affichage intelligent en 3 sections */
                    <div className="space-y-6">
                      {/* Section 1 & 2: Entrée sélectionnée avec détails complets */}
                      <SelectedEntryDisplay 
                        entry={selectedEntry}
                        searchDirection={searchDirection}
                      />
                      
                      {/* Section 3: Suggestions similaires */}
                      {fullSearchResults.entries.length > 1 && (
                        <SimilarSuggestions
                          suggestions={fullSearchResults.entries}
                          onSelectEntry={selectEntry}
                          selectedEntry={selectedEntry}
                        />
                      )}
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
                        Commencez votre recherche
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        Tapez un mot en bariba ou en français dans la barre de recherche
                      </p>
                      <div className="space-y-2">
                        <p className="text-sm text-muted-foreground">Essayez par exemple :</p>
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
                            onClick={() => setSearchQuery("maison")}
                            className="text-sm px-3 py-1 bg-muted rounded-full hover:bg-muted/80 transition-colors"
                          >
                            maison
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:gap-4">
                      {(showFullResults ? fullSearchResults.entries : wordSuggestions).map((entry, index) => (
                        <div 
                          key={`${entry.word}-${index}`} 
                          onClick={() => selectEntry(entry)}
                          className="cursor-pointer transition-transform hover:scale-[1.01]"
                        >
                          <DictionaryEntry
                            entry={entry}
                            searchQuery={searchQuery}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </section>
              </div>
            </main>
          </TabsContent>

          <TabsContent value="translator" className="space-y-6">
            <PhraseTranslator />
          </TabsContent>
          
          <TabsContent value="voice" className="space-y-6">
            <VoiceTab />
          </TabsContent>
          
          <TabsContent value="conversation" className="space-y-6">
            <ConversationMode />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Index;
