import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface SmartAssistantRequest {
  message: string;
  context?: 'agriculture' | 'finance' | 'education' | 'market' | 'health' | 'general';
  conversationHistory?: Message[];
  language?: 'fr' | 'ba';
}

// Context-specific system prompts
const contextPrompts: Record<string, string> = {
  agriculture: `Tu es un conseiller agricole expert pour les agriculteurs du Bénin et d'Afrique de l'Ouest.
Tu donnes des conseils pratiques sur:
- Les cultures (maïs, riz, manioc, sorgho, arachide, etc.)
- L'élevage (bovins, volailles, caprins, ovins)
- La météo et l'irrigation
- Les engrais et traitements
- La récolte et le stockage
- Les prix du marché agricole

Réponds de manière simple, pratique et adaptée aux réalités locales.
Utilise des unités locales (sacs, bassines, francs CFA).
Propose des solutions accessibles et peu coûteuses.`,

  finance: `Tu es un conseiller financier simplifié pour les agriculteurs et petits commerçants du Bénin.
Tu aides avec:
- Le suivi des ventes et dépenses
- Les tontines (comment ça fonctionne, avantages)
- Le microcrédit (comment y accéder)
- L'épargne simple
- Les prix du marché
- Mobile Money (MTN MoMo, Moov Money)

Explique de manière très simple, sans jargon financier.
Donne des exemples concrets avec des montants en francs CFA.`,

  education: `Tu es un formateur patient pour les agriculteurs du Bénin qui veulent apprendre.
Tu enseignes de manière orale et simple:
- Techniques agricoles modernes
- Gestion d'une petite exploitation
- Calculs de base (bénéfices, rendements)
- Santé et nutrition familiale
- Entrepreneuriat rural

Utilise des analogies simples et des exemples concrets.
Fais des résumés courts et mémorables.
Pose des questions pour vérifier la compréhension.`,

  market: `Tu es un assistant pour le marché agricole du Bénin.
Tu aides à:
- Créer des annonces de vente
- Trouver des acheteurs/vendeurs
- Négocier les prix
- Comprendre les tendances du marché
- Trouver des opportunités d'emploi agricole

Donne des conseils pratiques sur la vente et la négociation.
Indique les prix typiques quand c'est possible.`,

  health: `Tu es un conseiller en santé de base pour les communautés rurales du Bénin.
Tu donnes des conseils sur:
- Les premiers secours simples
- La nutrition familiale
- L'hygiène et prévention des maladies
- Quand consulter un médecin
- Les médicaments de base

IMPORTANT: Pour tout problème grave, recommande TOUJOURS de consulter un professionnel de santé.
Ne fais pas de diagnostic médical.`,

  general: `Tu es un assistant vocal polyvalent pour la plateforme TamTam au Bénin.
Tu peux aider avec l'agriculture, la finance, l'éducation, le marché et la santé de base.
Tu détectes le sujet de la question et réponds de manière appropriée.
Tu es patient, simple et pratique dans tes réponses.`
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, context = 'general', conversationHistory = [], language = 'fr' }: SmartAssistantRequest = await req.json();

    if (!message) {
      return new Response(
        JSON.stringify({ error: 'Message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`🤖 Smart Assistant: context=${context}, message="${message.substring(0, 50)}..."`);

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Build messages array
    const systemPrompt = contextPrompts[context] || contextPrompts.general;
    const messages: Message[] = [
      { role: 'system', content: systemPrompt + '\n\nRéponds en français simple. Limite ta réponse à 3-4 phrases maximum.' },
      ...conversationHistory.slice(-6),
      { role: 'user', content: message }
    ];

    // Call Lovable AI Gateway
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages,
        max_tokens: 300,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ 
            error: 'Service temporairement indisponible',
            response_fr: 'Désolé, le service est temporairement surchargé. Réessayez dans quelques secondes.',
            response_ba: 'Má bìnú, iṣẹ́ ti kún. Gbìyànjú lẹ́ẹ̀kan sí i.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ 
            error: 'Credits épuisés',
            response_fr: 'Service temporairement indisponible. Contactez l\'administrateur.',
            response_ba: 'Iṣẹ́ kò sí fún ìgbà díẹ̀.'
          }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error('AI Gateway error:', response.status, errorText);
      throw new Error(`AI Gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content || '';

    console.log(`✅ Smart Assistant response: "${aiResponse.substring(0, 100)}..."`);

    return new Response(
      JSON.stringify({
        response: aiResponse,
        response_fr: aiResponse,
        response_ba: '', // Will be translated client-side
        context,
        detected_context: context
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Smart Assistant error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Assistant error',
        response_fr: 'Désolé, une erreur s\'est produite. Réessayez.',
        response_ba: 'Má bìnú, àṣìṣe kan wáyé. Gbìyànjú lẹ́ẹ̀kan sí i.'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
