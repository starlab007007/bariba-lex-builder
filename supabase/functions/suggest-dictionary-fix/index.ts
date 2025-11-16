import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { entry, issue } = await req.json();
    
    console.log('Received suggestion request:', { entry, issue });

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY is not configured');
    }

    // Construire le prompt contextuel basé sur le type de problème
    let prompt = `Tu es un expert en linguistique Baatɔnum. Analyse cette entrée du dictionnaire et suggère une correction pour le problème suivant :

ENTRÉE :
Mot: ${entry.word}
Définition: ${entry.definition}
Catégorie: ${entry.part_of_speech || 'non définie'}
`;

    // Ajouter les informations grammaticales pertinentes
    if (entry.nominal_class) prompt += `Classe nominale: ${entry.nominal_class}\n`;
    if (entry.plural_form) prompt += `Forme plurielle: ${entry.plural_form}\n`;
    if (entry.verb_root) prompt += `Racine verbale: ${entry.verb_root}\n`;
    if (entry.verbal_group) prompt += `Groupe verbal: ${entry.verbal_group}\n`;
    if (entry.verb_type) prompt += `Type de verbe: ${entry.verb_type}\n`;

    prompt += `\nPROBLÈME DÉTECTÉ :
Catégorie: ${issue.category}
Message: ${issue.message}
Champ concerné: ${issue.field}

CONTEXTE LINGUISTIQUE :
- Classes nominales valides en Baatɔnum: b, g, m, n, s, t, w, y
- Groupes verbaux: 1-5
- Types de verbes courants: v.tr (transitif), v.int (intransitif), vd (défectif), veq (équatif), v.inv (invariable), v.stat (statif), lv (verbe léger)

INSTRUCTIONS :
1. Analyse le problème dans son contexte linguistique Baatɔnum
2. Propose UNE correction spécifique et précise
3. Explique brièvement pourquoi cette correction est appropriée (1-2 phrases max)
4. Si plusieurs solutions sont possibles, choisis la plus probable selon les règles du Baatɔnum

Format de réponse JSON STRICTEMENT :
{
  "field": "nom_du_champ",
  "value": "valeur_corrigée",
  "explanation": "Brève explication (max 2 phrases)"
}

IMPORTANT : Réponds UNIQUEMENT avec le JSON, sans texte avant ou après.`;

    console.log('Sending prompt to Lovable AI...');

    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'Tu es un expert en linguistique Baatɔnum. Tu réponds toujours en JSON valide, sans texte supplémentaire.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 500
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      
      if (response.status === 429) {
        return new Response(JSON.stringify({ 
          error: 'Limite de requêtes atteinte. Veuillez réessayer dans quelques instants.' 
        }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      if (response.status === 402) {
        return new Response(JSON.stringify({ 
          error: 'Crédits insuffisants. Veuillez ajouter des crédits à votre espace de travail.' 
        }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices?.[0]?.message?.content;
    
    if (!aiResponse) {
      throw new Error('No response from AI');
    }

    console.log('AI raw response:', aiResponse);

    // Extraire le JSON de la réponse (en cas de texte supplémentaire)
    let suggestion;
    try {
      // Essayer de parser directement
      suggestion = JSON.parse(aiResponse);
    } catch {
      // Si échec, essayer d'extraire le JSON avec regex
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        suggestion = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('Invalid JSON response from AI');
      }
    }

    // Valider la structure de la suggestion
    if (!suggestion.field || suggestion.value === undefined || !suggestion.explanation) {
      throw new Error('Invalid suggestion structure');
    }

    console.log('Parsed suggestion:', suggestion);

    return new Response(JSON.stringify({ 
      suggestion,
      entry_id: entry.id 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error: any) {
    console.error('Error in suggest-dictionary-fix:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Une erreur est survenue lors de la génération de la suggestion' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
