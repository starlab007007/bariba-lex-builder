import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';

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
  { id: 'red', color: '#EF4444' },
  { id: 'blue', color: '#3B82F6' },
  { id: 'green', color: '#22C55E' },
  { id: 'yellow', color: '#EAB308' },
  { id: 'orange', color: '#F97316' },
  { id: 'purple', color: '#A855F7' },
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

type CheckStep = 'animals' | 'color' | 'object';

interface Props {
  onComplete: (answers: string[]) => void;
  onBack: () => void;
}

export default function VisualSecurityCheck({ onComplete, onBack }: Props) {
  const [checkStep, setCheckStep] = useState<CheckStep>('animals');
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

  return (
    <AnimatePresence mode="wait">
      {/* ANIMALS */}
      {checkStep === 'animals' && (
        <motion.div key="check-animals" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
          <button onClick={onBack} className="self-start mb-3">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <KeyRound className="w-10 h-10 text-white mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white mb-1">Retrouve tes animaux</h2>
          <p className="text-white/70 text-sm mb-4">Choisis tes <span className="font-bold text-white">2 animaux</span> secrets</p>
          
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
            onClick={() => { vibrate([50, 30, 50]); setCheckStep('color'); }}
            disabled={selectedAnimals.length !== 2}
          >
            Continuer <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* COLOR */}
      {checkStep === 'color' && (
        <motion.div key="check-color" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
          <button onClick={() => setCheckStep('animals')} className="self-start mb-3">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <KeyRound className="w-10 h-10 text-white mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white mb-1">Retrouve ta couleur</h2>
          <p className="text-white/70 text-sm mb-4">Choisis ta <span className="font-bold text-white">couleur</span> secrète</p>
          
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
            onClick={() => { vibrate([50, 30, 50]); setCheckStep('object'); }}
            disabled={!selectedColor}
          >
            Continuer <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}

      {/* OBJECT */}
      {checkStep === 'object' && (
        <motion.div key="check-object" initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -50 }} className="w-full">
          <button onClick={() => setCheckStep('color')} className="self-start mb-3">
            <ArrowLeft className="w-6 h-6 text-white" />
          </button>
          <KeyRound className="w-10 h-10 text-white mx-auto mb-2" />
          <h2 className="text-lg font-bold text-white mb-1">Retrouve ton objet</h2>
          <p className="text-white/70 text-sm mb-4">Choisis ton <span className="font-bold text-white">objet</span> secret</p>
          
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
            onClick={() => {
              vibrate([50, 30, 50]);
              onComplete([selectedAnimals[0], selectedAnimals[1], selectedColor, selectedObject]);
            }}
            disabled={!selectedObject}
          >
            Vérifier <ArrowRight className="w-5 h-5" />
          </motion.button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
