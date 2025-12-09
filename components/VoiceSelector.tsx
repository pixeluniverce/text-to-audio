import React, { useState, useMemo } from 'react';
import { VOICES } from '../constants';

interface VoiceSelectorProps {
  selectedVoice: string; // This is the ID (e.g. 'Zephyr')
  onSelect: (voiceId: string) => void;
  label?: string;
  disabled?: boolean;
}

const VoiceSelector: React.FC<VoiceSelectorProps> = ({ selectedVoice, onSelect, label, disabled = false }) => {
  const [filterGender, setFilterGender] = useState<'All' | 'Male' | 'Female'>('All');

  const filteredVoices = useMemo(() => {
    if (filterGender === 'All') return VOICES;
    return VOICES.filter(v => v.gender === filterGender);
  }, [filterGender]);

  return (
    <div className="flex flex-col space-y-5 w-full">
      {/* Header Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {label && (
           <label className="text-xs font-bold uppercase tracking-widest text-slate-400 flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"></div>
             {label}
           </label>
        )}
        
        {/* Segmented Control */}
        <div className="flex bg-black/40 p-1 rounded-lg border border-white/5 backdrop-blur-sm">
          {(['All', 'Male', 'Female'] as const).map((g) => (
            <button
              key={g}
              onClick={() => setFilterGender(g)}
              className={`px-4 py-1 text-[10px] font-bold uppercase tracking-wider rounded-md transition-all duration-300 ${
                filterGender === g 
                  ? 'bg-white/10 text-white shadow-[0_0_10px_rgba(255,255,255,0.05)] border border-white/10' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {g}
            </button>
          ))}
        </div>
      </div>
      
      {/* Voice Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-3 max-h-[360px] overflow-y-auto pr-2 custom-scrollbar">
        {filteredVoices.map((voice) => {
            const isSelected = selectedVoice === voice.id;
            return (
                <button
                    key={voice.id}
                    onClick={() => onSelect(voice.id)}
                    disabled={disabled}
                    className={`
                        relative group flex flex-col justify-between p-3 rounded-lg border text-left h-24 transition-all duration-200
                        ${isSelected 
                            ? 'bg-gradient-to-br from-indigo-900/40 to-black border-indigo-500/50 shadow-[0_0_20px_-5px_rgba(99,102,241,0.3)]' 
                            : 'bg-white/[0.03] border-white/[0.03] hover:bg-white/[0.06] hover:border-white/10'
                        }
                        ${disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
                    `}
                >
                    {/* Active Indicator */}
                    {isSelected && (
                      <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-indigo-500 to-transparent opacity-70"></div>
                    )}

                    <div className="flex justify-between items-start w-full z-10">
                        <span className={`font-heading font-semibold text-sm tracking-tight transition-colors ${isSelected ? 'text-white' : 'text-slate-400 group-hover:text-slate-200'}`}>
                            {voice.name}
                        </span>
                        {voice.gender === 'Female' ? (
                           <svg className={`w-3 h-3 ${isSelected ? 'text-pink-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 2a5 5 0 100 10 5 5 0 000-10zm0 8a3 3 0 110-6 3 3 0 010 6zM12 14c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        ) : (
                           <svg className={`w-3 h-3 ${isSelected ? 'text-blue-400' : 'text-slate-600'}`} fill="currentColor" viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        )}
                    </div>
                    
                    <div className="flex items-end justify-between w-full">
                       <span className={`text-[9px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded border ${
                         isSelected 
                           ? 'border-indigo-500/30 text-indigo-200 bg-indigo-500/10' 
                           : 'border-transparent text-slate-600 bg-white/5 group-hover:bg-white/10'
                       }`}>
                         {voice.style}
                       </span>
                    </div>
                </button>
            );
        })}
      </div>
    </div>
  );
};

export default VoiceSelector;