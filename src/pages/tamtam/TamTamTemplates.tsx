/**
 * TamTamTemplates - Premium Template Gallery Page
 * Immersive 4K Envato effects showcase with Douyin/Kuaishou-inspired UI
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
    setSelectedTemplate(template);
    setViewMode('preview');
  }, []);

  // Handle using template (go to capture)
  const handleUseTemplate = useCallback((template: Template) => {
    setSelectedTemplate(template);
    // Navigate to creator with template selected
    navigate('/tamtam/creator', { state: { templateId: template.id } });
  }, [navigate]);

  // Handle preview close
  const handleClosePreview = useCallback(() => {
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
    <div className="min-h-screen bg-gradient-to-b from-background via-background-soft to-background overflow-x-hidden">
      {/* Hero Section with Animated Background */}
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
        transition={{ delay: 0.3 }}
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
