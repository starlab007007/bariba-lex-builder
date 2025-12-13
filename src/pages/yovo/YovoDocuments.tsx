import { motion } from 'framer-motion';
import { FileText, Mic, Upload, Download, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const documentTypes = [
  { icon: '🪪', name: 'Carte d\'identité', desc: 'Demande ou renouvellement' },
  { icon: '📄', name: 'Acte de naissance', desc: 'Copie certifiée' },
  { icon: '🛂', name: 'Passeport', desc: 'Nouvelle demande' },
  { icon: '🏠', name: 'Certificat de résidence', desc: 'Attestation domicile' },
  { icon: '💍', name: 'Acte de mariage', desc: 'Copie intégrale' },
  { icon: '📋', name: 'Casier judiciaire', desc: 'Extrait bulletin n°3' },
];

const myRequests = [
  { id: '1', type: 'Carte d\'identité', status: 'completed', date: '15 Nov 2024' },
  { id: '2', type: 'Acte de naissance', status: 'pending', date: '10 Dec 2024' },
  { id: '3', type: 'Passeport', status: 'processing', date: '05 Dec 2024' },
];

const statusConfig = {
  completed: { label: 'Prêt', color: 'bg-green-500/20 text-green-400 border-green-500/30', icon: CheckCircle },
  pending: { label: 'En attente', color: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30', icon: Clock },
  processing: { label: 'En cours', color: 'bg-blue-500/20 text-blue-400 border-blue-500/30', icon: AlertCircle },
};

export default function YovoDocuments() {
  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-slate-500 to-slate-600 rounded-2xl flex items-center justify-center mb-4">
          <FileText className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">Documents Officiels</h2>
        <p className="text-slate-400">Demandes administratives guidées</p>
      </motion.div>

      {/* Voice assistant */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="bg-gradient-to-br from-slate-700/30 to-slate-600/30 rounded-2xl p-6 border border-slate-500/20"
      >
        <p className="text-center text-slate-300 mb-4">
          Décrivez vocalement le document dont vous avez besoin
        </p>
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-600 to-slate-500 shadow-lg"
          >
            <Mic className="w-8 h-8 text-white" />
          </Button>
        </div>
      </motion.div>

      {/* Document types */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.15 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Types de Documents</h3>
        <div className="grid grid-cols-2 gap-3">
          {documentTypes.map((doc, i) => (
            <motion.div
              key={doc.name}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.15 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 cursor-pointer hover:bg-slate-800/50"
            >
              <span className="text-2xl">{doc.icon}</span>
              <p className="text-white font-medium mt-2">{doc.name}</p>
              <p className="text-xs text-slate-500 mt-1">{doc.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* My requests */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3">Mes Demandes</h3>
        <div className="space-y-3">
          {myRequests.map((request, i) => {
            const status = statusConfig[request.status as keyof typeof statusConfig];
            const StatusIcon = status.icon;
            return (
              <motion.div
                key={request.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.05 }}
                className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between"
              >
                <div>
                  <p className="text-white font-medium">{request.type}</p>
                  <p className="text-sm text-slate-500">{request.date}</p>
                </div>
                <Badge className={status.color}>
                  <StatusIcon className="w-3 h-3 mr-1" />
                  {status.label}
                </Badge>
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Upload section */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/50 p-4 rounded-xl border border-dashed border-slate-600"
      >
        <div className="text-center">
          <Upload className="w-10 h-10 text-slate-500 mx-auto mb-2" />
          <p className="text-slate-400 mb-3">Téléverser un document</p>
          <Button variant="outline" className="border-slate-600">
            Choisir un fichier
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
