import React, { useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, CloudOff, Download, History, Inbox, Keyboard, Lock, QrCode, Receipt, Settings, Shield, Store, Sync, Wallet } from 'lucide-react';

const configs:Record<string,{title:string;tabs:[string,React.ReactNode,string][]}> = {
  messages:{title:'Messages',tabs:[['Vue',<Inbox/>,'Conversations et messages FITILA.'],['Vocaux',<Inbox/>,'Enregistrer, transcrire, traduire et envoyer.'],['Groupes',<Inbox/>,'Communautés, fils et rôles.'],['Modération',<Shield/>,'Signalement et contrôle.']]},
  drafts:{title:'Brouillons',tabs:[['Vue',<Inbox/>,'Brouillons locaux et synchronisés.'],['Créateur',<Inbox/>,'Créations non publiées.'],['Classe',<Inbox/>,'Réponses et travaux en attente.'],['Sync',<Sync/>,'Synchronisation lorsque le réseau revient.']]},
  offline:{title:'Hors ligne',tabs:[['Vue',<CloudOff/>,'État du mode hors connexion.'],['Cache',<CloudOff/>,'Contenus disponibles localement.'],['Queue',<Sync/>,'Actions en attente de réseau.'],['Conflits',<Sync/>,'Réconciliation des modifications.']]},
  wallet:{title:'Portefeuille',tabs:[['Vue',<Wallet/>,'Vue du portefeuille FITILA.'],['Tontine',<Wallet/>,'Tontines et contributions.'],['Reçus',<Receipt/>,'Historique des reçus.'],['Sécurité',<Lock/>,'Protection des opérations.']]},
  history:{title:'Historique',tabs:[['Vue',<History/>,'Historique général.'],['Recherches',<History/>,'Recherches récentes.'],['Activité',<History/>,'Activité du compte.'],['Exports',<Download/>,'Exports disponibles.']]},
  scan:{title:'Scanner',tabs:[['Vue',<QrCode/>,'Scanner FITILA.'],['QR',<QrCode/>,'Lecture de QR.'],['Document',<QrCode/>,'Numérisation de documents.'],['OCR',<QrCode/>,'Reconnaissance de texte.']]},
  shop:{title:'Boutique',tabs:[['Vue',<Store/>,'Boutique FITILA.'],['Actions',<Store/>,'Actions disponibles.'],['Backend',<Sync/>,'État des services.'],['Offline',<CloudOff/>,'Disponibilité hors connexion.']]},
  settings:{title:'Paramètres',tabs:[['Vue',<Settings/>,'Préférences FITILA.'],['Sécurité',<Lock/>,'Code, biométrie et confirmations.'],['Données',<Download/>,'Export et gestion des données.'],['Accessibilité',<Keyboard/>,'Contrôles tactiles et audio.']]},
};

export default function FitilaUtilityParity(){
  const location=useLocation(); const nav=useNavigate();
  const key=location.pathname.split('/').filter(Boolean)[0]||'history';
  const cfg=configs[key]||configs.history;
  const [tab,setTab]=useState(cfg.tabs[0][0]);
  const active=useMemo(()=>cfg.tabs.find(t=>t[0]===tab)??cfg.tabs[0],[cfg,tab]);
  return <div className="h-full overflow-y-auto bg-[#F8F5EA] text-[#241F2E]">
    <div className="mx-auto max-w-[900px] px-4 pb-28 pt-20">
      <div className="mb-5 flex items-center gap-3">
        <button onClick={()=>nav(-1)} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#E4DFCC] bg-white"><ArrowLeft className="h-5 w-5"/></button>
        <div><h1 className="text-2xl font-black">{cfg.title}</h1><p className="text-sm text-[#777161]">Même destination fonctionnelle que Flutter Build19</p></div>
      </div>
      <div className="mb-5 flex gap-2 overflow-x-auto pb-1">{cfg.tabs.map(([name])=><button key={name} onClick={()=>setTab(name)} className="whitespace-nowrap rounded-full border px-4 py-2 text-sm font-bold" style={{background:tab===name?'#C9972C':'white',borderColor:'#E4DFCC'}}>{name}</button>)}</div>
      <div className="rounded-[28px] border border-[#E4DFCC] bg-white p-7">
        <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#F5E8C8] text-[#9C6B1D]">{active[1]}</div>
        <h2 className="text-xl font-black">{active[0]}</h2><p className="mt-2 text-[#777161]">{active[2]}</p>
      </div>
    </div>
  </div>;
}
