import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export const SearchBar = ({ onSearch, placeholder = "Rechercher un mot en bariba..." }: SearchBarProps) => {
  const [query, setQuery] = useState("");

  const handleSearch = (value: string) => {
    setQuery(value);
    onSearch(value);
  };

  return (
    <div className="search-container">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder={placeholder}
          value={query}
          onChange={(e) => handleSearch(e.target.value)}
          className="pl-12 pr-4 py-3 text-lg font-sans border-0 bg-background/50 backdrop-blur-sm
                     focus:ring-2 focus:ring-primary/20 focus:bg-background/80 transition-all duration-300
                     placeholder:text-muted-foreground/70"
        />
      </div>
      <p className="text-sm text-muted-foreground mt-3 font-sans">
        Recherchez parmi plus de 20 mots du dictionnaire bariba-français
      </p>
    </div>
  );
};