import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

interface EnhancedDictionaryEntryFormProps {
  onClose: () => void;
  initialData?: any; // Pour l'édition future
}

export default function EnhancedDictionaryEntryForm({ onClose, initialData }: EnhancedDictionaryEntryFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  
  const [formData, setFormData] = useState({
    // Champs de base
    word: '',
    phonetic: '',
    definition: '',
    part_of_speech: '',
    french_keywords: '',
    example_bariba: '',
    example_francais: '',
    variants: '',
    
    // Informations nominales
    nominal_class: '',
    plural_form: '',
    plural_class: '',
    
    // Informations verbales
    verb_root: '',
    verb_radical: '',
    accomplished_form: '',
    negative_form: '',
    benefactive_form: '',
    verbal_group: '',
    verb_type: '',
    derivational_suffixes: [] as string[],
    
    // Tons et phonétique
    tone_pattern: '',
    low_tone_optional: false,
    
    // Adjectifs (formes par classe)
    adj_form_b: '',
    adj_form_g: '',
    adj_form_m: '',
    adj_form_n: '',
    adj_form_s: '',
    adj_form_t: '',
    adj_form_w: '',
    adj_form_y: '',
    
    // Références et notes
    cross_reference: '',
    is_main_entry: true,
    grammatical_notes: '',
    usage_context: '',
  });

  const nominalClasses = ['b', 'g', 'm', 'n', 's', 't', 'w', 'y'];
  const verbalGroups = ['1', '2', '3', '4', '5'];
  const verbTypes = [
    'v.tr', 'v.int', 'vd', 'veq', 'v.inv', 
    'v.stat', 'v.descr', 'lv'
  ];
  const derivationalSuffixes = ['-ma', '-na', '-ra', '-ri', '-si', '-sia'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Préparer les formes d'adjectifs si renseignées
      let adjectiveForms = null;
      if (formData.part_of_speech.includes('adj')) {
        const forms: Record<string, string> = {};
        if (formData.adj_form_b) forms.b = formData.adj_form_b;
        if (formData.adj_form_g) forms.g = formData.adj_form_g;
        if (formData.adj_form_m) forms.m = formData.adj_form_m;
        if (formData.adj_form_n) forms.n = formData.adj_form_n;
        if (formData.adj_form_s) forms.s = formData.adj_form_s;
        if (formData.adj_form_t) forms.t = formData.adj_form_t;
        if (formData.adj_form_w) forms.w = formData.adj_form_w;
        if (formData.adj_form_y) forms.y = formData.adj_form_y;
        
        if (Object.keys(forms).length > 0) {
          adjectiveForms = forms;
        }
      }

      const { error } = await supabase.from('dictionary_entries').insert({
        // Champs de base
        word: formData.word,
        phonetic: formData.phonetic || null,
        definition: formData.definition,
        part_of_speech: formData.part_of_speech || null,
        french_keywords: formData.french_keywords
          ? formData.french_keywords.split(',').map(k => k.trim())
          : [],
        example_bariba: formData.example_bariba
          ? formData.example_bariba.split('\n').filter(e => e.trim())
          : [],
        example_francais: formData.example_francais
          ? formData.example_francais.split('\n').filter(e => e.trim())
          : [],
        variants: formData.variants
          ? formData.variants.split(',').map(v => v.trim())
          : [],
        
        // Informations grammaticales
        nominal_class: formData.nominal_class || null,
        plural_form: formData.plural_form || null,
        plural_class: formData.plural_class || null,
        verb_root: formData.verb_root || null,
        verb_radical: formData.verb_radical || null,
        accomplished_form: formData.accomplished_form || null,
        negative_form: formData.negative_form || null,
        benefactive_form: formData.benefactive_form || null,
        verbal_group: formData.verbal_group ? parseInt(formData.verbal_group) : null,
        verb_type: formData.verb_type || null,
        derivational_suffixes: formData.derivational_suffixes.length > 0 ? formData.derivational_suffixes : null,
        tone_pattern: formData.tone_pattern || null,
        low_tone_optional: formData.low_tone_optional,
        adjective_forms: adjectiveForms,
        cross_reference: formData.cross_reference || null,
        is_main_entry: formData.is_main_entry,
        grammatical_notes: formData.grammatical_notes || null,
        usage_context: formData.usage_context || null,
        
        created_by: user?.id,
      });

      if (error) throw error;

      toast({
        title: 'Succès',
        description: 'Entrée ajoutée au dictionnaire avec toutes les informations grammaticales',
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

  const toggleDerivationalSuffix = (suffix: string) => {
    setFormData(prev => ({
      ...prev,
      derivational_suffixes: prev.derivational_suffixes.includes(suffix)
        ? prev.derivational_suffixes.filter(s => s !== suffix)
        : [...prev.derivational_suffixes, suffix]
    }));
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Ajouter une Entrée Complète au Dictionnaire Baatɔnum</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="basic">Base</TabsTrigger>
              <TabsTrigger value="nominal">Nominal</TabsTrigger>
              <TabsTrigger value="verbal">Verbal</TabsTrigger>
              <TabsTrigger value="adjective">Adjectif</TabsTrigger>
              <TabsTrigger value="advanced">Avancé</TabsTrigger>
            </TabsList>

            {/* Onglet Base */}
            <TabsContent value="basic" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="word">Mot Bààtɔ̀nú *</Label>
                <Input
                  id="word"
                  value={formData.word}
                  onChange={(e) => setFormData({ ...formData, word: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Ex: yaburu, gere, kpik-"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phonetic">Phonétique</Label>
                <Input
                  id="phonetic"
                  value={formData.phonetic}
                  onChange={(e) => setFormData({ ...formData, phonetic: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: [yabuɾu]"
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
                  placeholder="Définition précise en français"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="part_of_speech">Nature grammaticale *</Label>
                <Input
                  id="part_of_speech"
                  value={formData.part_of_speech}
                  onChange={(e) => setFormData({ ...formData, part_of_speech: e.target.value })}
                  required
                  disabled={loading}
                  placeholder="Ex: n.t, v.tr.1, adj, veq"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="french_keywords">Mots-clés français (séparés par des virgules)</Label>
                <Input
                  id="french_keywords"
                  value={formData.french_keywords}
                  onChange={(e) => setFormData({ ...formData, french_keywords: e.target.value })}
                  disabled={loading}
                  placeholder="marché, commerce, vente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="example_bariba">Exemples Bààtɔ̀nú (un par ligne)</Label>
                  <Textarea
                    id="example_bariba"
                    value={formData.example_bariba}
                    onChange={(e) => setFormData({ ...formData, example_bariba: e.target.value })}
                    disabled={loading}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="example_francais">Exemples Français (un par ligne)</Label>
                  <Textarea
                    id="example_francais"
                    value={formData.example_francais}
                    onChange={(e) => setFormData({ ...formData, example_francais: e.target.value })}
                    disabled={loading}
                    rows={3}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="variants">Variantes (séparées par des virgules)</Label>
                <Input
                  id="variants"
                  value={formData.variants}
                  onChange={(e) => setFormData({ ...formData, variants: e.target.value })}
                  disabled={loading}
                  placeholder="yabereku / yebereku"
                />
              </div>
            </TabsContent>

            {/* Onglet Nominal */}
            <TabsContent value="nominal" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informations pour les noms (n.b, n.g, n.m, n.n, n.s, n.t, n.w, n.y)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nominal_class">Classe nominale (singulier)</Label>
                  <Select
                    value={formData.nominal_class}
                    onValueChange={(value) => setFormData({ ...formData, nominal_class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nominalClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>Classe {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="plural_class">Classe nominale (pluriel)</Label>
                  <Select
                    value={formData.plural_class}
                    onValueChange={(value) => setFormData({ ...formData, plural_class: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {nominalClasses.map(cls => (
                        <SelectItem key={cls} value={cls}>Classe {cls}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plural_form">Forme plurielle</Label>
                <Input
                  id="plural_form"
                  value={formData.plural_form}
                  onChange={(e) => setFormData({ ...formData, plural_form: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: yabunu (si singulier = yaburu)"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="low_tone_optional"
                  checked={formData.low_tone_optional}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, low_tone_optional: checked as boolean })
                  }
                />
                <Label htmlFor="low_tone_optional" className="text-sm cursor-pointer">
                  Ton bas facultatif (Ex: bararu [bàràru])
                </Label>
              </div>
            </TabsContent>

            {/* Onglet Verbal */}
            <TabsContent value="verbal" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Informations pour les verbes (v, vd, veq, lv, etc.)
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="verb_type">Type de verbe</Label>
                  <Select
                    value={formData.verb_type}
                    onValueChange={(value) => setFormData({ ...formData, verb_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {verbTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verbal_group">Groupe verbal</Label>
                  <Select
                    value={formData.verbal_group}
                    onValueChange={(value) => setFormData({ ...formData, verbal_group: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner..." />
                    </SelectTrigger>
                    <SelectContent>
                      {verbalGroups.map(group => (
                        <SelectItem key={group} value={group}>Groupe {group}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="verb_root">Racine (forme du futur)</Label>
                  <Input
                    id="verb_root"
                    value={formData.verb_root}
                    onChange={(e) => setFormData({ ...formData, verb_root: e.target.value })}
                    disabled={loading}
                    placeholder="Ex: gere (pour parler)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verb_radical">Radical (r.)</Label>
                  <Input
                    id="verb_radical"
                    value={formData.verb_radical}
                    onChange={(e) => setFormData({ ...formData, verb_radical: e.target.value })}
                    disabled={loading}
                    placeholder="Ex: geru- (pour gere)"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="accomplished_form">Forme achevée (aa)</Label>
                  <Input
                    id="accomplished_form"
                    value={formData.accomplished_form}
                    onChange={(e) => setFormData({ ...formData, accomplished_form: e.target.value })}
                    disabled={loading}
                    placeholder="Ex: gera"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="negative_form">Forme négative</Label>
                  <Input
                    id="negative_form"
                    value={formData.negative_form}
                    onChange={(e) => setFormData({ ...formData, negative_form: e.target.value })}
                    disabled={loading}
                    placeholder="Ex: -re (u ǹ gerure)"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="benefactive_form">Forme bénéfactive</Label>
                <Input
                  id="benefactive_form"
                  value={formData.benefactive_form}
                  onChange={(e) => setFormData({ ...formData, benefactive_form: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: geria (parler pour quelqu'un)"
                />
              </div>

              <div className="space-y-2">
                <Label>Suffixes dérivatifs</Label>
                <div className="grid grid-cols-3 gap-3">
                  {derivationalSuffixes.map(suffix => (
                    <div key={suffix} className="flex items-center space-x-2">
                      <Checkbox
                        id={`suffix-${suffix}`}
                        checked={formData.derivational_suffixes.includes(suffix)}
                        onCheckedChange={() => toggleDerivationalSuffix(suffix)}
                      />
                      <Label htmlFor={`suffix-${suffix}`} className="text-sm cursor-pointer">
                        {suffix}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>

            {/* Onglet Adjectif */}
            <TabsContent value="adjective" className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Formes de l'adjectif selon les classes nominales
              </p>

              <div className="grid grid-cols-2 gap-4">
                {nominalClasses.map(cls => (
                  <div key={cls} className="space-y-2">
                    <Label htmlFor={`adj_form_${cls}`}>Forme classe {cls}</Label>
                    <Input
                      id={`adj_form_${cls}`}
                      value={(formData as any)[`adj_form_${cls}`]}
                      onChange={(e) => setFormData({ ...formData, [`adj_form_${cls}`]: e.target.value })}
                      disabled={loading}
                      placeholder={`Ex: baka${cls} (pour "grand")`}
                    />
                  </div>
                ))}
              </div>
            </TabsContent>

            {/* Onglet Avancé */}
            <TabsContent value="advanced" className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="tone_pattern">Pattern de tons</Label>
                <Input
                  id="tone_pattern"
                  value={formData.tone_pattern}
                  onChange={(e) => setFormData({ ...formData, tone_pattern: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: HLH (Haut-Bas-Haut)"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cross_reference">Référence croisée (cf.)</Label>
                <Input
                  id="cross_reference"
                  value={formData.cross_reference}
                  onChange={(e) => setFormData({ ...formData, cross_reference: e.target.value })}
                  disabled={loading}
                  placeholder="Ex: yandunia (pour handunia)"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="is_main_entry"
                  checked={formData.is_main_entry}
                  onCheckedChange={(checked) => 
                    setFormData({ ...formData, is_main_entry: checked as boolean })
                  }
                />
                <Label htmlFor="is_main_entry" className="text-sm cursor-pointer">
                  Entrée principale (décocher si c'est une référence cf.)
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="grammatical_notes">Notes grammaticales</Label>
                <Textarea
                  id="grammatical_notes"
                  value={formData.grammatical_notes}
                  onChange={(e) => setFormData({ ...formData, grammatical_notes: e.target.value })}
                  disabled={loading}
                  rows={3}
                  placeholder="Notes supplémentaires sur la grammaire, l'usage, etc."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="usage_context">Contexte d'utilisation</Label>
                <Textarea
                  id="usage_context"
                  value={formData.usage_context}
                  onChange={(e) => setFormData({ ...formData, usage_context: e.target.value })}
                  disabled={loading}
                  rows={2}
                  placeholder="Contexte spécifique, registre de langue, etc."
                />
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex gap-3 justify-end pt-4 border-t">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Annuler
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Ajouter l'entrée
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}