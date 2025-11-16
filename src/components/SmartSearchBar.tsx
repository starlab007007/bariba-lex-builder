import { Search, ArrowLeftRight, ArrowRight, ArrowLeft, ChevronDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { type SearchDirection, type WordSuggestion } from "@/hooks/useSmartDictionarySearch";
import { useState, useRef, useEffect } from "react";

interface SmartSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchDirection: SearchDirection;
  onDirectionChange: (direction: SearchDirection) => void;
  placeholder: string;
  totalWords: number;
  wordSuggestions: WordSuggestion[];
  onPerformFullSearch: () => void;
  showFullResults: boolean;
}

export const SmartSearchBar = ({
  searchQuery,
  onSearchChange,
  searchDirection,
  onDirectionChange,
  placeholder,
  totalWords,
  wordSuggestions,
  onPerformFullSearch,
  showFullResults
}: SmartSearchBarProps) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestion, setSelectedSuggestion] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const getDirectionIcon = () => {
    switch (searchDirection) {
      case "bariba-to-french":
        return <ArrowRight className="h-4 w-4" />;
      case "french-to-bariba":
        return <ArrowLeft className="h-4 w-4" />;
      default:
        return <ArrowLeftRight className="h-4 w-4" />;
    }
  };

  const getDirectionVariant = (direction: SearchDirection) => {
    return searchDirection === direction ? "default" : "outline";
  };

  const getDirectionLabel = (direction: SearchDirection) => {
    switch (direction) {
      case "bariba-to-french":
        return "Bariba → Français";
      case "french-to-bariba":
        return "Français → Bariba";
      default:
        return "Bidirectionnel";
    }
  };

  const handleInputChange = (value: string) => {
    onSearchChange(value);
    setShowSuggestions(value.trim().length > 0);
    setSelectedSuggestion(-1);
  };

  const handleSuggestionClick = (suggestion: WordSuggestion) => {
    onSearchChange(suggestion.word);
    setShowSuggestions(false);
    onPerformFullSearch();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || wordSuggestions.length === 0) {
      if (e.key === 'Enter' && searchQuery.trim()) {
        onPerformFullSearch();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedSuggestion(prev => 
          prev < wordSuggestions.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedSuggestion(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedSuggestion >= 0) {
          handleSuggestionClick(wordSuggestions[selectedSuggestion]);
        } else if (searchQuery.trim()) {
          onPerformFullSearch();
          setShowSuggestions(false);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedSuggestion(-1);
        break;
    }
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
          inputRef.current && !inputRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="space-y-4 w-full max-w-4xl mx-auto">
      {/* Label explicite pour le champ de recherche */}
      <div className="text-center mb-2">
        <label htmlFor="dictionary-search" className="text-sm font-medium text-muted-foreground">
          🔍 Recherchez un mot dans le dictionnaire
        </label>
      </div>

      {/* Direction Selector - Responsive */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={getDirectionVariant("all")}
          size="sm"
          onClick={() => onDirectionChange("all")}
          className="font-sans text-xs sm:text-sm"
        >
          <ArrowLeftRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
          <span className="hidden sm:inline">Tout chercher</span>
          <span className="sm:hidden">Tous</span>
        </Button>
        <Button
          variant={getDirectionVariant("bariba-to-french")}
          size="sm"
          onClick={() => onDirectionChange("bariba-to-french")}
          className="font-sans text-xs sm:text-sm"
        >
          <span className="bariba-text mr-1.5 sm:mr-2">Bààtɔ̀nú</span>
          <ArrowRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-0.5 sm:mx-1" />
          <span>Français</span>
        </Button>
        <Button
          variant={getDirectionVariant("french-to-bariba")}
          size="sm"
          onClick={() => onDirectionChange("french-to-bariba")}
          className="font-sans text-xs sm:text-sm"
        >
          <span className="mr-1.5 sm:mr-2">Français</span>
          <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4 mx-0.5 sm:mx-1" />
          <span className="bariba-text">Bààtɔ̀nú</span>
        </Button>
      </div>

      {/* Smart Search Input - Enhanced Visibility */}
      <div className="relative">
        <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-primary z-10" />
        <Input
          id="dictionary-search"
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(searchQuery.trim().length > 0)}
          className="pl-10 sm:pl-12 pr-4 py-3 sm:py-4 text-base sm:text-lg font-sans border-2 border-primary/30 focus:border-primary focus:ring-4 focus:ring-primary/20
                     shadow-md hover:shadow-lg transition-all duration-200 bg-background/50 backdrop-blur-sm
                     placeholder:text-muted-foreground/70 font-medium"
        />
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center gap-2">
          {searchQuery && !showFullResults && (
            <Button
              onClick={onPerformFullSearch}
              size="sm"
              variant="ghost"
              className="text-xs px-2 py-1 h-auto"
            >
              <ChevronDown className="h-3 w-3 mr-1" />
              Voir tout
            </Button>
          )}
          <Badge variant="secondary" className="font-sans">
            {getDirectionIcon()}
            <span className="ml-1">{getDirectionLabel(searchDirection)}</span>
          </Badge>
        </div>

        {/* Smart Suggestions */}
        {showSuggestions && wordSuggestions.length > 0 && (
          <Card ref={suggestionsRef} className="absolute top-full left-0 right-0 mt-2 z-20 max-h-80 overflow-y-auto bg-background/95 backdrop-blur-sm border border-border/50 shadow-lg">
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2 px-2">
                Suggestions intelligentes ({wordSuggestions.length})
              </div>
              {wordSuggestions.map((suggestion, index) => (
                <div
                  key={`${suggestion.word}-${index}`}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors
                    ${selectedSuggestion === index ? 'bg-primary/10 border border-primary/20' : 'hover:bg-muted/50'}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                >
                  <div className="flex items-center gap-3">
                    <span className={`font-medium ${suggestion.type === 'bariba' ? 'bariba-text' : ''}`}>
                      {suggestion.word}
                    </span>
                    <Badge 
                      variant={suggestion.type === 'bariba' ? 'default' : 'secondary'} 
                      className="text-xs"
                    >
                      {suggestion.type === 'bariba' ? 'Bariba' : 'Français'}
                    </Badge>
                    {suggestion.isExact && (
                      <Badge variant="outline" className="text-xs">
                        Exact
                      </Badge>
                    )}
                  </div>
                  <div className="text-xs text-muted-foreground max-w-xs truncate">
                    {suggestion.entry.definition}
                  </div>
                </div>
              ))}
              
              {searchQuery.trim() && (
                <div className="mt-2 pt-2 border-t border-border/30">
                  <Button
                    onClick={onPerformFullSearch}
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between text-sm"
                  >
                    <span>Recherche complète pour "{searchQuery}"</span>
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          </Card>
        )}
      </div>

      {/* Search Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground font-sans">
        <p>
          Recherchez parmi <strong>{totalWords}</strong> mots du dictionnaire
        </p>
        {searchQuery && wordSuggestions.length > 0 && !showFullResults && (
          <Badge variant="outline">
            {wordSuggestions.length} suggestion{wordSuggestions.length > 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {/* Quick Examples */}
      {!searchQuery && (
        <div className="text-center space-y-2">
          <p className="text-sm text-muted-foreground font-sans">
            Exemples de recherche :
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInputChange("aagu")}
              className="font-sans text-xs"
            >
              <span className="bariba-text">aagu</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInputChange("salut")}
              className="font-sans text-xs"
            >
              salut
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInputChange("menuisier")}
              className="font-sans text-xs"
            >
              menuisier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleInputChange("àgbara")}
              className="font-sans text-xs"
            >
              <span className="bariba-text">àgbara</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};