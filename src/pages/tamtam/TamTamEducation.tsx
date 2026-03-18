import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Volume2, Play, Pause, SkipBack, SkipForward, CheckCircle } from 'lucide-react';
import { SmartChatbot } from '@/components/tamtam/SmartChatbot';
import { useTamTamLanguage } from '@/contexts/TamTamLanguageContext';
import { useAudioDescription } from '@/contexts/AudioDescriptionContext';
import { useBilingualAudio } from '@/hooks/useBilingualAudio';
import { tamtamFeedback } from '@/utils/tamtamFeedback';

const categories = [
  { id: 'crops', icon: '🌱', color: 'bg-green-500', bgLight: 'bg-green-50', labelFr: 'Cultures', labelBa: 'Gberu' },
  { id: 'livestock', icon: '🐄', color: 'bg-amber-500', bgLight: 'bg-amber-50', labelFr: 'Élevage', labelBa: 'Nɑɑnu mɑɑru' },
  { id: 'business', icon: '💼', color: 'bg-blue-500', bgLight: 'bg-blue-50', labelFr: 'Commerce', labelBa: 'Aburu' },
  { id: 'health', icon: '🏥', color: 'bg-red-500', bgLight: 'bg-red-50', labelFr: 'Santé', labelBa: 'Dɔɔru' },
  { id: 'qa', icon: '❓', color: 'bg-purple-500', bgLight: 'bg-purple-50', labelFr: 'Questions', labelBa: 'Kasuurenu' },
  { id: 'stories', icon: '👨‍🌾', color: 'bg-orange-500', bgLight: 'bg-orange-50', labelFr: 'Témoignages', labelBa: 'Gɛsɛrenu' },
];

interface AudioCourse {
  id: string;
  titleFr: string;
  titleBa: string;
  duration: string;
  icon: string;
  completed: boolean;
}

const mockCourses: Record<string, AudioCourse[]> = {
  crops: [
    { id: '1', titleFr: 'Préparation du sol', titleBa: 'Tɛ̃ɛ gbɛsiru', duration: '5 min', icon: '🪴', completed: true },
    { id: '2', titleFr: 'Semis et plantation', titleBa: 'Gberu yira', duration: '7 min', icon: '🌾', completed: true },
    { id: '3', titleFr: 'Application engrais', titleBa: 'Tɛ̃ɛ ìràn', duration: '6 min', icon: '🧪', completed: false },
    { id: '4', titleFr: 'Gestion des maladies', titleBa: 'Dɔɔru gbɛsiru', duration: '8 min', icon: '🦠', completed: false },
    { id: '5', titleFr: 'Récolte optimale', titleBa: 'Gberu koru nɔɔra', duration: '5 min', icon: '🌽', completed: false },
  ],
  livestock: [
    { id: '6', titleFr: 'Nutrition animale', titleBa: 'Nɑɑnu dɔ̃ɔ', duration: '6 min', icon: '🌿', completed: false },
    { id: '7', titleFr: 'Santé du bétail', titleBa: 'Nɑɑnu dɔɔru', duration: '7 min', icon: '💉', completed: false },
    { id: '8', titleFr: 'Production laitière', titleBa: 'Nɔɔ koru', duration: '8 min', icon: '🥛', completed: false },
  ],
  business: [
    { id: '9', titleFr: 'Calculer ses bénéfices', titleBa: 'Gobi nɛɛrɑ', duration: '5 min', icon: '📊', completed: false },
    { id: '10', titleFr: 'Négocier les prix', titleBa: 'Gobi kasuu', duration: '6 min', icon: '🤝', completed: false },
  ],
  health: [
    { id: '11', titleFr: 'Premiers secours', titleBa: 'Ìràn kpákpá', duration: '10 min', icon: '🩹', completed: false },
    { id: '12', titleFr: 'Nutrition familiale', titleBa: 'Dɛnu dɔ̃ɔ', duration: '7 min', icon: '🥗', completed: false },
  ],
};

const mockStories = [
  { 
    id: '1', 
    farmer: '👨🏾‍🌾 Papa Koffi',
    location: 'Nikki',
    titleFr: 'Comment j\'ai doublé ma récolte de maïs',
    titleBa: 'Bí mo ṣe ilọ́po méjì ìkórè àgbàdo mi',
    duration: '3 min'
  },
  { 
    id: '2', 
    farmer: '👩🏾‍🌾 Mama Aïcha',
    location: 'Parakou',
    titleFr: 'Mon élevage de poulets locaux',
    titleBa: 'Ẹ̀tọ́ adìẹ àdúgbò mi',
    duration: '4 min'
  },
  { 
    id: '3', 
    farmer: '👴🏾 Tonton Ibrahim',
    location: 'Kandi',
    titleFr: 'Le secret du riz de qualité',
    titleBa: 'Àṣírí ìrẹsì tó dára',
    duration: '5 min'
  },
];

export default function TamTamEducation() {
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [activeCourse, setActiveCourse] = useState<AudioCourse | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const { currentLang } = useTamTamLanguage();
  const { announceAction } = useAudioDescription();
  const { speakCurrentLang } = useBilingualAudio();
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    announceAction(currentLang === 'fr' ? 'Éducation' : 'Ẹ̀kọ́');
  }, [announceAction, currentLang]);

  useEffect(() => {
    if (isPlaying && activeCourse) {
      progressInterval.current = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            setIsPlaying(false);
            clearInterval(progressInterval.current!);
            tamtamFeedback.play('success');
            return 100;
          }
          return prev + 2;
        });
      }, 500);
    } else {
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isPlaying, activeCourse]);

  const handleCategorySelect = async (category: typeof categories[0]) => {
    tamtamFeedback.play('click');
    const label = currentLang === 'fr' ? category.labelFr : category.labelBa;
    await speakCurrentLang(label);
    setActiveCategory(category.id);
  };

  const handleBack = () => {
    tamtamFeedback.play('click');
    if (activeCourse) {
      setActiveCourse(null);
      setIsPlaying(false);
      setProgress(0);
    } else {
      setActiveCategory(null);
    }
  };

  const handleSpeakLabel = async (labelFr: string, labelBa: string, e: React.MouseEvent) => {
    e.stopPropagation();
    tamtamFeedback.play('click');
    const text = currentLang === 'fr' ? labelFr : labelBa;
    await speakCurrentLang(text);
  };

  const handleCourseSelect = async (course: AudioCourse) => {
    tamtamFeedback.play('click');
    setActiveCourse(course);
    setProgress(0);
    const text = currentLang === 'fr' ? course.titleFr : course.titleBa;
    await speakCurrentLang(text);
  };

  const togglePlayPause = async () => {
    tamtamFeedback.play('click');
    setIsPlaying(!isPlaying);
    if (!isPlaying && activeCourse) {
      const intro = currentLang === 'fr' 
        ? `Cours: ${activeCourse.titleFr}. Durée: ${activeCourse.duration}.`
        : `Ẹ̀kọ́: ${activeCourse.titleBa}. Àkókò: ${activeCourse.duration}.`;
      await speakCurrentLang(intro);
    }
  };

  const activeCategoryData = categories.find(c => c.id === activeCategory);
  const courses = activeCategory ? mockCourses[activeCategory] || [] : [];

  return (
    <div className="min-h-screen bg-tamtam-bg px-4 pb-32">
      <AnimatePresence mode="wait">
        {!activeCategory ? (
          <motion.div
            key="grid"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Header */}
            <div className="text-center mb-6">
              <span className="text-5xl">📚</span>
              <h1 className="text-xl font-bold text-tamtam-text mt-2">
                {currentLang === 'fr' ? 'Éducation' : 'Ẹ̀kọ́'}
              </h1>
              <p className="text-tamtam-text-muted text-sm mt-1">
                {currentLang === 'fr' ? 'Apprenez en écoutant' : 'Kọ́ nípa gbígbọ́'}
              </p>
            </div>

            {/* Progress card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-3xl p-4 mb-6 text-white"
            >
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                  <span className="text-3xl">🎓</span>
                </div>
                <div className="flex-1">
                  <p className="text-sm opacity-80">{currentLang === 'fr' ? 'Votre progression' : 'Ìlọsíwájú rẹ'}</p>
                  <p className="text-2xl font-bold">2 / 15 {currentLang === 'fr' ? 'cours' : 'ẹ̀kọ́'}</p>
                  <div className="w-full bg-white/30 rounded-full h-2 mt-2">
                    <div className="bg-white h-2 rounded-full" style={{ width: '13%' }} />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Categories grid */}
            <div className="grid grid-cols-2 gap-4">
              {categories.map((category, index) => (
                <motion.button
                  key={category.id}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: index * 0.1 }}
                  onClick={() => handleCategorySelect(category)}
                  className={`aspect-square ${category.bgLight} rounded-3xl shadow-tamtam-soft flex flex-col items-center justify-center gap-2 active:scale-95 transition-transform relative`}
                >
                  <div className={`w-16 h-16 ${category.color} rounded-2xl flex items-center justify-center`}>
                    <span className="text-3xl">{category.icon}</span>
                  </div>
                  <span className="text-sm font-medium text-tamtam-text text-center px-2">
                    {currentLang === 'fr' ? category.labelFr : category.labelBa}
                  </span>
                  <button
                    onClick={(e) => handleSpeakLabel(category.labelFr, category.labelBa, e)}
                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/80 flex items-center justify-center"
                  >
                    <Volume2 className="w-3 h-3 text-tamtam-primary" />
                  </button>
                </motion.button>
              ))}
            </div>
          </motion.div>
        ) : activeCourse ? (
          // Audio player view
          <motion.div
            key="player"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="flex flex-col items-center"
          >
            <button
              onClick={handleBack}
              className="self-start w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft mb-6"
            >
              <ArrowLeft className="w-6 h-6 text-tamtam-text" />
            </button>

            <div className={`w-32 h-32 ${activeCategoryData?.color} rounded-3xl flex items-center justify-center mb-6`}>
              <span className="text-6xl">{activeCourse.icon}</span>
            </div>

            <h2 className="text-xl font-bold text-tamtam-text text-center mb-2">
              {currentLang === 'fr' ? activeCourse.titleFr : activeCourse.titleBa}
            </h2>
            <p className="text-tamtam-text-muted mb-8">{activeCourse.duration}</p>

            {/* Progress bar */}
            <div className="w-full max-w-xs mb-8">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <motion.div 
                  className={`${activeCategoryData?.color} h-2 rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between text-sm text-tamtam-text-muted mt-2">
                <span>{Math.floor(progress * 0.05)}:00</span>
                <span>{activeCourse.duration}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-8">
              <button className="w-12 h-12 rounded-full bg-tamtam-surface flex items-center justify-center shadow-tamtam-soft">
                <SkipBack className="w-6 h-6 text-tamtam-text" />
              </button>
              <motion.button
                whileTap={{ scale: 0.9 }}
                onClick={togglePlayPause}
                className={`w-20 h-20 rounded-full ${activeCategoryData?.color} flex items-center justify-center shadow-lg`}
              >
                {isPlaying ? (
                  <Pause className="w-10 h-10 text-white" />
                ) : (
                  <Play className="w-10 h-10 text-white ml-1" />
                )}
              </motion.button>
              <button className="w-12 h-12 rounded-full bg-tamtam-surface flex items-center justify-center shadow-tamtam-soft">
                <SkipForward className="w-6 h-6 text-tamtam-text" />
              </button>
            </div>

            {progress === 100 && (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mt-8 flex items-center gap-2 text-green-500"
              >
                <CheckCircle className="w-6 h-6" />
                <span className="font-medium">
                  {currentLang === 'fr' ? 'Cours terminé !' : 'Ẹ̀kọ́ ti parí!'}
                </span>
              </motion.div>
            )}
          </motion.div>
        ) : (
          // Course list or Q&A
          <motion.div
            key="list"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
          >
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleBack}
                className="w-12 h-12 bg-tamtam-surface rounded-2xl flex items-center justify-center shadow-tamtam-soft"
              >
                <ArrowLeft className="w-6 h-6 text-tamtam-text" />
              </button>
              <div className={`w-14 h-14 ${activeCategoryData?.color} rounded-2xl flex items-center justify-center`}>
                <span className="text-3xl">{activeCategoryData?.icon}</span>
              </div>
              <span className="text-lg font-bold text-tamtam-text">
                {activeCategoryData && (currentLang === 'fr' ? activeCategoryData.labelFr : activeCategoryData.labelBa)}
              </span>
            </div>

            {/* Q&A Section with SmartChatbot */}
            {activeCategory === 'qa' && (
              <SmartChatbot 
                context="education"
                welcomeMessageFr="Posez vos questions sur l'éducation, la santé, le commerce..."
                welcomeMessageBa="Bi àwọn ìbéèrè rẹ nípa ẹ̀kọ́, ìlera, òwò..."
              />
            )}

            {/* Stories section */}
            {activeCategory === 'stories' && (
              <div className="space-y-4">
                {mockStories.map((story, i) => (
                  <motion.button
                    key={story.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.1 }}
                    onClick={() => speakCurrentLang(currentLang === 'fr' ? story.titleFr : story.titleBa)}
                    className="w-full bg-tamtam-surface rounded-2xl p-4 flex items-center gap-4 shadow-tamtam-soft"
                  >
                    <span className="text-4xl">{story.farmer.split(' ')[0]}</span>
                    <div className="flex-1 text-left">
                      <p className="text-xs text-tamtam-text-muted">{story.farmer} • {story.location}</p>
                      <p className="font-medium text-tamtam-text mt-1">
                        {currentLang === 'fr' ? story.titleFr : story.titleBa}
                      </p>
                      <p className="text-xs text-tamtam-text-muted mt-1">{story.duration}</p>
                    </div>
                    <Volume2 className="w-5 h-5 text-tamtam-text-muted" />
                  </motion.button>
                ))}
              </div>
            )}

            {/* Course list */}
            {courses.length > 0 && !['qa', 'stories'].includes(activeCategory || '') && (
              <div className="space-y-3">
                {courses.map((course, i) => (
                  <motion.button
                    key={course.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => handleCourseSelect(course)}
                    className="w-full bg-tamtam-surface rounded-2xl p-4 flex items-center gap-4 shadow-tamtam-soft"
                  >
                    <div className={`w-12 h-12 ${course.completed ? 'bg-green-100' : activeCategoryData?.bgLight} rounded-xl flex items-center justify-center`}>
                      {course.completed ? (
                        <CheckCircle className="w-6 h-6 text-green-500" />
                      ) : (
                        <span className="text-2xl">{course.icon}</span>
                      )}
                    </div>
                    <div className="flex-1 text-left">
                      <p className={`font-medium ${course.completed ? 'text-green-600' : 'text-tamtam-text'}`}>
                        {currentLang === 'fr' ? course.titleFr : course.titleBa}
                      </p>
                      <p className="text-sm text-tamtam-text-muted">{course.duration}</p>
                    </div>
                    <Play className="w-5 h-5 text-tamtam-text-muted" />
                  </motion.button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
