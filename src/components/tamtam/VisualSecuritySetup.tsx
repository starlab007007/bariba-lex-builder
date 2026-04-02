import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, Shield, Check } from 'lucide-react';

const ANIMALS = [
  { id: 'lion', emoji: '🦁' },
  { id: 'elephant', emoji: '🐘' },
  { id: 'rooster', emoji: '🐓' },
  { id: 'snake', emoji: '🐍' },
  { id: 'turtle', emoji: '🐢' },
  { id: 'fish', emoji: '🐟' },
  { id: 'bird', emoji: '🐦' },
  { id: 'goat', emoji: '🐐' },
  { id: 'cat', emoji: '🐱' },
];

const COLORS = [
  { id: 'red', color: '#EF4444', label: '' },
  { id: 'blue', color: '#3B82F6', label: '' },
  { id: 'green', color: '#22C55E', label: '' },
  { id: 'yellow', color: '#EAB308', label: '' },
  { id: 'orange', color: '#F97316', label: '' },
  { id: 'purple', color: '#A855F7', label: '' },
];

const OBJECTS = [
  { id: 'moto', emoji: '🏍️' },
  { id: 'ball', emoji: '⚽' },
  { id: 'guitar', emoji: '🎸' },
  { id: 'star', emoji: '⭐' },
  { id: 'house', emoji: '🏠' },
  { id: 'tree', emoji: '🌳' },
  { id: 'sun', emoji: '☀️' },
  { id: 'moon', emoji: '🌙' },
  { id: 'key', emoji: '🔑' },
];

type SetupStep = 'animals' | 'color' | 'object' | 'confirm';

interface Props {
  onComplete: (answers: string[]) => void;
  onBack: () => void;
  isLoading?: boolean;
}

export default function VisualSecuritySetup({ onComplete, onBack, isLoading }: Props) {
  const [setupStep, setSetupStep] = useState<SetupStep>('animals');
  const [selectedAnimals, setSelectedAnimals] = useState<string[]>([]);
  const [selectedColor, setSelectedColor] = useState<string>('');
  const [selectedObject, setSelectedObject] = useState<string>('');

  const vibrate = (pattern: number | number[]) => {
    try { navigator?.vibrate?.(pattern); } catch {}
  };

  const handleAnimalToggle = (id: string) => {
    vibrate(10);
    setSelectedAnimals(prev => {
      if (prev.includes(id)) return prev.filter(a => a !== id);
      if (prev.length >= 2) return [prev[1], id];
      return [...prev, id];
    });
  };

  const handleConfirm = () => {
    const answers = [selectedAnimals[0], selectedAnimals[1], selectedColor, selectedObject];
    onComplete(answers);
  };

  return (
    <motion.div
      key="security-setup"
      initial={{ opacity: 0, x: 100 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -100 }}
      className="w-full max-w-md text-center flex-1 flex flex-col justify-center"
    >
      <AnimatePresence mode="wait">
        {/* ANIMALS */}
        {setupStep === 'animals' && (
          <motion.div key="animals" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <button onClick={onBack} className="self-start mb-3">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Shield className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white mb-1">Protège ton compte</h2>
            <p className="text-white/70 text-sm mb-4">Choisis <span className="font-bold text-white">2 animaux</span> secrets</p>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {ANIMALS.map(animal => (
                <motion.button
                  key={animal.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => handleAnimalToggle(animal.id)}
                  className={`w-full aspect-square rounded-2xl flex items-center justify-center text-4xl transition-all border-2 ${
                    selectedAnimals.includes(animal.id)
                      ? 'bg-white/30 border-white shadow-lg shadow-white/20 scale-105'
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  {animal.emoji}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={() => { vibrate([50, 30, 50]); setSetupStep('color'); }}
              disabled={selectedAnimals.length !== 2}
            >
              Continuer <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* COLOR */}
        {setupStep === 'color' && (
          <motion.div key="color" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <button onClick={() => setSetupStep('animals')} className="self-start mb-3">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Shield className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white mb-1">Ta couleur secrète</h2>
            <p className="text-white/70 text-sm mb-4">Choisis <span className="font-bold text-white">1 couleur</span></p>
            
            <div className="grid grid-cols-3 gap-4 mb-4 max-w-[240px] mx-auto">
              {COLORS.map(c => (
                <motion.button
                  key={c.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { vibrate(10); setSelectedColor(c.id); }}
                  className={`w-16 h-16 rounded-full mx-auto transition-all border-4 ${
                    selectedColor === c.id ? 'border-white scale-110 shadow-lg' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c.color }}
                />
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={() => { vibrate([50, 30, 50]); setSetupStep('object'); }}
              disabled={!selectedColor}
            >
              Continuer <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* OBJECT */}
        {setupStep === 'object' && (
          <motion.div key="object" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <button onClick={() => setSetupStep('color')} className="self-start mb-3">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Shield className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white mb-1">Ton objet secret</h2>
            <p className="text-white/70 text-sm mb-4">Choisis <span className="font-bold text-white">1 objet</span></p>
            
            <div className="grid grid-cols-3 gap-3 mb-4">
              {OBJECTS.map(obj => (
                <motion.button
                  key={obj.id}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => { vibrate(10); setSelectedObject(obj.id); }}
                  className={`w-full aspect-square rounded-2xl flex items-center justify-center text-4xl transition-all border-2 ${
                    selectedObject === obj.id
                      ? 'bg-white/30 border-white shadow-lg shadow-white/20 scale-105'
                      : 'bg-white/10 border-white/20'
                  }`}
                >
                  {obj.emoji}
                </motion.button>
              ))}
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={() => { vibrate([50, 30, 50]); setSetupStep('confirm'); }}
              disabled={!selectedObject}
            >
              Continuer <ArrowRight className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}

        {/* CONFIRM */}
        {setupStep === 'confirm' && (
          <motion.div key="confirm" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }}>
            <button onClick={() => setSetupStep('object')} className="self-start mb-3">
              <ArrowLeft className="w-6 h-6 text-white" />
            </button>
            <Shield className="w-10 h-10 text-white mx-auto mb-2" />
            <h2 className="text-lg font-bold text-white mb-1">Ton code secret</h2>
            <p className="text-white/70 text-sm mb-4">Mémorise bien tes choix !</p>

            <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-4 mb-4 border border-white/20 space-y-3">
              <div className="flex items-center justify-center gap-4">
                <span className="text-white/70 text-sm">Animaux :</span>
                <span className="text-3xl">
                  {ANIMALS.find(a => a.id === selectedAnimals[0])?.emoji}
                  {ANIMALS.find(a => a.id === selectedAnimals[1])?.emoji}
                </span>
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-white/70 text-sm">Couleur :</span>
                <div
                  className="w-8 h-8 rounded-full border-2 border-white"
                  style={{ backgroundColor: COLORS.find(c => c.id === selectedColor)?.color }}
                />
              </div>
              <div className="flex items-center justify-center gap-4">
                <span className="text-white/70 text-sm">Objet :</span>
                <span className="text-3xl">{OBJECTS.find(o => o.id === selectedObject)?.emoji}</span>
              </div>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              className="w-full py-3 bg-white rounded-full text-orange-600 font-bold text-lg flex items-center justify-center gap-2 shadow-xl disabled:opacity-50"
              onClick={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? 'Enregistrement...' : 'Confirmer'}
              <Check className="w-5 h-5" />
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
