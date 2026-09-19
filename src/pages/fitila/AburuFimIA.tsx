import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronRight, ImagePlus, Loader2, MapPin, Package, Sparkles, Upload, Volume2, WandSparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useMarketProducts, MarketProduct } from '@/hooks/useMarketProducts';
import { uploadMediaWithProgress, removeOwnedMedia, MEDIA_LIMITS, MediaUploadError, probeDuration } from '@/lib/mediaUpload';
import { useToast } from '@/hooks/use-toast';

type Step = 'product' | 'media' | 'ai' | 'personalize' | 'preview' | 'publish';
type Status = 'idle' | 'loading' | 'generating' | 'uploading' | 'publishing' | 'success' | 'error' | 'offline';
type Draft = {
  productId: string | null;
  textFr: string;
  textBa: string;
  headline: string;
  cta: string;
  hashtags: string[];
  script: string;
  bilingual: boolean;
};

const DRAFT_KEY = 'fitila:aburu-fim:draft:v1';
const STEPS: Array<{ id: Step; label: string }> = [
  { id: 'product', label: 'Produit' },
  { id: 'media', label: 'Média' },
  { id: 'ai', label: 'Aburu IA' },
  { id: 'personalize', label: 'Personnaliser' },
  { id: 'preview', label: 'Aperçu' },
  { id: 'publish', label: 'Publier' },
];

const humanError = (error: unknown) => {
  const message = error instanceof Error ? error.message : String(error || '');
  if (/auth|connectez|jwt|session/i.test(message)) return 'Votre session a expiré. Reconnectez-vous puis réessayez.';
  if (/network|connexion|fetch|offline/i.test(message)) return 'Connexion indisponible. Votre création est conservée.';
  if (/trop volumineux|trop longue/i.test(message)) return message;
  return 'Impossible de terminer cette opération pour le moment.';
};

export default function AburuFimIA() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  const { myProducts, fetchMyProducts, createProduct, isLoading } = useMarketProducts();
  const [step, setStep] = useState<Step>('product');
  const [status, setStatus] = useState<Status>(navigator.onLine ? 'idle' : 'offline');
  const [selectedProduct, setSelectedProduct] = useState<MarketProduct | null>(null);
  const [search, setSearch] = useState('');
  const [showQuickProduct, setShowQuickProduct] = useState(false);
  const [quick, setQuick] = useState({ title_fr: '', description_text: '', price: '', category: '', location: '' });
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaKind, setMediaKind] = useState<'photo' | 'video'>('photo');
  const [progress, setProgress] = useState(0);
  const [draft, setDraft] = useState<Draft>({ productId: null, textFr: '', textBa: '', headline: '', cta: '', hashtags: [], script: '', bilingual: true });
  const [publishedPostId, setPublishedPostId] = useState<string | null>(null);
  const publishLock = useRef(false);
  const galleryInput = useRef<HTMLInputElement>(null);
  const cameraPhotoInput = useRef<HTMLInputElement>(null);
  const cameraVideoInput = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchMyProducts(); }, [fetchMyProducts]);
  useEffect(() => {
    const online = () => setStatus((s) => s === 'offline' ? 'idle' : s);
    const offline = () => setStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);
  useEffect(() => {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const saved = JSON.parse(raw);
      setDraft((d) => ({ ...d, ...saved }));
      if (saved.productId) {
        const product = myProducts.find((p) => p.id === saved.productId);
        if (product) setSelectedProduct(product);
      }
    } catch {}
  }, [myProducts]);
  useEffect(() => { localStorage.setItem(DRAFT_KEY, JSON.stringify(draft)); }, [draft]);
  useEffect(() => () => { if (mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl); }, [mediaUrl]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return myProducts.filter((p) => !q || [p.title_fr, p.title_ba, p.category, p.location].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)));
  }, [myProducts, search]);

  const choose = (p: MarketProduct) => {
    setSelectedProduct(p);
    setDraft((d) => ({ ...d, productId: p.id, textFr: d.textFr || p.description_text || p.title_fr || p.title, headline: d.headline || p.title_fr || p.title }));
  };

  const addQuickProduct = async () => {
    if (!quick.title_fr.trim()) return toast({ title: 'Titre requis', variant: 'destructive' });
    const product = await createProduct({
      title_fr: quick.title_fr.trim(),
      description_text: quick.description_text.trim() || undefined,
      price: quick.price ? Number(quick.price) : undefined,
      category: quick.category.trim() || undefined,
      location: quick.location.trim() || undefined,
      currency: 'XOF',
    });
    if (product) {
      choose(product);
      setShowQuickProduct(false);
      setQuick({ title_fr: '', description_text: '', price: '', category: '', location: '' });
    }
  };

  const onMedia = async (file?: File) => {
    if (!file) return;
    const kind = file.type.startsWith('video/') ? 'video' : file.type.startsWith('image/') ? 'photo' : null;
    if (!kind) return toast({ title: 'Format non pris en charge', description: 'Choisissez une photo ou une vidéo.', variant: 'destructive' });
    try {
      if (kind === 'video') {
        if (file.size > MEDIA_LIMITS.videoMaxBytes) throw new MediaUploadError('Vidéo trop volumineuse (maximum 50 Mo).');
        const duration = await probeDuration(file, 'video');
        if (duration !== null && duration > MEDIA_LIMITS.videoMaxSeconds + 1) throw new MediaUploadError('Vidéo trop longue (maximum 60 secondes).');
      } else if (file.size > MEDIA_LIMITS.imageMaxBytes) {
        throw new MediaUploadError('Photo trop volumineuse (maximum 10 Mo).');
      }
      if (mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl);
      setMediaFile(file);
      setMediaKind(kind);
      setMediaUrl(URL.createObjectURL(file));
    } catch (e) {
      toast({ title: 'Média refusé', description: humanError(e), variant: 'destructive' });
    }
  };

  const generate = async (tone = 'vendeur') => {
    if (!selectedProduct) return;
    setStatus('generating');
    try {
      const { data, error } = await supabase.functions.invoke('aburu-fim-ai', {
        body: { action: 'generate', tone, language: 'fr', product: selectedProduct },
      });
      if (error || !data?.success) throw error || new Error(data?.error || 'IA indisponible');
      setDraft((d) => ({ ...d, headline: data.headline || d.headline, textFr: data.caption || d.textFr, cta: data.cta || '', hashtags: data.hashtags || [], script: data.script || '' }));
      setStatus('idle');
    } catch (e) {
      setStatus('error');
      toast({ title: 'Aburu IA indisponible', description: humanError(e), variant: 'destructive' });
    }
  };

  const translate = async () => {
    if (!draft.textFr.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke('ai-translate', {
        body: { text: draft.textFr, sourceLang: 'french', targetLang: 'bariba' },
      });
      if (error) throw error;
      const translation = data?.translation || data?.translatedText || data?.text;
      if (!translation) throw new Error('Traduction vide');
      setDraft((d) => ({ ...d, textBa: String(translation) }));
      toast({ title: 'Version Baatonum prête' });
    } catch {
      toast({ title: 'Traduction indisponible', description: 'Vous pouvez publier la version française sans perdre votre Fim.', variant: 'destructive' });
    }
  };

  const speakBariba = async () => {
    if (!draft.textBa.trim()) return;
    try {
      const { data, error } = await supabase.functions.invoke('bariba-tts', { body: { text: draft.textBa } });
      if (error || !data?.audio_url) throw error || new Error('Voix indisponible');
      const audio = new Audio(data.audio_url);
      await audio.play();
    } catch {
      toast({ title: 'Lecture Baatonum indisponible', description: 'La publication reste disponible.', variant: 'destructive' });
    }
  };

  const publish = async () => {
    if (publishLock.current) return;
    if (!user || !selectedProduct || !mediaFile) return toast({ title: 'Produit et média requis', variant: 'destructive' });
    if (!navigator.onLine) {
      setStatus('offline');
      return toast({ title: 'Vous êtes hors ligne', description: 'Votre création est conservée.', variant: 'destructive' });
    }
    publishLock.current = true;
    setStep('publish');
    setStatus('uploading');
    let uploaded = '';
    try {
      uploaded = await uploadMediaWithProgress(mediaFile, {
        kind: mediaKind,
        folder: `${user.id}/aburu-fim`,
        onProgress: setProgress,
      });
      if (!uploaded || uploaded.startsWith('local://')) throw new Error('Upload invalide');
      setStatus('publishing');
      const { data: existingProfile } = await supabase.from('tamtam_profiles').select('user_id').eq('user_id', user.id).maybeSingle();
      if (!existingProfile) {
        const shortId = user.id.replace(/-/g, '').slice(0, 8);
        const { error: profileError } = await supabase.from('tamtam_profiles').insert({
          user_id: user.id,
          username: `user_${shortId}`,
          display_name: user.user_metadata?.display_name || 'Utilisateur',
        });
        if (profileError) throw profileError;
      }

      const { data, error } = await supabase.from('tamtam_posts').insert({
        user_id: user.id,
        product_id: selectedProduct.id,
        media_type: mediaKind,
        media_url: uploaded,
        audio_url: mediaKind === 'video' ? uploaded : null,
        transcript_fr: draft.textFr || selectedProduct.description_text || selectedProduct.title_fr || selectedProduct.title,
        transcript_ba: draft.bilingual ? (draft.textBa || null) : null,
        feeling_emoji: '✨',
        topic: 'aburu_fim',
        template_id: 'aburu-fim-premium',
        hashtags: draft.hashtags,
        is_public: true,
      }).select().single();
      if (error || !data?.id) throw error || new Error('Publication non créée');
      setPublishedPostId(data.id);
      setStatus('success');
      localStorage.removeItem(DRAFT_KEY);
      toast({ title: 'Votre Aburu Fim est publié' });
    } catch (e) {
      if (uploaded) await removeOwnedMedia(uploaded);
      setStatus('error');
      toast({ title: 'Publication interrompue', description: 'Votre brouillon a été conservé. Réessayez.', variant: 'destructive' });
    } finally {
      publishLock.current = false;
    }
  };

  const currentStep = STEPS.findIndex((s) => s.id === step);

  const next = async () => {
    if (step === 'product') {
      if (!selectedProduct) return toast({ title: 'Sélectionnez un produit', variant: 'destructive' });
      setStep('media');
    } else if (step === 'media') {
      if (!mediaFile) return toast({ title: 'Ajoutez une photo ou vidéo', variant: 'destructive' });
      setStep('ai');
    } else if (step === 'ai') {
      if (!draft.textFr) {
        await generate();
        return;
      }
      setStep('personalize');
    } else if (step === 'personalize') setStep('preview');
    else if (step === 'preview') await publish();
  };

  return (
    <div className="min-h-[100dvh] bg-[#080A0F] text-white overflow-x-hidden" style={{ paddingTop: 'max(1rem, env(safe-area-inset-top))', paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#080A0F]/90 backdrop-blur-xl px-4 py-3">
        <div className="mx-auto max-w-6xl flex items-center gap-3 min-w-0">
          <button aria-label="Retour" onClick={() => navigate(-1)} className="h-11 w-11 shrink-0 rounded-2xl bg-white/10 grid place-items-center"><ArrowLeft /></button>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 min-w-0"><h1 className="font-black text-xl sm:text-2xl truncate">Aburu Fim IA</h1><span className="hidden sm:inline-flex rounded-full bg-amber-400/15 px-2 py-1 text-xs text-amber-300">✨ Fitila IA</span></div>
            <p className="text-xs sm:text-sm text-white/55 truncate">Transformez votre produit en contenu qui attire</p>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5">
        <div className="mb-5 overflow-x-auto scrollbar-hide">
          <div className="flex min-w-max gap-2">
            {STEPS.map((s, i) => <div key={s.id} className={`flex items-center gap-2 rounded-full px-3 py-2 text-xs font-semibold ${i <= currentStep ? "bg-amber-400 text-black" : "bg-white/7 text-white/45"}`}><span>{i < currentStep ? '✓' : i + 1}</span>{s.label}</div>)}
          </div>
        </div>

        {status === 'offline' && <div className="mb-4 rounded-2xl border border-amber-400/30 bg-amber-400/10 p-4 text-sm">Vous êtes hors ligne. Votre création est conservée et pourra être publiée au retour du réseau.</div>}

        {step === 'product' && <section>
          <div className="mb-4 rounded-[28px] border border-white/10 bg-gradient-to-br from-amber-400/15 via-white/[0.04] to-violet-400/10 p-5">
            <span className="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs">✨ Propulsé par Fitila IA</span>
            <h2 className="mt-3 text-2xl sm:text-4xl font-black leading-tight">Choisissez le produit à mettre en lumière.</h2>
            <p className="mt-2 text-sm text-white/55">Utilisez un produit réel de votre Marché FITILA ou créez-en un rapidement.</p>
          </div>
          <div className="flex gap-2 mb-4"><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher dans mon Marché…" className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-white/5 px-4 py-3 outline-none"/><button onClick={() => setShowQuickProduct((v) => !v)} className="shrink-0 rounded-2xl bg-white text-black px-4 font-bold">+ Produit</button></div>
          {showQuickProduct && <div className="mb-5 grid gap-3 rounded-3xl bg-white/[0.06] p-4 sm:grid-cols-2">
            <input className="rounded-xl bg-black/30 p-3" placeholder="Nom du produit" value={quick.title_fr} onChange={e=>setQuick({...quick,title_fr:e.target.value})}/>
            <input className="rounded-xl bg-black/30 p-3" placeholder="Prix FCFA" inputMode="decimal" value={quick.price} onChange={e=>setQuick({...quick,price:e.target.value})}/>
            <input className="rounded-xl bg-black/30 p-3" placeholder="Catégorie" value={quick.category} onChange={e=>setQuick({...quick,category:e.target.value})}/>
            <input className="rounded-xl bg-black/30 p-3" placeholder="Localisation" value={quick.location} onChange={e=>setQuick({...quick,location:e.target.value})}/>
            <textarea className="sm:col-span-2 rounded-xl bg-black/30 p-3 min-h-24" placeholder="Description" value={quick.description_text} onChange={e=>setQuick({...quick,description_text:e.target.value})}/>
            <button disabled={status==='loading'} onClick={addQuickProduct} className="sm:col-span-2 h-12 rounded-xl bg-amber-400 text-black font-bold">Créer et sélectionner</button>
          </div>}
          {isLoading ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[0,1,2].map(i=><div key={i} className="h-32 animate-pulse rounded-3xl bg-white/5"/>)}</div> :
          filtered.length === 0 ? <div className="rounded-3xl border border-dashed border-white/15 p-10 text-center"><Package className="mx-auto mb-3 opacity-40"/><p className="font-bold">Aucun produit disponible</p><p className="text-sm text-white/45">Ajoutez votre premier produit pour créer votre Fim.</p></div> :
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{filtered.map(p=><button key={p.id} onClick={()=>choose(p)} className={`min-w-0 rounded-3xl border p-4 text-left transition ${selectedProduct?.id===p.id ? "border-amber-400 bg-amber-400/10 shadow-[0_0_40px_rgba(251,191,36,.12)]" : "border-white/10 bg-white/[0.04]"}`}>
            <div className="flex gap-3 min-w-0">{(p.thumbnail_url || p.images?.[0]) ? <img src={p.thumbnail_url || p.images?.[0] || ''} className="h-20 w-20 shrink-0 rounded-2xl object-cover"/> : <div className="h-20 w-20 shrink-0 rounded-2xl bg-white/10 grid place-items-center text-3xl">{p.emoji_icon || '📦'}</div>}<div className="min-w-0 flex-1"><div className="flex items-start justify-between gap-2"><p className="font-bold break-words">{p.title_fr || p.title}</p>{selectedProduct?.id===p.id && <Check className="text-amber-300 shrink-0"/>}</div><p className="mt-1 text-amber-300 font-black">{p.price != null ? `${Number(p.price).toLocaleString("fr-FR")} ${p.currency || "XOF"}` : 'Prix à convenir'}</p><p className="mt-1 text-xs text-white/45 break-words">{p.location || p.category || 'Produit FITILA'}</p></div></div>
          </button>)}</div>}
        </section>}

        {step === 'media' && <section className="mx-auto max-w-3xl">
          <h2 className="text-3xl font-black">Média du produit</h2><p className="mt-1 text-white/50">Photo jusqu’à 10 Mo · vidéo jusqu’à 50 Mo et 60 secondes.</p>
          <input ref={galleryInput} type="file" accept="image/*,video/*" className="hidden" onChange={(e)=>onMedia(e.target.files?.[0])}/>
          <input ref={cameraPhotoInput} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e)=>onMedia(e.target.files?.[0])}/>
          <input ref={cameraVideoInput} type="file" accept="video/*" capture="environment" className="hidden" onChange={(e)=>onMedia(e.target.files?.[0])}/>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <button onClick={()=>cameraPhotoInput.current?.click()} className="h-12 rounded-2xl bg-white/8 text-sm font-bold">📷 Caméra</button>
            <button onClick={()=>galleryInput.current?.click()} className="h-12 rounded-2xl bg-white/8 text-sm font-bold">🖼 Galerie</button>
            <button onClick={()=>cameraVideoInput.current?.click()} className="h-12 rounded-2xl bg-white/8 text-sm font-bold">🎥 Vidéo</button>
          </div>
          <button onClick={()=>galleryInput.current?.click()} className="mt-3 w-full min-h-64 rounded-[32px] border border-dashed border-white/20 bg-white/[0.04] overflow-hidden relative">
            {mediaUrl ? (mediaKind==='video' ? <video src={mediaUrl} controls className="w-full max-h-[65dvh] object-contain"/> : <img src={mediaUrl} className="w-full max-h-[65dvh] object-contain"/>) : <div className="py-16"><ImagePlus className="mx-auto h-12 w-12 text-amber-300"/><p className="mt-3 font-bold">Ajouter une photo ou vidéo</p><p className="text-sm text-white/45">Caméra ou galerie selon votre appareil</p></div>}
          </button>
          {mediaFile && <div className="mt-3 flex items-center justify-between gap-3 rounded-2xl bg-white/5 p-3"><p className="min-w-0 truncate text-sm">{mediaFile.name}</p><button onClick={()=>{ if(mediaUrl.startsWith('blob:')) URL.revokeObjectURL(mediaUrl); setMediaFile(null);setMediaUrl('');}} className="h-10 w-10 shrink-0 rounded-xl bg-red-500/15 grid place-items-center"><X size={18}/></button></div>}
        </section>}

        {step === 'ai' && <section className="mx-auto max-w-3xl">
          <div className="rounded-[32px] border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-amber-400/10 p-6">
            <div className="flex items-center gap-3"><div className="h-12 w-12 rounded-2xl bg-violet-400/15 grid place-items-center"><Sparkles className="text-violet-200"/></div><div><h2 className="text-2xl font-black">Aburu IA</h2><p className="text-sm text-white/50">Je transforme vos informations produit en contenu prêt à publier.</p></div></div>
            <button disabled={status==='generating'} onClick={()=>generate()} className="mt-6 h-14 w-full rounded-2xl bg-white text-black font-black flex items-center justify-center gap-2">{status==='generating'?<><Loader2 className="animate-spin"/>Aburu prépare votre contenu…</>:<><WandSparkles/>Générer avec l’IA</>}</button>
          </div>
          {draft.textFr && <div className="mt-4 rounded-3xl bg-white/[0.05] p-5"><p className="text-sm text-white/45">Proposition</p><p className="mt-2 text-lg font-bold">{draft.headline}</p><p className="mt-3 whitespace-pre-wrap break-words text-white/80">{draft.textFr}</p></div>}
        </section>}

        {step === 'personalize' && <section className="mx-auto max-w-3xl space-y-4">
          <h2 className="text-3xl font-black">Personnalisez</h2>
          <textarea value={draft.textFr} onChange={e=>setDraft({...draft,textFr:e.target.value})} className="min-h-40 w-full rounded-3xl border border-white/10 bg-white/5 p-4 outline-none" placeholder="Texte français…"/>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">{['vendeur','professionnel','simple','dynamique'].map(t=><button key={t} onClick={()=>generate(t)} className="h-11 rounded-xl bg-white/8 capitalize">{t}</button>)}</div>
          <label className="flex items-center justify-between gap-4 rounded-2xl bg-white/5 p-4"><div><p className="font-bold">Version bilingue avec Sasara</p><p className="text-xs text-white/45">La traduction peut échouer sans bloquer la publication.</p></div><input type="checkbox" checked={draft.bilingual} onChange={e=>setDraft({...draft,bilingual:e.target.checked})} className="h-6 w-6"/></label>
          {draft.bilingual && <><button onClick={translate} className="h-12 rounded-2xl bg-amber-400 px-5 text-black font-bold">Créer la version Baatonum</button><textarea value={draft.textBa} onChange={e=>setDraft({...draft,textBa:e.target.value})} className="min-h-36 w-full rounded-3xl border border-white/10 bg-white/5 p-4 outline-none" placeholder="Version Baatonum…"/>{draft.textBa && <button onClick={speakBariba} className="h-11 rounded-xl bg-white/10 px-4 inline-flex items-center gap-2"><Volume2 size={18}/>Écouter</button>}</>}
        </section>}

        {step === 'preview' && selectedProduct && <section className="mx-auto max-w-xl">
          <h2 className="text-3xl font-black mb-4">Aperçu final</h2>
          <div className="overflow-hidden rounded-[34px] border border-white/10 bg-[#11141D] shadow-2xl">
            {mediaUrl && (mediaKind==='video'?<video src={mediaUrl} controls className="aspect-[4/5] w-full object-contain bg-black"/>:<img src={mediaUrl} className="aspect-[4/5] w-full object-contain bg-black"/>)}
            <div className="p-5"><p className="text-xl font-black break-words">{draft.headline || selectedProduct.title_fr || selectedProduct.title}</p><p className="mt-2 whitespace-pre-wrap break-words text-white/75">{draft.textFr}</p>{draft.bilingual&&draft.textBa&&<p className="mt-3 border-t border-white/10 pt-3 whitespace-pre-wrap break-words text-amber-100">{draft.textBa}</p>}<div className="mt-4 rounded-2xl bg-white/6 p-4"><div className="flex items-center justify-between gap-3"><p className="font-bold min-w-0 break-words">{selectedProduct.title_fr || selectedProduct.title}</p><p className="shrink-0 text-amber-300 font-black">{selectedProduct.price != null ? `${Number(selectedProduct.price).toLocaleString("fr-FR")} ${selectedProduct.currency || "XOF"}` : 'Prix à convenir'}</p></div>{selectedProduct.location&&<p className="mt-1 text-xs text-white/45 flex items-center gap-1"><MapPin size={13}/>{selectedProduct.location}</p>}</div></div>
          </div>
        </section>}

        {step === 'publish' && <section className="mx-auto max-w-xl text-center pt-10">
          {status==='success' ? <><div className="mx-auto h-20 w-20 rounded-full bg-emerald-400/15 grid place-items-center"><Check className="h-10 w-10 text-emerald-300"/></div><h2 className="mt-5 text-3xl font-black">Votre Aburu Fim est publié</h2><div className="mt-6 grid gap-3 sm:grid-cols-2"><button onClick={()=>navigate('/fitila/social')} className="h-14 rounded-2xl bg-white text-black font-bold">Voir la publication</button><button onClick={()=>navigate('/fitila/market')} className="h-14 rounded-2xl bg-white/10 font-bold">Voir le produit</button></div></> :
          <><Upload className="mx-auto h-14 w-14 text-amber-300"/><h2 className="mt-4 text-2xl font-black">{status==='uploading'?'Upload média…':'Création de la publication…'}</h2><div className="mt-5 h-3 overflow-hidden rounded-full bg-white/10"><motion.div className="h-full bg-amber-400" animate={{width:`${status==="uploading"?progress:100}%`}}/></div><p className="mt-2 text-sm text-white/45">{status==='uploading'?progress+' %':'Liaison avec le Marché FITILA…'}</p></>}
        </section>}

        {step !== 'publish' && <div className="sticky bottom-0 mt-8 border-t border-white/10 bg-[#080A0F]/92 py-4 backdrop-blur-xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
          <div className="flex gap-3">
            {currentStep>0&&<button onClick={()=>setStep(STEPS[currentStep-1].id)} className="h-14 min-w-28 rounded-2xl bg-white/8 font-bold">Retour</button>}
            <button onClick={next} className="h-14 min-w-0 flex-1 rounded-2xl bg-amber-400 text-black font-black inline-flex items-center justify-center gap-2">{step==='preview'?'Publier': 'Continuer'}<ChevronRight size={18}/></button>
          </div>
        </div>}
      </main>
    </div>
  );
}
