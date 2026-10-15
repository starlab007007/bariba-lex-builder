import { createContext, useContext, useMemo, type ReactNode } from 'react';
import BaribaAudioText from '@/components/fitila/BaribaAudioText';
import { useApprendreContent } from '@/lib/apprendre/contentLoader';
import { buildPronunciationLexicon, mixedPronunciationParts, tablePronunciationParts, type PronunciationLexicon } from '@/lib/apprendre/pronunciation';
const Lexicon = createContext<PronunciationLexicon | null>(null);
export const useApPronunciationLexicon = () => useContext(Lexicon);
export function ApPronunciationProvider({children}:{children:ReactNode}) {
  const {data}=useApprendreContent();
  const lexicon=useMemo(()=>data?buildPronunciationLexicon(data.content.raw,data.scenesContent):null,[data]);
  return <Lexicon.Provider value={lexicon}>{children}</Lexicon.Provider>;
}
/** Explicit language fields use whole-phrase audio; mixed prose keeps its French text. */
export default function ApLinguisticText({text,bariba=false,column,className='',preserve=false}:{text:string;bariba?:boolean;column?:string;className?:string;preserve?:boolean}) {
  const lexicon=useContext(Lexicon);
  if(bariba)return <BaribaAudioText text={text} compact className={className} />;
  const parts=column?tablePronunciationParts(text,column,lexicon):mixedPronunciationParts(text,lexicon);
  return <span data-i18n-preserve={preserve?true:undefined} className={`whitespace-pre-wrap break-words ${className}`}>{parts.map((part,index)=>part.bariba?<BaribaAudioText key={index} text={part.text} compact className="align-middle" />:part.text)}</span>;
}
