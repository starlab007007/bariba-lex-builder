import { useState } from 'react';
import { Edit3, Trash2, CheckCircle, Save, X } from 'lucide-react';
import { motion } from 'framer-motion';

interface EditorToolbarProps {
  onEdit: () => void;
  onDelete: () => void;
  onValidate: () => void;
  isEditing?: boolean;
  onSave?: () => void;
  onCancel?: () => void;
  lang: 'french' | 'bariba';
  compact?: boolean;
}

export function EditorToolbar({ onEdit, onDelete, onValidate, isEditing, onSave, onCancel, lang, compact }: EditorToolbarProps) {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onSave}
          className="flex items-center gap-1 text-xs bg-green-500 text-white px-3 py-1.5 rounded-lg font-semibold shadow-sm"
        >
          <Save className="w-3 h-3" />
          {lang === 'french' ? 'Sauvegarder' : 'Mɑɑru'}
        </motion.button>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={onCancel}
          className="flex items-center gap-1 text-xs bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg font-semibold"
        >
          <X className="w-3 h-3" />
          {lang === 'french' ? 'Annuler' : 'Kpãa'}
        </motion.button>
      </div>
    );
  }

  return (
    <div className={`flex gap-1.5 ${compact ? '' : 'pt-1'}`}>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onEdit}
        className="flex items-center gap-1 text-[10px] text-blue-600 bg-blue-50 px-2 py-1.5 rounded-lg hover:bg-blue-100 transition-colors font-medium"
        title={lang === 'french' ? 'Modifier' : 'Gbɛsiru'}
      >
        <Edit3 className="w-3 h-3" />
        {!compact && (lang === 'french' ? 'Modifier' : 'Gbɛsiru')}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onValidate}
        className="flex items-center gap-1 text-[10px] text-green-600 bg-green-50 px-2 py-1.5 rounded-lg hover:bg-green-100 transition-colors font-medium"
        title={lang === 'french' ? 'Valider' : 'Sɛnbu'}
      >
        <CheckCircle className="w-3 h-3" />
        {!compact && (lang === 'french' ? 'Valider' : 'Sɛnbu')}
      </motion.button>
      <motion.button
        whileTap={{ scale: 0.9 }}
        onClick={onDelete}
        className="flex items-center gap-1 text-[10px] text-red-600 bg-red-50 px-2 py-1.5 rounded-lg hover:bg-red-100 transition-colors font-medium"
        title={lang === 'french' ? 'Supprimer' : 'Bɔru'}
      >
        <Trash2 className="w-3 h-3" />
        {!compact && (lang === 'french' ? 'Supprimer' : 'Bɔru')}
      </motion.button>
    </div>
  );
}
