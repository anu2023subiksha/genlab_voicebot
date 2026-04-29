import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MessageSquare, Play, RefreshCw, StopCircle } from 'lucide-react';
import VoiceBuddy from './VoiceBuddy';

const VoiceDash = () => {
  const [appState, setAppState] = useState('idle'); // 'idle', 'listening', 'thinking', 'speaking'
  const [transcript, setTranscript] = useState('');
  const [currentEmotion, setCurrentEmotion] = useState('happy'); // 'happy', 'angry', 'sad', 'confusing', 'thinking'
  const [replyText, setReplyText] = useState('வணக்கம்!');
  
  const recognitionRef = useRef(null);
  const transcriptRef = useRef(transcript);
  
  // Keep refs in sync for the event handlers
  useEffect(() => {
    transcriptRef.current = transcript;
  }, [transcript]);

  // Query Gemini API
  const queryGemini = async (text) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey || apiKey === "PASTE_YOUR_API_KEY_HERE") {
      setReplyText("Gemini API Key missing! Please add it to your .env file.");
      setCurrentEmotion('sad');
      setAppState('speaking');
      return;
    }

    try {
      const prompt = `You are a friendly Tamil voicebot. Reply to the user text affectionately in conversational Tamil or Tanglish. Limit your response to 2 sentences. Based on user text, also determine their emotion. Return the result strictly in JSON with keys "reply" and "emotion" (emotion must be exactly one of: "happy", "angry", "sad", "confusing"). Text from user: "${text}"`;

      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      const data = await response.json();
      const contentText = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (contentText) {
        const parsed = JSON.parse(contentText);
        setReplyText(parsed.reply);
        setCurrentEmotion(parsed.emotion);
      } else {
        setReplyText("மன்னிக்கவும், எனக்கு புரியவில்லை. (Sorry, I didn't get that.)");
        setCurrentEmotion('confusing');
      }
    } catch (err) {
      console.error(err);
      setReplyText("Network Error connecting to API.");
      setCurrentEmotion('sad');
    }
    
    // Transition to speaking immediately once the API call returns
    setAppState('speaking');
  };

  // Initialize Speech Recognition Once
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true; // Use continuous so it doesn't stop randomly
      recognitionRef.current.interimResults = true;
      recognitionRef.current.lang = 'ta-IN'; 

      recognitionRef.current.onresult = (event) => {
        let fullTranscript = '';
        // Loop from 0 to capture the whole sentence from the API reliably
        for (let i = 0; i < event.results.length; i++) {
          fullTranscript += event.results[i][0].transcript;
        }
        setTranscript(fullTranscript);
      };

      // We won't rely strictly on onend to trigger API because continuous=true
      // Instead we will trigger API from handleMicTap when user manually stops it
      recognitionRef.current.onerror = (e) => {
         console.error('Speech recognition error', e);
      };
    }
  }, []);

  const handleMicTap = () => {
    if (appState === 'idle' || appState === 'speaking') {
      // Start listening
      setAppState('listening');
      setTranscript('');
      setCurrentEmotion('happy'); 
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.error("Mic start error:", e);
        }
      } else {
        setTranscript('Speech recognition API not supported in this browser.');
        setTimeout(() => setAppState('idle'), 3000);
      }
      
    } else if (appState === 'listening') {
      // Manually stop listening
      setAppState('thinking');
      
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (err) {
          console.error(err);
        }
      }

      // If we got words, query Gemini. Otherwise, just reset.
      const finalTranscript = transcriptRef.current;
      if (finalTranscript && finalTranscript.trim() !== '') {
        queryGemini(finalTranscript);
      } else {
        setAppState('idle');
      }
    }
  };

  const getBotEmotionState = () => {
    if (appState === 'thinking') return 'thinking';
    return currentEmotion;
  };

  const getBackgroundColor = () => {
    const emotion = getBotEmotionState();
    switch (emotion) {
      case 'angry': return 'from-[#7f1d1d] to-[#450a0a]'; // More visible Red
      case 'sad': return 'from-[#1e3a8a] to-[#172554]'; // More visible Blue
      case 'thinking':
      case 'confusing': return 'from-[#f59e0b] to-[#b45309]'; // Bright vibrant Gold/Orange instead of black
      case 'happy': return 'from-[#7dd3fc] to-[#0284c7]'; // Pale blue sky theme
      default: return 'from-[#7dd3fc] to-[#0284c7]'; // Pale blue default 
    }
  };

  return (
    <div className={`flex flex-col h-screen w-full font-sans text-white relative overflow-hidden transition-colors duration-1000 bg-gradient-to-b ${getBackgroundColor()}`}>

      <header className="relative z-10 flex justify-between items-center p-6">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-6 h-6 text-white/70" />
          <h1 className="text-xl font-semibold tracking-wide">TamilBot Chat</h1>
        </div>
        <button onClick={() => window.location.reload()} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition">
          <RefreshCw className="w-5 h-5 text-gray-400" />
        </button>
      </header>

      <main className="relative z-10 flex-1 flex flex-col items-center justify-center p-4">
        <div className="mb-12">
          <VoiceBuddy state={appState} emotion={getBotEmotionState()} />
        </div>

        <div className="h-24 flex flex-col items-center justify-center">
          <AnimatePresence mode="wait">
            {appState === 'idle' && (
              <motion.div
                key="idle"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="text-center"
              >
                <h2 className="text-2xl font-medium text-white/90 mb-2">வணக்கம்! நான் இருக்கேன்.</h2>
                <p className="text-white/60">Tap to speak or express an emotion</p>
              </motion.div>
            )}

            {appState === 'listening' && (
              <motion.div
                key="listening"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="text-center w-full max-w-md px-6"
              >
                <p className="text-sm text-white/60 mb-2 font-medium uppercase tracking-widest">Listening...</p>
                <div className="text-2xl text-white font-medium min-h-[4rem]">
                  {transcript || 'Waiting for you to speak...'}
                  <span className="animate-pulse ml-1">|</span>
                </div>
              </motion.div>
            )}

            {appState === 'thinking' && (
              <motion.div
                key="thinking"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="text-center flex flex-col items-center"
              >
                <div className="flex gap-4 mb-4 text-3xl font-bold opacity-80" style={{ color: currentEmotion === 'sad' ? '#4facfe' : currentEmotion === 'angry' ? '#ff5c5c' : '#ffcf4f' }}>
                  <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0 }}>அ</motion.span>
                  <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}>ஆ</motion.span>
                  <motion.span animate={{ y: [0, -10, 0] }} transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}>இ</motion.span>
                </div>
                <p className="text-white/70 font-medium">யோசிக்கிறேன்... (Thinking...)</p>
              </motion.div>
            )}

            {appState === 'speaking' && (
              <motion.div
                key="speaking"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="text-center max-w-md bg-white/10 p-4 rounded-2xl border border-white/20 backdrop-blur-md"
              >
                <p className="text-lg text-white mb-3">
                  {replyText}
                </p>
                <div className="flex justify-center gap-4">
                  <button onClick={() => setAppState('idle')} className="p-2 bg-white/10 text-white/50 rounded-full hover:bg-white/20 transition">
                    <StopCircle className="w-5 h-5" />
                  </button>
                  <button className="p-2 bg-white/10 text-white/70 rounded-full hover:bg-white/20 transition">
                    <Play className="w-5 h-5" />
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className="relative z-10 p-6 flex flex-col items-center">
        <div className="relative">
          {appState === 'listening' && (
             <motion.div
               animate={{ scale: [1, 1.5, 1], opacity: [0.5, 0, 0.5] }}
               transition={{ duration: 2, repeat: Infinity }}
               className="absolute inset-0 bg-red-500 rounded-full"
             />
          )}
          <button
            onClick={handleMicTap}
            className={`relative flex items-center justify-center rounded-full transition-all duration-300 shadow-2xl ${
              appState === 'listening' 
                ? 'w-24 h-24 bg-red-500 hover:bg-red-400 border-4 border-red-300' 
                : 'w-20 h-20 bg-white/10 hover:bg-white/20 drop-shadow-lg ring-2 ring-white/30 backdrop-blur-md'
            }`}
          >
             <Mic className={`w-8 h-8 text-white ${appState === 'listening' ? 'animate-pulse' : ''}`} />
          </button>
        </div>
        <p className="mt-4 text-xs text-white/40 text-center max-w-[200px]">
          {appState === 'idle' ? 'Tap to speak' : appState === 'listening' ? 'Listening... Tap to stop' : 'Processing'}
        </p>
      </footer>
    </div>
  );
};

export default VoiceDash;
