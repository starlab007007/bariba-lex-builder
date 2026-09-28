// Web parity entry for Apprendre v2.4 / Flutter Build19.
// The route is canonical at `/learn` (and `/` as the FITILA home page).
// Content, pedagogy and Supabase source are shared with the Build19 port.

import { useNavigate } from 'react-router-dom';
import ApHubScreen from '@/components/apprendre/ApHubScreen';

export default function FitilaLearn() {
  const navigate = useNavigate();

  return (
    <ApHubScreen
      onOpenVoiceStudio={() => navigate('/voice-lab')}
      onOpenVoiceReview={() => navigate('/voice-lab')}
    />
  );
}
