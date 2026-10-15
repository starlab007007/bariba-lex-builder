import React from 'react';
import { createRoot } from 'react-dom/client';
import AIProviderSettings from '../../src/components/admin/AIProviderSettings';
import '../../src/index.css';

createRoot(document.getElementById('root')!).render(<main className="mx-auto max-w-4xl p-4"><AIProviderSettings /></main>);
