import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Users, 
  Briefcase, 
  Heart, 
  Lightbulb,
  ArrowLeft
} from "lucide-react";
import { Link } from "react-router-dom";

// Types
interface Screen {
  id: number;
  title: string;
  category: string;
  description: string;
  imageUrl: string;
  screenNumber: number;
}

// Categories data
const categories = [
  { 
    id: "social", 
    name: "Social", 
    icon: Users, 
    color: "from-blue-500 to-blue-600",
    bgColor: "bg-blue-500/20",
    textColor: "text-blue-400",
    count: 5
  },
  { 
    id: "business", 
    name: "Business", 
    icon: Briefcase, 
    color: "from-orange-500 to-orange-600",
    bgColor: "bg-orange-500/20",
    textColor: "text-orange-400",
    count: 5
  },
  { 
    id: "sante", 
    name: "Santé", 
    icon: Heart, 
    color: "from-green-500 to-green-600",
    bgColor: "bg-green-500/20",
    textColor: "text-green-400",
    count: 5
  },
  { 
    id: "opportunites", 
    name: "Opportunités", 
    icon: Lightbulb, 
    color: "from-purple-500 to-purple-600",
    bgColor: "bg-purple-500/20",
    textColor: "text-purple-400",
    count: 5
  }
];

// Screens data - 20 prototype screens
const screens: Screen[] = [
  // Social screens
  { id: 1, title: "Fil d'actualité", category: "social", description: "Écran principal du fil d'actualité avec publications et interactions", imageUrl: "https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=400&h=600&fit=crop", screenNumber: 1 },
  { id: 2, title: "Profil utilisateur", category: "social", description: "Page de profil avec statistiques et informations personnelles", imageUrl: "https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&h=600&fit=crop", screenNumber: 2 },
  { id: 3, title: "Messagerie", category: "social", description: "Interface de chat et conversations privées", imageUrl: "https://images.unsplash.com/photo-1577563908411-5077b6dc7624?w=400&h=600&fit=crop", screenNumber: 3 },
  { id: 4, title: "Notifications", category: "social", description: "Centre de notifications et alertes personnalisées", imageUrl: "https://images.unsplash.com/photo-1614680376739-414d95ff43df?w=400&h=600&fit=crop", screenNumber: 4 },
  { id: 5, title: "Communauté", category: "social", description: "Groupes et communautés thématiques", imageUrl: "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&h=600&fit=crop", screenNumber: 5 },
  
  // Business screens
  { id: 6, title: "Dashboard", category: "business", description: "Tableau de bord analytique avec KPIs et graphiques", imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=400&h=600&fit=crop", screenNumber: 6 },
  { id: 7, title: "Gestion de projets", category: "business", description: "Interface de suivi et gestion des projets", imageUrl: "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&h=600&fit=crop", screenNumber: 7 },
  { id: 8, title: "Facturation", category: "business", description: "Système de facturation et paiements", imageUrl: "https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=400&h=600&fit=crop", screenNumber: 8 },
  { id: 9, title: "Équipe", category: "business", description: "Gestion d'équipe et collaboration", imageUrl: "https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=400&h=600&fit=crop", screenNumber: 9 },
  { id: 10, title: "Rapports", category: "business", description: "Génération de rapports et exports", imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400&h=600&fit=crop", screenNumber: 10 },
  
  // Health screens
  { id: 11, title: "Suivi santé", category: "sante", description: "Dashboard de suivi des indicateurs de santé", imageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?w=400&h=600&fit=crop", screenNumber: 11 },
  { id: 12, title: "Activité physique", category: "sante", description: "Tracking d'activités sportives et exercices", imageUrl: "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?w=400&h=600&fit=crop", screenNumber: 12 },
  { id: 13, title: "Nutrition", category: "sante", description: "Suivi alimentaire et recommandations", imageUrl: "https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&h=600&fit=crop", screenNumber: 13 },
  { id: 14, title: "Sommeil", category: "sante", description: "Analyse du sommeil et conseils", imageUrl: "https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=400&h=600&fit=crop", screenNumber: 14 },
  { id: 15, title: "Méditation", category: "sante", description: "Séances de méditation guidées", imageUrl: "https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&h=600&fit=crop", screenNumber: 15 },
  
  // Opportunities screens
  { id: 16, title: "Emplois", category: "opportunites", description: "Recherche et offres d'emploi personnalisées", imageUrl: "https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?w=400&h=600&fit=crop", screenNumber: 16 },
  { id: 17, title: "Formation", category: "opportunites", description: "Cours et formations en ligne", imageUrl: "https://images.unsplash.com/photo-1501504905252-473c47e087f8?w=400&h=600&fit=crop", screenNumber: 17 },
  { id: 18, title: "Mentorat", category: "opportunites", description: "Connexion avec des mentors experts", imageUrl: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=400&h=600&fit=crop", screenNumber: 18 },
  { id: 19, title: "Événements", category: "opportunites", description: "Calendrier d'événements et networking", imageUrl: "https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=400&h=600&fit=crop", screenNumber: 19 },
  { id: 20, title: "Ressources", category: "opportunites", description: "Bibliothèque de ressources et outils", imageUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=600&fit=crop", screenNumber: 20 }
];

// Filter tabs
const filterTabs = [
  { id: "all", name: "Tous", count: 20 },
  { id: "social", name: "Social", count: 5 },
  { id: "business", name: "Business", count: 5 },
  { id: "sante", name: "Santé", count: 5 },
  { id: "opportunites", name: "Opportunités", count: 5 }
];

const YovoGallery = () => {
  const [activeFilter, setActiveFilter] = useState("all");

  const filteredScreens = activeFilter === "all" 
    ? screens 
    : screens.filter(s => s.category === activeFilter);

  const getCategoryStyle = (category: string) => {
    const cat = categories.find(c => c.id === category);
    return cat || categories[0];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link 
                to="/" 
                className="p-2 rounded-lg bg-white/10 hover:bg-white/20 transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-white" />
              </Link>
              <div>
                <h1 className="text-2xl font-bold text-white">Yovo Gallery</h1>
                <p className="text-sm text-slate-400">Prototypes d'écrans d'applications mobiles</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-white/20 text-white">
                {screens.length} écrans
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Category Cards */}
        <section className="mb-10">
          <h2 className="text-lg font-semibold text-white mb-4">Catégories</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {categories.map((cat) => {
              const Icon = cat.icon;
              return (
                <Card 
                  key={cat.id}
                  className="bg-white/5 border-white/10 backdrop-blur-xl cursor-pointer hover:bg-white/10 transition-all hover:scale-105"
                  onClick={() => setActiveFilter(cat.id)}
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className={`p-3 rounded-xl bg-gradient-to-br ${cat.color}`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <p className="font-semibold text-white">{cat.name}</p>
                      <p className="text-sm text-slate-400">{cat.count} écrans</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Filter Tabs */}
        <section className="mb-6">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {filterTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveFilter(tab.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
                  activeFilter === tab.id
                    ? "bg-white text-slate-900"
                    : "bg-white/10 text-white hover:bg-white/20"
                }`}
              >
                {tab.name}
                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs ${
                  activeFilter === tab.id
                    ? "bg-slate-900 text-white"
                    : "bg-white/20"
                }`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Masonry Grid */}
        <section>
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-4 space-y-4">
            {filteredScreens.map((screen) => {
              const catStyle = getCategoryStyle(screen.category);
              return (
                <Card 
                  key={screen.id}
                  className="break-inside-avoid bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden group hover:bg-white/10 transition-all hover:scale-[1.02] hover:shadow-2xl"
                >
                  <div className="relative">
                    <img 
                      src={screen.imageUrl} 
                      alt={screen.title}
                      className="w-full h-auto object-cover aspect-[3/4]"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    <div className="absolute top-3 left-3">
                      <Badge className={`${catStyle.bgColor} ${catStyle.textColor} border-0`}>
                        #{screen.screenNumber}
                      </Badge>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 p-4 translate-y-full group-hover:translate-y-0 transition-transform">
                      <p className="text-sm text-white/80">{screen.description}</p>
                    </div>
                  </div>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-semibold text-white">{screen.title}</h3>
                        <Badge 
                          variant="outline" 
                          className={`mt-2 border-0 ${catStyle.bgColor} ${catStyle.textColor}`}
                        >
                          {catStyle.name}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </section>

        {/* Empty State */}
        {filteredScreens.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-400">Aucun écran trouvé pour cette catégorie</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-8 mt-12">
        <div className="container mx-auto px-4 text-center">
          <p className="text-slate-400 text-sm">
            Yovo Gallery • Collection de prototypes UI/UX
          </p>
        </div>
      </footer>
    </div>
  );
};

export default YovoGallery;
