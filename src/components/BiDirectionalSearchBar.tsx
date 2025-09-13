import { Search, ArrowLeftRight, ArrowRight, ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { type SearchDirection } from "@/hooks/useDictionarySearch";

interface BiDirectionalSearchBarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  searchDirection: SearchDirection;
  onDirectionChange: (direction: SearchDirection) => void;
  placeholder: string;
  totalResults: number;
}

export const BiDirectionalSearchBar = ({
  searchQuery,
  onSearchChange,
  searchDirection,
  onDirectionChange,
  placeholder,
  totalResults
}: BiDirectionalSearchBarProps) => {
  
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

  return (
    <div className="search-container space-y-6">
      {/* Direction Selector */}
      <div className="flex flex-wrap items-center justify-center gap-2">
        <Button
          variant={getDirectionVariant("all")}
          size="sm"
          onClick={() => onDirectionChange("all")}
          className="font-sans"
        >
          <ArrowLeftRight className="h-4 w-4 mr-2" />
          Tout chercher
        </Button>
        <Button
          variant={getDirectionVariant("bariba-to-french")}
          size="sm"
          onClick={() => onDirectionChange("bariba-to-french")}
          className="font-sans"
        >
          <span className="bariba-text mr-2">Bààtɔ̀nú</span>
          <ArrowRight className="h-4 w-4 mx-1" />
          <span>Français</span>
        </Button>
        <Button
          variant={getDirectionVariant("french-to-bariba")}
          size="sm"
          onClick={() => onDirectionChange("french-to-bariba")}
          className="font-sans"
        >
          <span className="mr-2">Français</span>
          <ArrowLeft className="h-4 w-4 mx-1" />
          <span className="bariba-text">Bààtɔ̀nú</span>
        </Button>
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-12 pr-4 py-4 text-lg font-sans border-0 bg-background/50 backdrop-blur-sm
                     focus:ring-2 focus:ring-primary/20 focus:bg-background/80 transition-all duration-300
                     placeholder:text-muted-foreground/70"
        />
        <div className="absolute right-4 top-1/2 transform -translate-y-1/2">
          <Badge variant="secondary" className="font-sans">
            {getDirectionIcon()}
            <span className="ml-1">{getDirectionLabel(searchDirection)}</span>
          </Badge>
        </div>
      </div>

      {/* Search Info */}
      <div className="flex items-center justify-between text-sm text-muted-foreground font-sans">
        <p>
          Recherchez parmi <strong>{totalResults}</strong> mots du dictionnaire
        </p>
        {searchQuery && (
          <Badge variant="outline">
            {totalResults} résultat{totalResults > 1 ? "s" : ""}
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
              onClick={() => onSearchChange("aagu")}
              className="font-sans text-xs"
            >
              <span className="bariba-text">aagu</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("salut")}
              className="font-sans text-xs"
            >
              salut
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("menuisier")}
              className="font-sans text-xs"
            >
              menuisier
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onSearchChange("àgbara")}
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