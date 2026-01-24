// Re-export from new location for backward compatibility
export * from '@/contexts/FitilaLanguageContext';
export { 
  FitilaLanguageProvider as TamTamLanguageProvider,
  useFitilaLanguage as useTamTamLanguage,
  type FitilaLang as TamTamLang
} from '@/contexts/FitilaLanguageContext';
