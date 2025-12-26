import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface MarketProduct {
  id: string;
  seller_id: string | null;
  title: string;
  title_fr: string | null;
  title_ba: string | null;
  description_text: string | null;
  description_audio_url: string | null;
  audio_description_ba: string | null;
  price: number | null;
  currency: string | null;
  category: string | null;
  images: string[] | null;
  thumbnail_url: string | null;
  emoji_icon: string | null;
  status: 'available' | 'sold' | 'reserved';
  contact_audio_url: string | null;
  seller_phone: string | null;
  location: string | null;
  is_available: boolean | null;
  views_count: number | null;
  created_at: string | null;
  updated_at: string | null;
  // Joined seller profile
  seller_profile?: {
    display_name: string | null;
    avatar_url: string | null;
    username: string;
  };
}

export interface CreateProductInput {
  title_fr: string;
  title_ba?: string;
  description_text?: string;
  description_audio_url?: string;
  audio_description_ba?: string;
  price?: number;
  currency?: string;
  category?: string;
  images?: string[];
  thumbnail_url?: string;
  emoji_icon?: string;
  contact_audio_url?: string;
  seller_phone?: string;
  location?: string;
}

export interface UseMarketProductsReturn {
  products: MarketProduct[];
  myProducts: MarketProduct[];
  isLoading: boolean;
  isCreating: boolean;
  error: string | null;
  fetchProducts: (category?: string, searchQuery?: string) => Promise<void>;
  fetchMyProducts: () => Promise<void>;
  createProduct: (input: CreateProductInput) => Promise<MarketProduct | null>;
  updateProduct: (id: string, input: Partial<CreateProductInput>) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  updateStatus: (id: string, status: 'available' | 'sold' | 'reserved') => Promise<boolean>;
  searchProducts: (query: string) => Promise<MarketProduct[]>;
}

export function useMarketProducts(): UseMarketProductsReturn {
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [myProducts, setMyProducts] = useState<MarketProduct[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchProducts = useCallback(async (category?: string, searchQuery?: string) => {
    setIsLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('tamtam_products')
        .select(`
          *,
          seller_profile:tamtam_profiles!tamtam_products_seller_id_fkey(
            display_name, avatar_url, username
          )
        `)
        .eq('is_available', true)
        .order('created_at', { ascending: false });

      if (category) {
        query = query.eq('category', category);
      }

      if (searchQuery) {
        query = query.or(`title_fr.ilike.%${searchQuery}%,title_ba.ilike.%${searchQuery}%,description_text.ilike.%${searchQuery}%`);
      }

      const { data, error: fetchError } = await query;

      if (fetchError) throw fetchError;

      setProducts((data || []) as unknown as MarketProduct[]);
    } catch (err: any) {
      console.error('[useMarketProducts] fetchProducts error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchMyProducts = useCallback(async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('tamtam_products')
        .select('*')
        .eq('seller_id', user.id)
        .order('created_at', { ascending: false });

      if (fetchError) throw fetchError;

      setMyProducts((data || []) as unknown as MarketProduct[]);
    } catch (err: any) {
      console.error('[useMarketProducts] fetchMyProducts error:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  const createProduct = useCallback(async (input: CreateProductInput): Promise<MarketProduct | null> => {
    if (!user) {
      toast({
        title: "Erreur",
        description: "Vous devez être connecté pour créer une annonce",
        variant: "destructive"
      });
      return null;
    }

    setIsCreating(true);
    try {
      const { data, error: insertError } = await supabase
        .from('tamtam_products')
        .insert({
          seller_id: user.id,
          title: input.title_fr,
          title_fr: input.title_fr,
          title_ba: input.title_ba,
          description_text: input.description_text,
          description_audio_url: input.description_audio_url,
          audio_description_ba: input.audio_description_ba,
          price: input.price,
          currency: input.currency || 'XOF',
          category: input.category,
          images: input.images,
          thumbnail_url: input.thumbnail_url,
          emoji_icon: input.emoji_icon || '📦',
          contact_audio_url: input.contact_audio_url,
          seller_phone: input.seller_phone,
          location: input.location,
          is_available: true,
          status: 'available'
        })
        .select()
        .single();

      if (insertError) throw insertError;

      const newProduct = data as unknown as MarketProduct;
      setMyProducts(prev => [newProduct, ...prev]);
      
      toast({
        title: "✅ Annonce créée",
        description: "Votre produit est maintenant visible"
      });

      return newProduct;
    } catch (err: any) {
      console.error('[useMarketProducts] createProduct error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return null;
    } finally {
      setIsCreating(false);
    }
  }, [user, toast]);

  const updateProduct = useCallback(async (id: string, input: Partial<CreateProductInput>): Promise<boolean> => {
    try {
      const updateData: any = { ...input };
      if (input.title_fr) {
        updateData.title = input.title_fr;
      }

      const { error: updateError } = await supabase
        .from('tamtam_products')
        .update(updateData)
        .eq('id', id)
        .eq('seller_id', user?.id);

      if (updateError) throw updateError;

      setMyProducts(prev => 
        prev.map(p => p.id === id ? { ...p, ...updateData } : p)
      );

      toast({
        title: "✅ Annonce modifiée",
        description: "Les changements ont été enregistrés"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketProducts] updateProduct error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  const deleteProduct = useCallback(async (id: string): Promise<boolean> => {
    try {
      const { error: deleteError } = await supabase
        .from('tamtam_products')
        .delete()
        .eq('id', id)
        .eq('seller_id', user?.id);

      if (deleteError) throw deleteError;

      setMyProducts(prev => prev.filter(p => p.id !== id));
      setProducts(prev => prev.filter(p => p.id !== id));

      toast({
        title: "🗑️ Annonce supprimée",
        description: "Votre annonce a été retirée"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketProducts] deleteProduct error:', err);
      toast({
        title: "Erreur",
        description: err.message,
        variant: "destructive"
      });
      return false;
    }
  }, [user, toast]);

  const updateStatus = useCallback(async (id: string, status: 'available' | 'sold' | 'reserved'): Promise<boolean> => {
    try {
      const { error: updateError } = await supabase
        .from('tamtam_products')
        .update({ 
          status,
          is_available: status === 'available'
        })
        .eq('id', id)
        .eq('seller_id', user?.id);

      if (updateError) throw updateError;

      setMyProducts(prev => 
        prev.map(p => p.id === id ? { ...p, status, is_available: status === 'available' } : p)
      );

      const statusLabels = {
        available: '🟢 Disponible',
        sold: '🔴 Vendu',
        reserved: '🟠 Réservé'
      };

      toast({
        title: statusLabels[status],
        description: "Statut mis à jour"
      });

      return true;
    } catch (err: any) {
      console.error('[useMarketProducts] updateStatus error:', err);
      return false;
    }
  }, [user, toast]);

  const searchProducts = useCallback(async (query: string): Promise<MarketProduct[]> => {
    try {
      const { data, error: searchError } = await supabase
        .from('tamtam_products')
        .select('*')
        .eq('is_available', true)
        .or(`title_fr.ilike.%${query}%,title_ba.ilike.%${query}%,description_text.ilike.%${query}%,category.ilike.%${query}%`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (searchError) throw searchError;

      return (data || []) as unknown as MarketProduct[];
    } catch (err: any) {
      console.error('[useMarketProducts] searchProducts error:', err);
      return [];
    }
  }, []);

  return {
    products,
    myProducts,
    isLoading,
    isCreating,
    error,
    fetchProducts,
    fetchMyProducts,
    createProduct,
    updateProduct,
    deleteProduct,
    updateStatus,
    searchProducts
  };
}
