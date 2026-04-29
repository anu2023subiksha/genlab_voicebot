import { motion } from 'framer-motion';

const VoiceBuddy = ({ state = 'idle', emotion = 'happy' }) => {
  // Emotion-based styling
  const emotionThemes = {
    happy: { glow: 'rgba(160, 123, 240, 0.6)' },
    angry: { glow: 'rgba(255, 92, 92, 0.6)' },
    sad: { glow: 'rgba(79, 172, 254, 0.6)' },
    neutral: { glow: 'rgba(170, 59, 255, 0.4)' },
  };

  const theme = emotionThemes[emotion] || emotionThemes.neutral;

  // Determine which image to show based on state and emotion.
  // The user should place these files in the public/character/ folder.
  const getImageSource = () => {
    if (state === 'thinking') return '/character/thinking.png';
    if (state === 'listening') return '/character/listening.png';
    if (state === 'speaking') return '/character/speaking.png';
    
    // Idle states based on emotion
    if (emotion === 'angry') return '/character/angry.png';
    if (emotion === 'sad') return '/character/sad.png';
    if (emotion === 'happy') return '/character/happy.png';
    
    // Default fallback
    return '/character/normal.png';
  };

  // State-based animations for the whole image
  const bodyVariants = {
    idle: {
      y: [0, -10, 0],
      transition: { duration: 2, repeat: Infinity, ease: 'easeInOut' },
    },
    listening: {
      rotate: [0, 5, -5, 0],
      transition: { duration: 1.5, repeat: Infinity, ease: 'easeInOut' },
    },
    thinking: {
      scale: [1, 1.05, 1],
      rotate: [0, 2, -2, 0],
      transition: { duration: 1.2, repeat: Infinity, ease: 'easeInOut' },
    },
    speaking: {
      y: [0, -15, 0],
      transition: { duration: 0.5, repeat: Infinity, ease: 'easeInOut' },
    },
  };

  return (
    <div className="relative flex justify-center items-center w-64 h-64">
      {/* Background Glow */}
      <motion.div
        className="absolute inset-0 rounded-full blur-3xl opacity-50"
        animate={{ backgroundColor: theme.glow }}
        transition={{ duration: 0.5 }}
      />
      
      {/* Main Image Character */}
      <motion.div
        variants={bodyVariants}
        animate={state}
        className="relative z-10 w-full h-full flex justify-center items-center drop-shadow-2xl"
      >
        <img 
          src={getImageSource()} 
          alt={`Bot is ${state}`}
          className="w-full h-full object-contain"
          onError={(e) => {
            // Simple visual fallback if they haven't put the image in yet
            e.target.style.display = 'none';
            if (e.target.parentElement) {
              e.target.parentElement.innerHTML = `<div class="text-xs text-center text-white/50 p-4 border border-dashed border-white/20 rounded-xl w-full h-full flex items-center justify-center">Provide Image:<br/>${getImageSource()}</div>`;
            }
          }}
        />
      </motion.div>
    </div>
  );
};

export default VoiceBuddy;
