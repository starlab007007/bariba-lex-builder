import { useState } from 'react';
import { motion } from 'framer-motion';
import { AlertTriangle, Phone, MapPin, Heart, Shield, Mic, X, PhoneCall, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

const emergencyServices = [
  { icon: '🚑', name: 'SAMU', number: '15', color: 'from-red-500 to-pink-500' },
  { icon: '🚒', name: 'Pompiers', number: '18', color: 'from-orange-500 to-red-500' },
  { icon: '👮', name: 'Police', number: '17', color: 'from-blue-500 to-cyan-500' },
  { icon: '🏥', name: 'Hôpital', number: '01 23 45 67', color: 'from-green-500 to-emerald-500' },
];

const myContacts = [
  { name: 'Maman', phone: '+229 97 XX XX XX', relationship: 'Famille' },
  { name: 'Papa', phone: '+229 96 XX XX XX', relationship: 'Famille' },
  { name: 'Dr. Konaté', phone: '+229 95 XX XX XX', relationship: 'Médecin' },
];

export default function YovoSOS() {
  const [isEmergencyActive, setIsEmergencyActive] = useState(false);

  return (
    <div className="px-4 py-6 space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-2"
      >
        <div className="w-16 h-16 mx-auto bg-gradient-to-br from-red-600 to-red-500 rounded-2xl flex items-center justify-center mb-4 animate-pulse">
          <AlertTriangle className="w-8 h-8 text-white" />
        </div>
        <h2 className="text-2xl font-bold text-white">SOS Urgences</h2>
        <p className="text-slate-400">Aide d'urgence rapide</p>
      </motion.div>

      {/* Main SOS Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="flex justify-center py-4"
      >
        <button
          onClick={() => setIsEmergencyActive(true)}
          className="relative w-40 h-40 rounded-full"
        >
          <div className="absolute inset-0 bg-red-500/30 rounded-full animate-ping" />
          <div className="absolute inset-2 bg-red-500/50 rounded-full animate-pulse" />
          <div className="absolute inset-4 bg-gradient-to-br from-red-600 to-red-500 rounded-full flex items-center justify-center shadow-2xl shadow-red-500/50">
            <div className="text-center">
              <Mic className="w-10 h-10 text-white mx-auto mb-1" />
              <span className="text-white font-bold text-lg">SOS</span>
            </div>
          </div>
        </button>
      </motion.div>

      <p className="text-center text-slate-500 text-sm">
        Appuyez pour envoyer un message vocal d'urgence à vos contacts
      </p>

      {/* Emergency Services */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-400" />
          Services d'Urgence
        </h3>
        <div className="grid grid-cols-2 gap-3">
          {emergencyServices.map((service, i) => (
            <motion.a
              key={service.name}
              href={`tel:${service.number}`}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 + i * 0.05 }}
              className={`bg-gradient-to-br ${service.color} p-4 rounded-xl flex items-center gap-3`}
            >
              <span className="text-3xl">{service.icon}</span>
              <div>
                <p className="text-white font-semibold">{service.name}</p>
                <p className="text-white/80 text-sm">{service.number}</p>
              </div>
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* My Emergency Contacts */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
      >
        <h3 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-400" />
          Mes Contacts d'Urgence
        </h3>
        <div className="space-y-3">
          {myContacts.map((contact, i) => (
            <motion.div
              key={contact.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + i * 0.05 }}
              className="bg-slate-900/50 p-4 rounded-xl border border-white/5 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-red-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold">
                  {contact.name[0]}
                </div>
                <div>
                  <p className="text-white font-medium">{contact.name}</p>
                  <p className="text-sm text-slate-500">{contact.relationship}</p>
                </div>
              </div>
              <a href={`tel:${contact.phone}`}>
                <Button size="icon" className="bg-green-500 hover:bg-green-600 rounded-full">
                  <PhoneCall className="w-5 h-5" />
                </Button>
              </a>
            </motion.div>
          ))}
        </div>
        <Button variant="outline" className="w-full mt-3 border-red-500/30 text-red-400">
          + Ajouter un contact d'urgence
        </Button>
      </motion.div>

      {/* Location sharing */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="bg-slate-900/50 p-4 rounded-xl border border-white/5"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
            <MapPin className="w-5 h-5 text-blue-400" />
          </div>
          <div className="flex-1">
            <p className="text-white font-medium">Partager ma position</p>
            <p className="text-sm text-slate-500">Envoyer ma localisation aux contacts</p>
          </div>
          <Button size="sm" className="bg-blue-500 hover:bg-blue-600">
            Partager
          </Button>
        </div>
      </motion.div>

      {/* Emergency Modal */}
      {isEmergencyActive && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
        >
          <div className="bg-slate-900 rounded-2xl p-6 max-w-sm w-full border border-red-500/30">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                <Mic className="w-6 h-6 text-white" />
              </div>
              <button onClick={() => setIsEmergencyActive(false)}>
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Message d'urgence</h3>
            <p className="text-slate-400 mb-4">
              Enregistrez votre message vocal d'urgence. Il sera envoyé à tous vos contacts avec votre position.
            </p>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-slate-600"
                onClick={() => setIsEmergencyActive(false)}
              >
                Annuler
              </Button>
              <Button className="flex-1 bg-red-500 hover:bg-red-600 gap-2">
                <Send className="w-4 h-4" />
                Envoyer
              </Button>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
