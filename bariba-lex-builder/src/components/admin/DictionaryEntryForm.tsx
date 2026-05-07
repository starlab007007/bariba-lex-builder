import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface DictionaryEntryFormProps {
  onClose: () => void;
}

export default function DictionaryEntryForm({ onClose }: DictionaryEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    word: '',
    phonetic: '',
    definition: '',
    part_of_speech: '',
    french_keywords: '',
    example_bariba: '',
    example_francais: '',
    variants: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase.from('dictionary_entries').insert({
        word: formData.word,
        phonetic: formData.phonetic || null,
        definition: formData.definition,
        part_of_speech: formData.part_of_speech || null,
        french_keywords: formData.french_keywords
          ? formData.french_keywords.split(',').map((k) => k.trim())
          : [],
        example_bariba: formData.example_bariba
          ? formData.example_bariba.split('\n').filter((e) => e.trim())
          : [],
        example_francais: formData.example_francais
          ? formData.example_francais.split('\n').filter((e) => e.trim())
          : [],
        variants: formData.variants
          ? formData.variants.split(',').map((v) => v.trim())
          : [],
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Entrée ajoutée au dictionnaire',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erreur',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une Entrée</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="word">Mot Bààtɔ̀nú *</Label>
            <Input
              id="word"
              value={formData.word}
              onChange={(e) => setFormData({ ...formData, word: e.target.value })}
              required
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="phonetic">Phonétique</Label>
            <Input
              id="phonetic"
              value={formData.phonetic}
              onChange={(e) => setFormData({ ...formData, phonetic: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="definition">Définition (Français) *</Label>
            <Textarea
              id="definition"
              value={formData.definition}
              onChange={(e) => setFormData({ ...formData, definition: e.target.value })}
              required
              disabled={loading}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="part_of_speech">Nature grammaticale</Label>
            <Input
              id="part_of_speech"
              value={formData.part_of_speech}
              onChange={(e) =>
                setFormData({ ...formData, part_of_speech: e.target.value })
              }
              disabled={loading}
              placeholder="n, v, adj, adv, etc."
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="french_keywords">Mots-clés français (séparés par des virgules)</Label>
            <Input
              id="french_keywords"
              value={formData.french_keywords}
              onChange={(e) =>
                setFormData({ ...formData, french_keywords: e.target.value })
              }
              disabled={loading}
              placeholder="maison, habitation, demeure"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="example_bariba">Exemples Bààtɔ̀nú (un par ligne)</Label>
            <Textarea
              id="example_bariba"
              value={formData.example_bariba}
              onChange={(e) =>
                setFormData({ ...formData, example_bariba: e.target.value })
              }
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="example_francais">Exemples Français (un par ligne)</Label>
            <Textarea
              id="example_francais"
              value={formData.example_francais}
              onChange={(e) =>
                setFormData({ ...formData, example_francais: e.target.value })
              }
              disabled={loading}
              rows={2}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="variants">Variantes (séparées par des virgules)</Label>
            <Input
              id="variants"
              value={formData.variants}
              onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
              disabled={loading}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
