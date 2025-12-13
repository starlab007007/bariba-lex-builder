import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Building2, 
  Heart, 
  Search,
  LayoutGrid,
  Brain,
  BookOpen,
  Settings,
  Smartphone,
  ArrowLeft,
  Mic,
  MessageSquare,
  Radio,
  User,
  Compass,
  AlertTriangle,
  CreditCard,
  FileText,
  Accessibility,
  ShoppingBag,
  Wheat,
  Library,
  Phone
} from "lucide-react";
import { Link } from "react-router-dom";

// Types
interface Screen {
  id: number;
  title: string;
  category: string;
  description: string;
  gradient: string;
  icon: any;
  screenNumber: number;
}

// Données des 20 écrans YOVO exactement comme dans les captures
const screens: Screen[] = [
  {
    id: 1,
    title: "Splash Screen",
    category: "Social",
    description: "BOT.BJ - Votre voix, votre langue. Connexion et création de compte",
    gradient: "from-indigo-900 via-purple-900 to-slate-950",
    icon: Users,
    screenNumber: 1
  },
  {
    id: 2,
    title: "Fil d'actualité",
    category: "Social",
    description: "Feed avec posts vocaux, vidéos et partages en langues locales",
    gradient: "from-slate-800 via-gray-900 to-slate-950",
    icon: Radio,
    screenNumber: 2
  },
  {
    id: 3,
    title: "Traducteur Vocal",
    category: "IA",
    description: "Traduction vocale temps réel Français ↔ Bariba avec micro",
    gradient: "from-amber-800 via-orange-900 to-slate-950",
    icon: Mic,
    screenNumber: 3
  },
  {
    id: 4,
    title: "IA Santé Locale",
    category: "IA Santé",
    description: "Assistant santé vocal - Trouvez un centre de santé près de vous",
    gradient: "from-teal-800 via-emerald-900 to-slate-950",
    icon: Heart,
    screenNumber: 4
  },
  {
    id: 5,
    title: "Emploi Audio Jobs",
    category: "Opportunités",
    description: "Offres d'emploi avec candidature vocale - Aide-Jardinier, Commerce...",
    gradient: "from-slate-800 via-slate-900 to-slate-950",
    icon: Search,
    screenNumber: 5
  },
  {
    id: 6,
    title: "Marketplace Locale",
    category: "Business",
    description: "BOT.BJ Marketplace - Artisanat, Agriculture, Services, Troc",
    gradient: "from-slate-800 via-gray-900 to-slate-950",
    icon: ShoppingBag,
    screenNumber: 6
  },
  {
    id: 7,
    title: "Conseil Agritech",
    category: "Business",
    description: "Conseils agricoles vocaux avec météo 32°C et recommandations",
    gradient: "from-amber-700 via-yellow-800 to-green-900",
    icon: Wheat,
    screenNumber: 7
  },
  {
    id: 8,
    title: "Bibliothèque Locale",
    category: "Culture",
    description: "Contenus culturels, histoires et traditions orales en Bariba",
    gradient: "from-amber-900 via-orange-900 to-slate-950",
    icon: Library,
    screenNumber: 8
  },
  {
    id: 9,
    title: "IA Business Locale",
    category: "Business",
    description: "Assistant IA pour rédiger offres et conseils commerce vocal",
    gradient: "from-emerald-800 via-teal-900 to-slate-950",
    icon: Building2,
    screenNumber: 9
  },
  {
    id: 10,
    title: "Conversations Vocales",
    category: "Social",
    description: "Messages vocaux - Afi Kossou, Non lus, Groupe Marché Cotonou",
    gradient: "from-slate-800 via-gray-900 to-slate-950",
    icon: MessageSquare,
    screenNumber: 10
  },
  {
    id: 11,
    title: "Enregistrement Vocal",
    category: "Social",
    description: "Interface d'enregistrement audio avec contrôles play/pause",
    gradient: "from-gray-800 via-slate-900 to-slate-950",
    icon: Mic,
    screenNumber: 11
  },
  {
    id: 12,
    title: "Live Audio",
    category: "Social",
    description: "Discussion Commerce au Marché Dantokpa - Salles audio en direct",
    gradient: "from-gray-800 via-slate-900 to-slate-950",
    icon: Radio,
    screenNumber: 12
  },
  {
    id: 13,
    title: "Profil Utilisateur",
    category: "Social",
    description: "Profil Assé Éponaé avec statistiques, abonnés et publications",
    gradient: "from-slate-700 via-gray-900 to-slate-950",
    icon: User,
    screenNumber: 13
  },
  {
    id: 14,
    title: "Découvrir",
    category: "Social",
    description: "Explorer catégories: Agriculture, Culture, Artisanat...",
    gradient: "from-orange-800 via-amber-900 to-slate-950",
    icon: Compass,
    screenNumber: 14
  },
  {
    id: 15,
    title: "Groupe Vocal",
    category: "IA",
    description: "Groupes vocaux avec 46 membres - Discussions en langues locales",
    gradient: "from-gray-800 via-slate-900 to-slate-950",
    icon: Users,
    screenNumber: 15
  },
  {
    id: 16,
    title: "SOS Urgences",
    category: "Services",
    description: "Bouton SOS rouge - GPS, Alertes contacts, Centre de soins",
    gradient: "from-red-900 via-red-950 to-slate-950",
    icon: AlertTriangle,
    screenNumber: 16
  },
  {
    id: 17,
    title: "IA Finance Mobile",
    category: "Business",
    description: "Services bancaires - BHM 1,1M FCFA, transferts, historique",
    gradient: "from-slate-800 via-gray-900 to-slate-950",
    icon: CreditCard,
    screenNumber: 17
  },
  {
    id: 18,
    title: "Documents Officiels",
    category: "Services",
    description: "Aide administrative vocale - CNI, Certificats, Permis",
    gradient: "from-amber-900 via-orange-900 to-slate-950",
    icon: FileText,
    screenNumber: 18
  },
  {
    id: 19,
    title: "Paramètres",
    category: "Settings",
    description: "Configuration compte, langue, mode hors-ligne, accessibilité",
    gradient: "from-gray-800 via-slate-900 to-slate-950",
    icon: Settings,
    screenNumber: 19
  },
  {
    id: 20,
    title: "Accessibilité",
    category: "Settings",
    description: "Mode gros boutons, contraste, vitesse lecture, vibration",
    gradient: "from-slate-800 via-slate-900 to-slate-950",
    icon: Accessibility,
    screenNumber: 20
  }
];

// Catégories principales (header cards) - exactement comme dans les captures
const mainCategories = [
  { 
    id: "Social", 
    name: "Vocal", 
    subtitle: "Réseau Social", 
    icon: Users, 
    gradient: "from-blue-600/40 to-blue-900/30",
    borderColor: "border-blue-500/40",
    textColor: "text-blue-400",
    subtitleColor: "text-blue-300/70"
  },
  { 
    id: "Business", 
    name: "Commerce", 
    subtitle: "IA Business", 
    icon: Building2, 
    gradient: "from-orange-600/40 to-orange-900/30",
    borderColor: "border-orange-500/40",
    textColor: "text-orange-400",
    subtitleColor: "text-orange-300/70"
  },
  { 
    id: "IA Santé", 
    name: "Conseil", 
    subtitle: "IA Santé", 
    icon: Heart, 
    gradient: "from-green-600/40 to-green-900/30",
    borderColor: "border-green-500/40",
    textColor: "text-green-400",
    subtitleColor: "text-green-300/70"
  },
  { 
    id: "Opportunités", 
    name: "Emploi", 
    subtitle: "Opportunités", 
    icon: Search, 
    gradient: "from-teal-600/40 to-teal-900/30",
    borderColor: "border-teal-500/40",
    textColor: "text-teal-400",
    subtitleColor: "text-teal-300/70"
  }
];

// Filtres avec compteurs exacts - comme dans les captures
const filters = [
  { id: "Tous", name: "Tous", icon: LayoutGrid, count: 20 },
  { id: "Social", name: "Social", icon: Users, count: 7 },
  { id: "IA", name: "IA", icon: Brain, count: 2 },
  { id: "IA Santé", name: "IA Santé", icon: Heart, count: 1 },
  { id: "Business", name: "Business", icon: Building2, count: 4 },
  { id: "Opportunités", name: "Opportunités", icon: Search, count: 1 },
  { id: "Culture", name: "Culture", icon: BookOpen, count: 1 },
  { id: "Services", name: "Services", icon: Smartphone, count: 2 },
  { id: "Settings", name: "Settings", icon: Settings, count: 2 }
];

// Category colors
const categoryColors: Record<string, { bg: string; text: string; border: string }> = {
  "Social": { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30" },
  "IA": { bg: "bg-purple-500/20", text: "text-purple-400", border: "border-purple-500/30" },
  "IA Santé": { bg: "bg-green-500/20", text: "text-green-400", border: "border-green-500/30" },
  "Business": { bg: "bg-orange-500/20", text: "text-orange-400", border: "border-orange-500/30" },
  "Opportunités": { bg: "bg-teal-500/20", text: "text-teal-400", border: "border-teal-500/30" },
  "Culture": { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30" },
  "Services": { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30" },
  "Settings": { bg: "bg-slate-500/20", text: "text-slate-400", border: "border-slate-500/30" }
};

const YovoGallery = () => {
  const [activeFilter, setActiveFilter] = useState("Tous");

  const filteredScreens = activeFilter === "Tous" 
    ? screens 
    : screens.filter(s => s.category === activeFilter);

  const getCategoryColors = (category: string) => {
    return categoryColors[category] || categoryColors["Social"];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/80 border-b border-white/5">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="p-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors border border-white/10"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Yovo Gallery</h1>
                <p className="text-sm text-slate-400">20 écrans prototypes YOVO</p>
              </div>
            </div>
            <Badge variant="outline" className="border-white/20 text-white bg-white/5">
              {screens.length} écrans
            </Badge>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Category Header Cards - 4 glassmorphism cards */}
        <section className="mb-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {mainCategories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Card 
                  key={cat.id}
                  onClick={() => setActiveFilter(cat.id)}
                  className={`bg-gradient-to-br ${cat.gradient} backdrop-blur-xl border ${cat.borderColor} cursor-pointer hover:scale-105 transition-all duration-300 group`}
                >
                  <CardContent className="p-5">
                    <Icon className={`w-7 h-7 ${cat.textColor} mb-3`} />
                    <p className={`font-bold text-lg ${cat.textColor}`}>{cat.name}</p>
                    <p className={`text-sm ${cat.subtitleColor}`}>{cat.subtitle}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Filter Tabs - Horizontal scrollable */}
        <section className="mb-8">
          <div className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide">
            {filters.map((filter) => {
              const Icon = filter.icon;
              const isActive = activeFilter === filter.id;
              return (
                <button
                  key={filter.id}
                  onClick={() => setActiveFilter(filter.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-200 ${
                    isActive
                      ? "bg-white text-slate-900 shadow-lg"
                      : "bg-white/5 text-slate-300 hover:bg-white/10 border border-white/10"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {filter.name}
                  <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                    isActive
                      ? "bg-slate-900 text-white"
                      : "bg-white/10 text-slate-400"
                  }`}>
                    {filter.count}
                  </span>
                </button>
              );
            })}
          </div>
        </section>

        {/* Masonry Grid - 5 columns on large screens */}
        <section>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filteredScreens.map((screen) => {
              const catColors = getCategoryColors(screen.category);
              const ScreenIcon = screen.icon;
              return (
                <Card 
                  key={screen.id}
                  className="bg-slate-900/50 border-white/5 backdrop-blur-xl overflow-hidden group hover:border-white/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl"
                >
                  {/* Screen Preview - Phone mockup style */}
                  <div className={`relative aspect-[9/16] bg-gradient-to-br ${screen.gradient} overflow-hidden`}>
                    {/* Phone frame effect */}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="w-full h-full p-4 flex flex-col items-center justify-center text-center">
                        <div className={`p-4 rounded-2xl ${catColors.bg} mb-4`}>
                          <ScreenIcon className={`w-10 h-10 ${catColors.text}`} />
                        </div>
                        <h4 className="text-white font-semibold text-sm mb-2">{screen.title}</h4>
                        <p className="text-white/60 text-xs px-2 line-clamp-2">{screen.description}</p>
                      </div>
                    </div>
                    
                    {/* Screen number badge */}
                    <div className="absolute top-3 left-3">
                      <Badge className={`${catColors.bg} ${catColors.text} border-0 text-xs font-bold`}>
                        #{screen.screenNumber}
                      </Badge>
                    </div>
                    
                    {/* Hover overlay */}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <div className="text-center px-4">
                        <p className="text-white text-sm">{screen.description}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Card Footer */}
                  <CardContent className="p-3 bg-slate-900/80">
                    <h3 className={`font-semibold text-sm ${catColors.text}`}>{screen.title}</h3>
                    <p className="text-slate-500 text-xs mt-1">Écran {screen.screenNumber}/20</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Empty State */}
        {filteredScreens.length === 0 && (
          <div className="text-center py-20">
            <Phone className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400">Aucun écran trouvé pour cette catégorie</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-500 text-sm">
            YOVO Gallery • 20 Prototypes d'application mobile vocale
          </p>
        </div>
      </footer>
    </div>
  );
};

export default YovoGallery;
