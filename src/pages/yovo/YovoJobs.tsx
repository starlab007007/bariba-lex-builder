import { motion } from 'framer-motion';
import { Briefcase, Mic, MapPin, Clock, DollarSign, Filter, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const jobs = [
  {
    id: '1',
    title: 'Agent Commercial',
    company: 'TechCorp Bénin',
    location: 'Cotonou',
    salary: '150K - 250K XOF',
    type: 'CDI',
    posted: '2h',
    hasAudio: true,
  },
  {
    id: '2',
    title: 'Technicien Agricole',
    company: 'Agri Solutions',
    location: 'Parakou',
    salary: '120K - 180K XOF',
    type: 'CDD',
    posted: '5h',
    hasAudio: true,
  },
  {
    id: '3',
    title: 'Assistant(e) de Direction',
    company: 'Cabinet Conseils',
    location: 'Porto-Novo',
    salary: '200K - 300K XOF',
    type: 'CDI',
    posted: '1j',
    hasAudio: false,
  },
  {
    id: '4',
    title: 'Chauffeur Livreur',
    company: 'Express Delivery',
    location: 'Cotonou',
    salary: '80K - 120K XOF',
    type: 'Temps partiel',
    posted: '1j',
    hasAudio: true,
  },
];

const categories = [
  { name: 'Tous', count: 156 },
  { name: 'Commerce', count: 45 },
  { name: 'Agriculture', count: 32 },
  { name: 'Tech', count: 28 },
  { name: 'Santé', count: 21 },
];

export default function YovoJobs() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-green-500 to-emerald-500 rounded-2xl flex items-center justify-center mb-4">
          <Briefcase className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Emploi Audio Jobs</h2>
        <p className="text-slate-400">Postulez par message vocal</p>
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="flex gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <Input
            placeholder="Rechercher un emploi..."
            className="pl-12 bg-slate-900/50 border-white/10 h-12 rounded-xl text-white"
          />
        </div>
        <Button size="icon" className="w-12 h-12 bg-slate-800 border border-white/10">
          <Filter className="w-5 h-5 text-slate-400" />
        </Button>
      </motion.div>

      {/* Categories */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide"
      >
        {categories.map((cat, i) => (
          <button
            key={cat.name}
            className={`px-4 py-2 rounded-full whitespace-nowrap transition-colors ${
              i === 0
                ? 'bg-green-500 text-white'
                : 'bg-slate-900/50 text-slate-400 border border-white/10 hover:bg-slate-800/50'
            }`}
          >
            {cat.name} ({cat.count})
          </button>
        ))}
      </motion.div>

      {/* Job listings */}
      <div className="space-y-4">
        {jobs.map((job, i) => (
          <motion.div
            key={job.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 + i * 0.05 }}
            className="bg-slate-900/50 rounded-2xl p-5 border border-white/5"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="text-white font-semibold text-lg">{job.title}</h3>
                <p className="text-slate-400">{job.company}</p>
              </div>
              {job.hasAudio && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                  <Mic className="w-3 h-3" />
                  Audio
                </Badge>
              )}
            </div>

            <div className="flex flex-wrap gap-3 text-sm text-slate-500 mb-4">
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {job.location}
              </span>
              <span className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                {job.salary}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {job.posted}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <Badge variant="outline" className="text-slate-400 border-slate-600">
                {job.type}
              </Badge>
              <div className="flex gap-2">
                {job.hasAudio && (
                  <Button size="sm" variant="outline" className="border-green-500/30 text-green-400">
                    <Mic className="w-4 h-4 mr-1" />
                    Écouter
                  </Button>
                )}
                <Button size="sm" className="bg-green-500 hover:bg-green-600">
                  Postuler
                </Button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Audio application CTA */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-2xl p-4 border border-green-500/20"
      >
        <p className="text-center text-slate-300 mb-3">
          Créez votre CV vocal et postulez plus facilement
        </p>
        <Button className="w-full bg-green-500 hover:bg-green-600 gap-2">
          <Mic className="w-5 h-5" />
          Enregistrer mon CV Audio
        </Button>
      </motion.div>
    </div>
  );
}
