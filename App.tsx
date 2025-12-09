import React, { useState, useEffect } from 'react';
import { GeminiService } from './services/geminiService';
import VoiceSelector from './components/VoiceSelector';
import AudioPlayer from './components/AudioPlayer';
import { GenerationMode, SpeakerConfig } from './types';
import { SAMPLE_SINGLE_PROMPT, SAMPLE_MULTI_PROMPT, STYLES, SPEED_OPTIONS, VOICES } from './constants';

let geminiService: GeminiService | null = null;
try {
  geminiService = new GeminiService();
} catch (error) {
  console.error("Failed to initialize Gemini Service:", error);
}

const STORAGE_KEYS = {
  MODE: 'mmk_studio_mode_v2',
  VOICE_SINGLE: 'mmk_studio_voice_single',
  SPEAKERS_LIST: 'mmk_studio_speakers_list',
  STYLE: 'mmk_studio_style',
  SPEED: 'mmk_studio_speed',
  BASS: 'mmk_studio_bass',
  ECHO: 'mmk_studio_echo',
};

const getStoredState = <T,>(key: string, defaultValue: T): T => {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    return defaultValue;
  }
};

// Helper to get display name from ID
const getVoiceName = (id: string) => {
    const voice = VOICES.find(v => v.id === id);
    return voice ? voice.name : id;
};

export default function App() {
  const [mode, setMode] = useState<GenerationMode>(() => getStoredState(STORAGE_KEYS.MODE, GenerationMode.SINGLE));
  // Default Voice ID is Zephyr
  const [selectedVoice, setSelectedVoice] = useState<string>(() => getStoredState(STORAGE_KEYS.VOICE_SINGLE, 'Zephyr'));
  // Default Speakers use Voice IDs (Kore, Puck)
  const [speakers, setSpeakers] = useState<SpeakerConfig[]>(() => getStoredState(STORAGE_KEYS.SPEAKERS_LIST, [{ name: 'Aarav', voiceName: 'Puck' }, { name: 'Diya', voiceName: 'Zephyr' }]));
  const [selectedStyle, setSelectedStyle] = useState<string>(() => getStoredState(STORAGE_KEYS.STYLE, ''));
  const [selectedSpeedId, setSelectedSpeedId] = useState<string>(() => getStoredState(STORAGE_KEYS.SPEED, 'normal'));
  const [bassBoost, setBassBoost] = useState<number>(() => getStoredState(STORAGE_KEYS.BASS, 0));
  const [echoAmount, setEchoAmount] = useState<number>(() => getStoredState(STORAGE_KEYS.ECHO, 0));
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right' | 'justify'>('left');
  const [text, setText] = useState(mode === GenerationMode.SINGLE ? SAMPLE_SINGLE_PROMPT : SAMPLE_MULTI_PROMPT);
  const [activeSpeakerDropdown, setActiveSpeakerDropdown] = useState<number | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [audioBuffer, setAudioBuffer] = useState<AudioBuffer | null>(null);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [transcriptTopic, setTranscriptTopic] = useState('');
  const [isGeneratingTranscript, setIsGeneratingTranscript] = useState(false);

  // Persistence
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.MODE, JSON.stringify(mode)); }, [mode]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.VOICE_SINGLE, JSON.stringify(selectedVoice)); }, [selectedVoice]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SPEAKERS_LIST, JSON.stringify(speakers)); }, [speakers]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.STYLE, JSON.stringify(selectedStyle)); }, [selectedStyle]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.SPEED, JSON.stringify(selectedSpeedId)); }, [selectedSpeedId]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.BASS, JSON.stringify(bassBoost)); }, [bassBoost]);
  useEffect(() => { localStorage.setItem(STORAGE_KEYS.ECHO, JSON.stringify(echoAmount)); }, [echoAmount]);

  useEffect(() => {
    if (mode === GenerationMode.SINGLE) {
        if (text === SAMPLE_MULTI_PROMPT) setText(SAMPLE_SINGLE_PROMPT);
    } else {
        if (text === SAMPLE_SINGLE_PROMPT) setText(SAMPLE_MULTI_PROMPT);
    }
  }, [mode]);

  const handleGenerateAudio = async () => {
    if (!geminiService) return setError("Service unavailable.");
    setError(null);
    setIsLoading(true);
    setAudioBuffer(null);
    try {
      await geminiService.resumeContext();
      const speedConfig = SPEED_OPTIONS.find(s => s.id === selectedSpeedId);
      const speedInstruction = speedConfig ? speedConfig.instruction : '';
      let result;
      if (mode === GenerationMode.SINGLE) {
        result = await geminiService.generateSingleSpeakerAudio(text, selectedVoice, selectedStyle, speedInstruction);
      } else {
        result = await geminiService.generateMultiSpeakerAudio(text, speakers, selectedStyle, speedInstruction);
      }
      setAudioBuffer(result.buffer);
      setAudioBlob(result.blob);
    } catch (err: any) {
      setError(err.message || "Generation failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateTranscript = async () => {
    if (!geminiService || !transcriptTopic.trim()) return;
    setIsGeneratingTranscript(true);
    setError(null);
    try {
        const script = await geminiService.generateTranscript(transcriptTopic);
        setText(script);
    } catch (err: any) {
        setError("Script gen failed.");
    } finally {
        setIsGeneratingTranscript(false);
    }
  };

  const updateSpeaker = (index: number, field: keyof SpeakerConfig, value: string) => {
    const newSpeakers = [...speakers];
    newSpeakers[index] = { ...newSpeakers[index], [field]: value };
    setSpeakers(newSpeakers);
  };
  const addSpeaker = () => setSpeakers([...speakers, { name: `Speaker ${speakers.length + 1}`, voiceName: 'Puck' }]);
  const removeSpeaker = (index: number) => {
    if (speakers.length <= 2) return alert("Min 2 speakers.");
    setSpeakers(speakers.filter((_, i) => i !== index));
  };
  
  const getSpeedLabel = (id: string) => {
      switch(id) {
          case 'slow': return '75%';
          case 'normal': return '100%';
          case 'medium': return '125%';
          case 'fast': return '150%';
          case 'fastest': return '175%';
          case 'hyper': return '200%';
          default: return '100%';
      }
  };
  
  const currentSpeedIndex = SPEED_OPTIONS.findIndex(s => s.id === selectedSpeedId);

  // Editor Stats
  const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
  const charCount = text.length;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 selection:bg-indigo-500/30 selection:text-white relative font-sans">
      
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none z-0">
          <div className="absolute top-0 left-1/4 w-[800px] h-[800px] bg-indigo-900/10 rounded-full blur-[120px] animate-pulse-glow"></div>
          <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-cyan-900/10 rounded-full blur-[100px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
      </div>

      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-white/5 bg-[#050505]/80 backdrop-blur-xl">
        <div className="max-w-[1600px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="w-8 h-8 rounded bg-gradient-to-tr from-indigo-600 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <span className="font-bold text-white text-lg font-heading">L</span>
             </div>
             <h1 className="text-xl font-bold tracking-tight text-white font-heading">LYRICAL <span className="text-slate-500 font-medium">Studio</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="flex bg-black/40 p-1 rounded-lg border border-white/5">
                {[GenerationMode.SINGLE, GenerationMode.MULTI].map((m) => (
                    <button
                        key={m}
                        onClick={() => setMode(m)}
                        className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wider rounded transition-all ${mode === m ? 'bg-white/10 text-white shadow-sm border border-white/5' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                        {m === GenerationMode.SINGLE ? 'Single Voice' : 'Multi-Speaker'}
                    </button>
                ))}
              </div>
          </div>
        </div>
      </header>

      <main className="max-w-[1600px] mx-auto px-6 py-8 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Sidebar Configuration */}
        <div className="lg:col-span-3 space-y-6 flex flex-col">
            
            {/* Style Module */}
            <div className="glass-panel rounded-xl p-5 space-y-5">
                <div className="flex items-center gap-2 mb-2">
                    <div className="w-1 h-4 bg-purple-500 rounded-full"></div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Audio Characteristics</h2>
                </div>

                <div className="space-y-4">
                    {/* Tone Select */}
                    <div className="relative group">
                        <label className="text-[10px] uppercase font-bold text-slate-500 mb-1.5 block">Tone / Style</label>
                        <select 
                            value={selectedStyle} 
                            onChange={(e) => setSelectedStyle(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white outline-none focus:border-purple-500/50 appearance-none transition-colors cursor-pointer font-medium hover:border-white/20"
                        >
                            {STYLES.map((style, i) => <option key={i} value={style.value} className="bg-slate-900">{style.label}</option>)}
                        </select>
                        <div className="absolute right-3 top-[26px] pointer-events-none text-slate-500">
                             <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                        </div>
                    </div>

                    {/* Sliders Grid */}
                    <div className="grid grid-cols-1 gap-4">
                        {/* Bass */}
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Bass Enhancement</label>
                                <span className="text-[10px] font-mono text-purple-400">{bassBoost * 10}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="10" step="1" 
                                value={bassBoost} onChange={(e) => setBassBoost(parseInt(e.target.value))}
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #a855f7 ${bassBoost * 10}%, #1e1e24 ${bassBoost * 10}%)`
                                }}
                            />
                        </div>

                         {/* Echo */}
                         <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Echo / Reverb</label>
                                <span className="text-[10px] font-mono text-blue-400">{echoAmount * 10}%</span>
                            </div>
                            <input 
                                type="range" min="0" max="10" step="1" 
                                value={echoAmount} onChange={(e) => setEchoAmount(parseInt(e.target.value))}
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #3b82f6 ${echoAmount * 10}%, #1e1e24 ${echoAmount * 10}%)`
                                }}
                            />
                        </div>

                        {/* Pace */}
                        <div className="bg-white/[0.03] rounded-lg p-3 border border-white/5 hover:border-white/10 transition-colors">
                            <div className="flex justify-between mb-2">
                                <label className="text-[10px] font-bold uppercase text-slate-400">Speaking Rate</label>
                                <span className="text-[10px] font-mono text-cyan-400">{getSpeedLabel(selectedSpeedId)}</span>
                            </div>
                            <input 
                                type="range" min="0" max="5" step="1" 
                                value={currentSpeedIndex !== -1 ? currentSpeedIndex : 1}
                                onChange={(e) => {
                                    const idx = parseInt(e.target.value);
                                    if(SPEED_OPTIONS[idx]) setSelectedSpeedId(SPEED_OPTIONS[idx].id);
                                }}
                                className="w-full"
                                style={{
                                    background: `linear-gradient(to right, #06b6d4 ${(currentSpeedIndex) * 20}%, #1e1e24 ${(currentSpeedIndex) * 20}%)`
                                }}
                            />
                             <div className="flex justify-between gap-1 mt-2">
                                {SPEED_OPTIONS.map((opt, i) => (
                                    <button 
                                        key={opt.id}
                                        onClick={() => setSelectedSpeedId(opt.id)}
                                        className={`flex-1 h-5 rounded flex items-center justify-center text-[7px] font-bold uppercase tracking-wider transition-all
                                            ${selectedSpeedId === opt.id 
                                                ? 'bg-cyan-500 text-black shadow-[0_0_8px_rgba(6,182,212,0.5)]' 
                                                : 'bg-white/5 text-slate-500 hover:bg-white/10 hover:text-slate-300'
                                            }
                                        `}
                                    >
                                        {['Slow', 'Norm', 'Med', 'Fast', 'Max', '+'][i]}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Voice Module */}
            <div className="glass-panel rounded-xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <div className="w-1 h-4 bg-indigo-500 rounded-full"></div>
                    <h2 className="text-xs font-bold uppercase tracking-widest text-slate-400">Voice Model</h2>
                </div>

                {mode === GenerationMode.SINGLE ? (
                    <VoiceSelector selectedVoice={selectedVoice} onSelect={setSelectedVoice} />
                ) : (
                    <div className="space-y-3">
                         <div className="flex justify-between items-center">
                            <span className="text-[10px] uppercase font-bold text-slate-500">Cast Members</span>
                            <button onClick={addSpeaker} className="text-[10px] font-bold text-indigo-400 hover:text-white transition-colors border border-indigo-500/30 px-2 py-1 rounded bg-indigo-500/10">
                                + ADD SPEAKER
                            </button>
                        </div>
                        <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1 custom-scrollbar">
                            {speakers.map((s, i) => (
                                <div key={i} className="bg-white/5 rounded-lg p-3 border border-white/5 hover:border-white/10 transition-all">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-5 h-5 rounded bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-400 border border-white/5">{i+1}</div>
                                        <input 
                                            value={s.name}
                                            onChange={(e) => updateSpeaker(i, 'name', e.target.value)}
                                            className="bg-transparent border-b border-white/10 text-xs font-bold text-white w-full py-0.5 focus:border-indigo-500 outline-none"
                                            placeholder="Character Name"
                                        />
                                        {speakers.length > 2 && (
                                            <button onClick={() => removeSpeaker(i)} className="text-slate-600 hover:text-red-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                                        )}
                                    </div>
                                    <button 
                                        className="w-full flex justify-between items-center bg-black/40 px-3 py-2 rounded border border-white/5 hover:bg-black/60 text-xs"
                                        onClick={() => setActiveSpeakerDropdown(activeSpeakerDropdown === i ? null : i)}
                                    >
                                        <span className="text-slate-400">Voice: <span className="text-indigo-300 font-semibold ml-1">{getVoiceName(s.voiceName)}</span></span>
                                        <svg className="w-3 h-3 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </button>
                                    {activeSpeakerDropdown === i && (
                                        <div className="mt-2 pt-2 border-t border-white/5 animate-fade-in">
                                            <VoiceSelector selectedVoice={s.voiceName} onSelect={(v) => { updateSpeaker(i, 'voiceName', v); setActiveSpeakerDropdown(null); }} />
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>

             {/* Output Module (Bottom Left) - Made sticky/floating on mobile, regular on desktop */}
             <div className="lg:sticky lg:top-24 order-last lg:order-none mt-6 lg:mt-0">
                <AudioPlayer audioBuffer={audioBuffer} blob={audioBlob} audioContext={geminiService?.getAudioContext() || null} bassBoost={bassBoost} echoAmount={echoAmount} />
             </div>
        </div>

        {/* Main Editor Area */}
        <div className="lg:col-span-9 flex flex-col gap-6">
            
            <div className="glass-panel flex-1 rounded-xl flex flex-col overflow-hidden min-h-[50vh] lg:min-h-[1000px] shadow-2xl relative">
                
                {/* Toolbar */}
                <div className="h-12 border-b border-white/5 bg-white/[0.02] flex items-center justify-between px-4 backdrop-blur-md">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="flex gap-2 hidden sm:flex">
                             <div className="w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-red-500 transition-colors"></div>
                             <div className="w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-yellow-500 transition-colors"></div>
                             <div className="w-2.5 h-2.5 rounded-full bg-slate-700 hover:bg-green-500 transition-colors"></div>
                        </div>
                        <div className="h-4 w-px bg-white/10 hidden sm:block"></div>
                        
                        {/* AI Input Embedded in Toolbar */}
                         <div className="flex-1 max-w-lg flex items-center bg-black/20 rounded-full px-3 py-1 border border-white/5 hover:border-indigo-500/30 focus-within:border-indigo-500/50 transition-colors">
                             <svg className="w-3.5 h-3.5 text-indigo-400 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                             <input 
                                className="bg-transparent border-none outline-none text-xs text-white placeholder-slate-500 w-full"
                                placeholder="Describe topic for AI draft..."
                                value={transcriptTopic}
                                onChange={(e) => setTranscriptTopic(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateTranscript()}
                             />
                             <button 
                                onClick={handleGenerateTranscript}
                                disabled={isGeneratingTranscript || !transcriptTopic}
                                className="text-[9px] font-bold text-indigo-300 hover:text-white disabled:opacity-30 uppercase ml-2"
                             >
                                 GEN
                             </button>
                         </div>
                    </div>

                    <div className="flex items-center gap-3 ml-4">
                         {/* Alignment */}
                         <div className="hidden sm:flex bg-black/40 rounded border border-white/5 p-0.5">
                             {['left', 'center', 'right', 'justify'].map(a => (
                                 <button key={a} onClick={() => setTextAlign(a as any)} className={`p-1.5 rounded-sm hover:bg-white/10 transition ${textAlign === a ? 'text-white bg-white/10' : 'text-slate-500'}`}>
                                     <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={a === 'left' ? "M4 6h16M4 12h10M4 18h16" : a === 'center' ? "M4 6h16M7 12h10M4 18h16" : a === 'right' ? "M4 6h16M10 12h10M4 18h16" : "M4 6h16M4 12h16M4 18h16"} /></svg>
                                 </button>
                             ))}
                         </div>
                         <button onClick={() => setText('')} className="p-1.5 text-slate-500 hover:text-red-400 transition" title="Clear Script">
                             <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                         </button>
                    </div>
                </div>

                {/* Editor Surface */}
                <div className="flex-1 relative bg-black/20">
                    <textarea 
                        className="w-full h-full bg-transparent resize-none outline-none p-4 sm:p-8 text-sm sm:text-lg leading-7 sm:leading-8 text-slate-200 font-mono placeholder-slate-700 caret-purple-500 selection:bg-purple-500/30 custom-scrollbar"
                        style={{ textAlign }}
                        placeholder="// Start typing your script..."
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        spellCheck={false}
                    />
                    {mode === GenerationMode.MULTI && (
                        <div className="hidden sm:block absolute top-4 right-8 pointer-events-none opacity-50">
                            <div className="text-[10px] text-slate-500 font-mono border border-dashed border-slate-700 px-2 py-1 rounded">
                                Hint: SpeakerName: Message
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer / Status Bar */}
                <div className="h-8 border-t border-white/5 bg-black/40 flex items-center justify-between px-4 text-[10px] font-mono text-slate-500">
                    <div className="flex gap-4">
                         <span>UTF-8</span>
                         <span>{charCount} chars</span>
                         <span>{wordCount} words</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                        <span>Ready</span> 
                    </div>
                </div>

                {/* Main Action Bar (Floating at bottom right) */}
                <div className="absolute bottom-6 right-6 z-20 flex gap-4">
                     {/* Generate Button */}
                     <button
                        onClick={handleGenerateAudio}
                        disabled={isLoading || !text}
                        className={`
                            relative overflow-hidden group rounded-full h-10 sm:h-12 px-6 sm:px-8 flex items-center gap-3 font-bold tracking-wide transition-all shadow-xl shadow-indigo-900/40
                            ${isLoading || !text ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-white text-black hover:scale-105 hover:shadow-indigo-500/30'}
                        `}
                     >
                         <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent skew-x-12 opacity-0 group-hover:opacity-100 animate-[shimmer_1.5s_infinite] pointer-events-none"></div>
                         
                         {isLoading ? (
                             <div className="flex items-center gap-2">
                                 <div className="w-3 h-3 sm:w-4 sm:h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                 <span className="text-[10px] sm:text-xs">PROCESSING</span>
                             </div>
                         ) : (
                             <>
                                <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                <span className="text-xs sm:text-sm">RENDER AUDIO</span>
                             </>
                         )}
                     </button>
                </div>
            </div>

            {error && (
                <div className="glass-panel border-red-500/20 bg-red-900/10 p-4 rounded-xl flex items-center gap-3 animate-fade-in">
                    <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                    <span className="text-sm text-red-200">{error}</span>
                </div>
            )}

        </div>
      </main>
    </div>
  );
}