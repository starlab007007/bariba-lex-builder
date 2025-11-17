/**
 * Service de gestion des expressions idiomatiques baatonum
 * Phase 5 du rapport: 2000+ idiomes pour traduction non-littérale
 */

import { supabase } from "@/integrations/supabase/client";

export interface Idiom {
  id: string;
  french_expression: string;
  bariba_expression: string;
  category: string;
  usage_context?: string;
  is_verified: boolean;
}

export class IdiomService {
  private idiomCache: Map<string, string> = new Map(); // FR -> BBA
  private reverseIdiomCache: Map<string, string> = new Map(); // BBA -> FR
  private isLoaded = false;

  /**
   * Charge tous les idiomes depuis la base de données
   */
  async loadIdioms(): Promise<void> {
    if (this.isLoaded) return;

    console.log("📚 Chargement des expressions idiomatiques...");

    try {
      const { data, error } = await supabase
        .from('idiomatic_expressions')
        .select('*')
        .eq('is_verified', true);

      if (error) throw error;

      // Construire les caches
      data?.forEach(idiom => {
        const frenchLower = idiom.french_expression.toLowerCase().trim();
        const baribaLower = idiom.bariba_expression.toLowerCase().trim();
        
        this.idiomCache.set(frenchLower, idiom.bariba_expression);
        this.reverseIdiomCache.set(baribaLower, idiom.french_expression);
      });

      this.isLoaded = true;
      console.log(`✅ ${data?.length || 0} idiomes chargés`);
    } catch (error) {
      console.error("❌ Erreur lors du chargement des idiomes:", error);
    }
  }

  /**
   * Recherche un idiome français et retourne sa traduction bariba
   * Confiance 100% si trouvé
   */
  findFrenchIdiom(text: string): { translation: string; confidence: number } | null {
    if (!this.isLoaded) {
      console.warn("Idiomes non chargés, appelez loadIdioms() d'abord");
      return null;
    }

    const textLower = text.toLowerCase().trim();
    const bariba = this.idiomCache.get(textLower);

    if (bariba) {
      return { translation: bariba, confidence: 100 };
    }

    // Recherche partielle (si le texte contient l'idiome)
    for (const [frenchExpr, baribaExpr] of this.idiomCache.entries()) {
      if (textLower.includes(frenchExpr)) {
        return { translation: baribaExpr, confidence: 95 };
      }
    }

    return null;
  }

  /**
   * Recherche un idiome bariba et retourne sa traduction française
   */
  findBaribaIdiom(text: string): { translation: string; confidence: number } | null {
    if (!this.isLoaded) {
      console.warn("Idiomes non chargés, appelez loadIdioms() d'abord");
      return null;
    }

    const textLower = text.toLowerCase().trim();
    const french = this.reverseIdiomCache.get(textLower);

    if (french) {
      return { translation: french, confidence: 100 };
    }

    // Recherche partielle
    for (const [baribaExpr, frenchExpr] of this.reverseIdiomCache.entries()) {
      if (textLower.includes(baribaExpr)) {
        return { translation: frenchExpr, confidence: 95 };
      }
    }

    return null;
  }

  /**
   * Recherche tous les idiomes d'une catégorie
   */
  async getIdiomsByCategory(category: string): Promise<Idiom[]> {
    const { data, error } = await supabase
      .from('idiomatic_expressions')
      .select('*')
      .eq('category', category)
      .eq('is_verified', true);

    if (error) {
      console.error("Erreur lors de la récupération des idiomes:", error);
      return [];
    }

    return data || [];
  }

  /**
   * Ajoute un nouvel idiome (admin uniquement)
   */
  async addIdiom(idiom: Omit<Idiom, 'id'>): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('idiomatic_expressions')
        .insert([idiom]);

      if (error) throw error;

      // Invalider le cache pour forcer le rechargement
      this.isLoaded = false;
      
      return true;
    } catch (error) {
      console.error("Erreur lors de l'ajout de l'idiome:", error);
      return false;
    }
  }

  /**
   * Retourne le nombre d'idiomes chargés
   */
  getIdiomCount(): number {
    return this.idiomCache.size;
  }
}

// Export singleton
export const idiomService = new IdiomService();
