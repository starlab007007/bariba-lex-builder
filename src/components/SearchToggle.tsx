import { ArrowRight, ArrowLeft, ArrowLeftRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { type SearchDirection } from "@/hooks/useDictionarySearch";

interface SearchToggleProps {
  searchDirection: SearchDirection;
  onDirectionChange: (direction: SearchDirection) => void;
}

export const SearchToggle = ({ searchDirection, onDirectionChange }: SearchToggleProps) => {
  const directions: { key: SearchDirection; label: string; icon: JSX.Element }[] = [
    {
      key: "all",
      label: "Tout",
      icon: <ArrowLeftRight className="h-4 w-4" />
    },
    {
      key: "bariba-to-french",
      label: "Bariba → FR",
      icon: <ArrowRight className="h-4 w-4" />
    },
    {
      key: "french-to-bariba", 
      label: "FR → Bariba",
      icon: <ArrowLeft className="h-4 w-4" />
    }
  ];

  return (
    <div className="flex items-center gap-1 p-1 bg-muted/30 rounded-lg">
      {directions.map(({ key, label, icon }) => (
        <Button
          key={key}
          variant={searchDirection === key ? "default" : "ghost"}
          size="sm"
          onClick={() => onDirectionChange(key)}
          className="font-sans text-xs h-8"
        >
          {icon}
          <span className="ml-1">{label}</span>
        </Button>
      ))}
    </div>
  );
};