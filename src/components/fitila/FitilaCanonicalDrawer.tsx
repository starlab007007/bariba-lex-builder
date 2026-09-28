import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useLocation, useNavigate } from 'react-router-dom';
import { X } from 'lucide-react';
import { useFitilaLanguage } from '@/contexts/FitilaLanguageContext';
import { useAuth } from '@/contexts/AuthContext';

const groups=[
  {title:'Explorer',items:[
    ['Fil','/social','📰'],['Dictionnaire','/dictionary','📖'],['Classe','/classe','🏫'],['IA','/ia','✨'],
    ['Traducteur','/translator','🌍'],['Apprendre','/learn','🎓'],['Templates','/templates','🎨'],['Créateur','/creator','➕'],
  ]},
  {title:'Culture',items:[
    ['Voice Lab','/voice-lab','🎙️'],['Éducation','/education','📚'],['Découvrir','/discover','🧭'],['Messages','/messages','💬'],
  ]},
  {title:'Services',items:[
    ['Services','/services','🧰'],['Marché','/market','🛒'],['Agriculture','/agriculture','🌱'],['Finance','/finance','💰'],
    ['Santé','/health','🏥'],['SOS','/sos','🆘'],['Installer','/install','📲'],
  ]},
  {title:'Compte',items:[
    ['Clavier','/keyboard','⌨️'],['Enseignant','/teacher','👨‍🏫'],['Brouillons','/drafts','📝'],['Hors ligne','/offline','☁️'],
    ['Portefeuille','/wallet','👛'],['Historique','/history','🕘'],['Scanner','/scan','▣'],['Boutique','/shop','🏪'],
    ['Profil','/profile','👤'],['Paramètres','/settings','⚙️'],
  ]},
];

export default function FitilaCanonicalDrawer({open,onClose}:{open:boolean;onClose:()=>void}){
  const nav=useNavigate(); const loc=useLocation(); const {currentLang,setLanguage}=useFitilaLanguage(); const {isAdmin}=useAuth();
  const go=(p:string)=>{onClose(); setTimeout(()=>nav(p),100);};
  return <AnimatePresence>{open&&<>
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} onClick={onClose} className="fixed inset-0 z-[100] bg-black/70"/>
    <motion.aside initial={{x:'-100%'}} animate={{x:0}} exit={{x:'-100%'}} transition={{type:'spring',damping:30,stiffness:300}} className="fixed inset-y-0 left-0 z-[101] w-[90vw] max-w-[430px] overflow-y-auto bg-[#0D1018] text-white">
      <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-[#0D1018]/95 p-5 backdrop-blur-xl">
        <div><div className="text-xl font-black">FITILA</div><div className="text-xs text-white/50">Navigation Flutter Build19</div></div>
        <button onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-full bg-white/10"><X/></button>
      </div>
      <div className="space-y-6 p-4">
        {groups.map(g=><section key={g.title}><h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[.16em] text-[#E0A03C]">{g.title}</h3>
          <div className="grid grid-cols-2 gap-2">{g.items.map(([label,path,emoji])=>{const active=path==='/learn'?(loc.pathname==='/'||loc.pathname.startsWith('/learn')):loc.pathname.startsWith(path);return <button key={path} onClick={()=>go(path)} className="flex items-center gap-3 rounded-2xl border p-3 text-left" style={{borderColor:active?'#E0A03C':'#2E3848',background:active?'#2A241A':'#151A24'}}><span className="text-xl">{emoji}</span><span className="text-sm font-bold">{label}</span></button>})}</div>
        </section>)}
        <section><h3 className="mb-2 px-1 text-[11px] font-black uppercase tracking-[.16em] text-white/50">Langue</h3><div className="grid grid-cols-2 gap-2"><button onClick={()=>setLanguage('fr')} className="rounded-2xl border p-3 font-bold" style={{borderColor:currentLang==='fr'?'#E0A03C':'#2E3848'}}>FR Français</button><button onClick={()=>setLanguage('ba')} className="rounded-2xl border p-3 font-bold" style={{borderColor:currentLang==='ba'?'#E0A03C':'#2E3848'}}>BJ Bariba</button></div></section>
        {isAdmin&&<button onClick={()=>go('/admin')} className="w-full rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4 text-left font-black">🔒 Administration</button>}
      </div>
    </motion.aside>
  </>}</AnimatePresence>;
}
