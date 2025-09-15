import { generateCompleteDictionaryJSON } from '../utils/pdfDictionaryExtractor';
import { CompleteDictionaryEntry } from '../utils/pdfDictionaryExtractor';

export async function createDictionaryJSONFile(): Promise<void> {
  try {
    console.log('Starting dictionary JSON generation...');
    
    // Generate the complete dictionary data
    const dictionaryEntries = await generateCompleteDictionaryJSON();
    
    if (dictionaryEntries.length === 0) {
      throw new Error('No dictionary entries were processed');
    }
    
    console.log(`Generated ${dictionaryEntries.length} dictionary entries`);
    
    // Create the JSON file content
    const jsonContent = JSON.stringify(dictionaryEntries, null, 2);
    
    // Create a download link for the JSON file
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dictionnaire-bariba-francais-complet.json';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    console.log('Dictionary JSON file generated and downloaded successfully!');
    console.log('Sample entries:', dictionaryEntries.slice(0, 3));
    
  } catch (error) {
    console.error('Error generating dictionary JSON:', error);
    throw error;
  }
}

// Export for use in components
export { type CompleteDictionaryEntry };