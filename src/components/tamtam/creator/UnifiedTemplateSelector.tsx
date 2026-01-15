/**
 * UnifiedTemplateSelector.tsx - Wrapper de compatibilité
 */

import TemplateSelector from './TemplateSystem/TemplateSelector';
import type { UnifiedTemplate } from '@/types/UnifiedTemplateTypes';

interface UnifiedTemplateSelectorProps {
  onSelect: (template: UnifiedTemplate) => void;
  onClose?: () => void;
}

const UnifiedTemplateSelector: React.FC<UnifiedTemplateSelectorProps> = (props) => {
  return <TemplateSelector {...props} />;
};

export default UnifiedTemplateSelector;
