import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Code, Download, Rocket, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const FreeFineTuningGuide = () => {
  const [isDownloading, setIsDownloading] = useState(false);

  const downloadTrainingData = async () => {
    try {
      setIsDownloading(true);
      toast.info("Préparation des données d'entraînement...");

      // Récupérer les données d'entraînement
      const { data: phrases, error } = await supabase
        .from('training_phrases')
        .select('french_text, bariba_text')
        .eq('is_validated', true);

      if (error) throw error;

      // Formater en JSONL pour Hugging Face
      const jsonlData = phrases?.map(p => JSON.stringify({
        translation: {
          "fr": p.french_text,
          "bba_Latn": p.bariba_text
        }
      })).join('\n');

      // Télécharger
      const blob = new Blob([jsonlData || ''], { type: 'application/jsonl' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'nllb_bariba_training.jsonl';
      a.click();
      URL.revokeObjectURL(url);

      toast.success(`${phrases?.length || 0} paires téléchargées !`);
    } catch (error) {
      console.error('Download error:', error);
      toast.error("Erreur lors du téléchargement");
    } finally {
      setIsDownloading(false);
    }
  };

  const colabNotebook = `# FINE-TUNING NLLB-200 GRATUIT - Google Colab
# GPU T4 gratuit inclus !

# 1. INSTALLER LES DÉPENDANCES
!pip install transformers datasets torch accelerate sentencepiece

# 2. IMPORTER LES BIBLIOTHÈQUES
from transformers import AutoTokenizer, AutoModelForSeq2SeqLM, Seq2SeqTrainingArguments, Seq2SeqTrainer
from datasets import load_dataset
import torch

# 3. CHARGER LE MODÈLE NLLB-200 (600M - plus léger)
model_name = "facebook/nllb-200-distilled-600M"
tokenizer = AutoTokenizer.from_pretrained(model_name, src_lang="fra_Latn", tgt_lang="bba_Latn")
model = AutoModelForSeq2SeqLM.from_pretrained(model_name)

print(f"Modèle chargé : {model_name}")
print(f"GPU disponible : {torch.cuda.is_available()}")

# 4. CHARGER VOS DONNÉES (uploader nllb_bariba_training.jsonl dans Colab)
dataset = load_dataset("json", data_files={"train": "nllb_bariba_training.jsonl"})

def preprocess_function(examples):
    inputs = [ex["fr"] for ex in examples["translation"]]
    targets = [ex["bba_Latn"] for ex in examples["translation"]]
    model_inputs = tokenizer(inputs, max_length=128, truncation=True, padding="max_length")
    labels = tokenizer(targets, max_length=128, truncation=True, padding="max_length")
    model_inputs["labels"] = labels["input_ids"]
    return model_inputs

tokenized_dataset = dataset.map(preprocess_function, batched=True)

# 5. CONFIGURATION D'ENTRAÎNEMENT (Optimisé pour GPU gratuit)
training_args = Seq2SeqTrainingArguments(
    output_dir="./nllb-bariba-finetuned",
    num_train_epochs=3,  # Réduit pour GPU gratuit
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    learning_rate=3e-5,
    warmup_steps=200,
    save_steps=500,
    save_total_limit=2,
    fp16=True,  # Accélère avec GPU
    logging_steps=100,
    max_steps=5000,  # Limité pour session gratuite (~6-12h)
    predict_with_generate=True,
)

# 6. CRÉER LE TRAINER
trainer = Seq2SeqTrainer(
    model=model,
    args=training_args,
    train_dataset=tokenized_dataset["train"],
    tokenizer=tokenizer,
)

# 7. LANCER L'ENTRAÎNEMENT (6-12 heures)
print("🚀 Démarrage de l'entraînement...")
trainer.train()

# 8. SAUVEGARDER LE MODÈLE
model.save_pretrained("./nllb-bariba-final")
tokenizer.save_pretrained("./nllb-bariba-final")
print("✅ Modèle sauvegardé dans ./nllb-bariba-final")

# 9. UPLOAD SUR HUGGING FACE (Gratuit)
!huggingface-cli login
!huggingface-cli upload YOUR_USERNAME/nllb-bariba-french ./nllb-bariba-final

print("🎉 TERMINÉ ! Votre modèle est maintenant disponible sur Hugging Face !")`;

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Rocket className="h-6 w-6" />
                Fine-Tuning GRATUIT - Guide Complet
              </CardTitle>
              <CardDescription>
                Créez votre modèle NLLB-200 spécialisé sans aucun coût avec Google Colab
              </CardDescription>
            </div>
            <Badge variant="outline" className="bg-green-500/10 text-green-600">
              100% GRATUIT
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <CheckCircle2 className="h-4 w-4" />
            <AlertDescription>
              <strong>Tout est gratuit :</strong> GPU Google Colab + API Hugging Face + Hébergement du modèle
            </AlertDescription>
          </Alert>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="overview">Vue d'ensemble</TabsTrigger>
              <TabsTrigger value="prepare">1. Préparation</TabsTrigger>
              <TabsTrigger value="train">2. Entraînement</TabsTrigger>
              <TabsTrigger value="deploy">3. Déploiement</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Étape 1</CardTitle>
                    <CardDescription>Préparation des données</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      <li>Télécharger 220k+ paires</li>
                      <li>Format JSONL</li>
                      <li>Durée: 2 min</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Étape 2</CardTitle>
                    <CardDescription>Fine-tuning Google Colab</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      <li>GPU T4 gratuit</li>
                      <li>NLLB-200 600M</li>
                      <li>Durée: 6-12h</li>
                    </ul>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Étape 3</CardTitle>
                    <CardDescription>Hébergement gratuit</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <ul className="text-sm space-y-1 list-disc pl-5">
                      <li>Upload Hugging Face</li>
                      <li>API gratuite</li>
                      <li>Durée: 10 min</li>
                    </ul>
                  </CardContent>
                </Card>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <strong>Temps total:</strong> ~7-13 heures (dont 6-12h d'entraînement automatique)
                  <br />
                  <strong>Coût total:</strong> 0€
                </AlertDescription>
              </Alert>
            </TabsContent>

            <TabsContent value="prepare" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>1.1 Télécharger les données d'entraînement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Téléchargez vos 220k+ paires français-bariba au format JSONL pour Hugging Face.
                  </p>
                  <Button onClick={downloadTrainingData} disabled={isDownloading}>
                    <Download className="mr-2 h-4 w-4" />
                    {isDownloading ? "Téléchargement..." : "Télécharger nllb_bariba_training.jsonl"}
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>1.2 Créer un compte Hugging Face</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Vous aurez besoin d'un compte gratuit pour héberger votre modèle.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="https://huggingface.co/join" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Créer un compte HF
                    </a>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>1.3 Créer un token API Hugging Face</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <p className="text-sm text-muted-foreground">
                    Un token est nécessaire pour uploader et utiliser votre modèle.
                  </p>
                  <Button variant="outline" asChild>
                    <a href="https://huggingface.co/settings/tokens" target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="mr-2 h-4 w-4" />
                      Créer un token
                    </a>
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="train" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>2.1 Script Python Google Colab</CardTitle>
                  <CardDescription>
                    Copiez ce script dans un nouveau notebook Google Colab avec GPU T4 gratuit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="relative">
                    <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-xs">
                      <code>{colabNotebook}</code>
                    </pre>
                    <Button
                      size="sm"
                      variant="outline"
                      className="absolute top-2 right-2"
                      onClick={() => {
                        navigator.clipboard.writeText(colabNotebook);
                        toast.success("Script copié !");
                      }}
                    >
                      <Code className="mr-2 h-4 w-4" />
                      Copier
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>2.2 Lancer l'entraînement</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <ol className="list-decimal pl-5 space-y-2 text-sm">
                    <li>Aller sur <a href="https://colab.research.google.com" target="_blank" rel="noopener noreferrer" className="text-primary underline">Google Colab</a></li>
                    <li>Créer un nouveau notebook</li>
                    <li>Runtime → Change runtime type → GPU T4</li>
                    <li>Uploader le fichier <code>nllb_bariba_training.jsonl</code></li>
                    <li>Coller le script Python ci-dessus</li>
                    <li>Exécuter toutes les cellules (6-12 heures)</li>
                    <li>Le modèle sera sauvegardé automatiquement</li>
                  </ol>
                  <Alert className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <strong>Important:</strong> Laissez l'onglet Colab ouvert pendant l'entraînement. 
                      Si vous le fermez, l'entraînement s'arrêtera.
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="deploy" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>3.1 Upload sur Hugging Face</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Une fois l'entraînement terminé, le script uploade automatiquement votre modèle.
                  </p>
                  <pre className="bg-muted p-3 rounded text-xs">
                    <code>
{`# Dans Colab, ces commandes sont déjà dans le script
!huggingface-cli login
# Entrez votre token HF
!huggingface-cli upload YOUR_USERNAME/nllb-bariba-french ./nllb-bariba-final`}
                    </code>
                  </pre>
                  <Alert>
                    <CheckCircle2 className="h-4 w-4" />
                    <AlertDescription>
                      Votre modèle sera accessible gratuitement via l'API Inference de Hugging Face !
                    </AlertDescription>
                  </Alert>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>3.2 Configurer dans Lovable</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ol className="list-decimal pl-5 space-y-3 text-sm">
                    <li>
                      <strong>Ajouter le token HF aux secrets</strong>
                      <p className="text-muted-foreground mt-1">
                        Allez dans Settings → Secrets et ajoutez <code>HUGGING_FACE_API_TOKEN</code>
                      </p>
                    </li>
                    <li>
                      <strong>Modifier l'edge function</strong>
                      <p className="text-muted-foreground mt-1">
                        Dans <code>supabase/functions/huggingface-translate/index.ts</code>, 
                        remplacez <code>your-username/nllb-bariba-french</code> par votre nom de modèle HF
                      </p>
                    </li>
                    <li>
                      <strong>Tester</strong>
                      <p className="text-muted-foreground mt-1">
                        Le système utilisera automatiquement votre modèle fine-tuné pour les phrases complexes !
                      </p>
                    </li>
                  </ol>
                </CardContent>
              </Card>

              <Card className="bg-green-500/5 border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-green-600">🎉 Félicitations !</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm mb-4">
                    Vous avez maintenant un système de traduction haute qualité 100% GRATUIT avec :
                  </p>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      200+ idiomes (confiance 100%)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Cache intelligent (80%+ confiance)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      SimplifiedAI local (50-80% confiance)
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <strong>Votre modèle NLLB-200 fine-tuné (75-92% confiance)</strong>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      Lovable AI en backup (90-98% confiance)
                    </li>
                  </ul>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};
