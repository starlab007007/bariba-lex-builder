/**
 * TamTamTemplates - Premium Template Gallery Page
 * Voice-First Design: Emoji navigation, large touch targets, haptic feedback
 */

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TemplateHeroSection } from '@/components/tamtam/templates/TemplateHeroSection';
import { TemplateGalleryGrid } from '@/components/tamtam/templates/TemplateGalleryGrid';
import { TemplatePreviewFullscreen } from '@/components/tamtam/templates/TemplatePreviewFullscreen';
import { TemplatePublishFlow } from '@/components/tamtam/templates/TemplatePublishFlow';
import { Template } from '@/components/tamtam/creator/TemplateSystem/types';
import { allTemplates } from '@/components/tamtam/creator/TemplateSystem/templates';
import { useNavigate } from 'react-router-dom';
import FitilaPageHeader from '@/components/fitila/FitilaPageHeader';

export type GalleryViewMode = 'browse' | 'preview' | 'capture' | 'publish';

export default function TamTamTemplates() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<GalleryViewMode>('browse');
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [capturedMedia, setCapturedMedia] = useState<Blob | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Handle template selection for preview
  const handleSelectForPreview = useCallback((template: Template) => {
    if ('vibrate' in navigator) navigator.vibrate(30);
    setSelectedTemplate(template);
    setViewMode('preview');
  }, []);

  // Handle using template (go to creator with template)
  const handleUseTemplate = useCallback((template: Template) => {
    if ('vibrate' in navigator) navigator.vibrate(50);
    console.log('🎬 Navigating to creator with template:', template.id, template.name);
    navigate('/creator', { 
      state: { templateId: template.id },
      replace: false 
    });
  }, [navigate]);

  // Handle preview close
  const handleClosePreview = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(20);
    setViewMode('browse');
    setSelectedTemplate(null);
  }, []);

  // Handle post-capture publishing
  const handlePublish = useCallback((media: Blob) => {
    setCapturedMedia(media);
    setViewMode('publish');
  }, []);

  // Handle publish complete
  const handlePublishComplete = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([50, 50, 50]);
    setCapturedMedia(null);
    setSelectedTemplate(null);
    setViewMode('browse');
  }, []);

  // Filter templates
  const filteredTemplates = allTemplates.filter(template => {
    const matchesSearch = !searchQuery || 
      template.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      template.nameBa?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="h-full overflow-y-auto overflow-x-hidden bg-[#F7F5EC] text-[#241F2E]">
      
      <FitilaPageHeader title="Templates" subtitle="Galerie premium avec recherche, catégories, prévisualisation" />

      {/* Hero Section with Filters */}
      <TemplateHeroSection 
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        selectedCategory={selectedCategory}
        onCategoryChange={setSelectedCategory}
        totalTemplates={allTemplates.length}
        premiumCount={allTemplates.filter(t => t.isPremium).length}
      />

      {/* Template Gallery Grid */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="px-4 pb-32"
      >
        <TemplateGalleryGrid
          templates={filteredTemplates}
          onSelectForPreview={handleSelectForPreview}
          onUseTemplate={handleUseTemplate}
        />
      </motion.div>

      {/* Fullscreen Preview Modal */}
      <AnimatePresence>
        {viewMode === 'preview' && selectedTemplate && (
          <TemplatePreviewFullscreen
            template={selectedTemplate}
            onClose={handleClosePreview}
            onUse={() => handleUseTemplate(selectedTemplate)}
            onDownload={() => {}}
          />
        )}
      </AnimatePresence>

      {/* Publish Flow Modal */}
      <AnimatePresence>
        {viewMode === 'publish' && capturedMedia && selectedTemplate && (
          <TemplatePublishFlow
            template={selectedTemplate}
            media={capturedMedia}
            onComplete={handlePublishComplete}
            onSaveDraft={handlePublishComplete}
            onClose={() => setViewMode('browse')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
