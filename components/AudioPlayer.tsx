import React, { useEffect, useRef, useState } from 'react';
import { audioBufferToMp3 } from '../utils/audioUtils';

interface AudioPlayerProps {
  audioBuffer: AudioBuffer | null;
  blob: Blob | null;
  audioContext: AudioContext | null;
  bassBoost?: number; // 0 to 10
  echoAmount?: number; // 0 to 10
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ audioBuffer, blob, audioContext, bassBoost = 0, echoAmount = 0 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const sourceRef = useRef<AudioBufferSourceNode | null>(null);
  const bassFilterRef = useRef<BiquadFilterNode | null>(null);
  const delayNodeRef = useRef<DelayNode | null>(null);
  const feedbackNodeRef = useRef<GainNode | null>(null);
  const delayGainNodeRef = useRef<GainNode | null>(null);
  
  const startTimeRef = useRef<number>(0);
  const pausedTimeRef = useRef<number>(0);
  const animationFrameRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const [isProcessingDownload, setIsProcessingDownload] = useState(false);

  // Reset state when new buffer arrives
  useEffect(() => {
    stopAudio();
    pausedTimeRef.current = 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBuffer]);

  // Update effects in real-time
  useEffect(() => {
    if (audioContext) {
        if (bassFilterRef.current) {
            bassFilterRef.current.gain.setTargetAtTime(bassBoost * 1.5, audioContext.currentTime, 0.1);
        }
        if (feedbackNodeRef.current) {
             // Echo Feedback 0 to 0.5
            feedbackNodeRef.current.gain.setTargetAtTime(echoAmount * 0.05, audioContext.currentTime, 0.1);
        }
        if (delayGainNodeRef.current) {
            // Echo Wet Level
            delayGainNodeRef.current.gain.setTargetAtTime(echoAmount > 0 ? echoAmount * 0.08 : 0, audioContext.currentTime, 0.1);
        }
    }
  }, [bassBoost, echoAmount, audioContext]);

  const playAudio = () => {
    if (!audioBuffer || !audioContext) return;

    if (audioContext.state === 'suspended') {
      audioContext.resume();
    }

    const source = audioContext.createBufferSource();
    source.buffer = audioBuffer;
    
    // Bass Filter
    const filter = audioContext.createBiquadFilter();
    filter.type = 'lowshelf';
    filter.frequency.value = 200; 
    filter.gain.value = bassBoost * 1.5;

    // Echo Nodes
    const delay = audioContext.createDelay(1.0);
    delay.delayTime.value = 0.25; // 250ms echo
    
    const feedback = audioContext.createGain();
    feedback.gain.value = echoAmount * 0.05;

    const delayGain = audioContext.createGain();
    delayGain.gain.value = echoAmount > 0 ? echoAmount * 0.08 : 0;

    const analyser = audioContext.createAnalyser();
    analyser.fftSize = 512; 
    
    // Connections
    // Source -> Filter
    source.connect(filter);
    
    // Filter -> Analyser -> Dest (Dry)
    filter.connect(analyser);

    // Filter -> Delay -> DelayGain -> Analyser -> Dest (Wet)
    filter.connect(delay);
    delay.connect(delayGain);
    delayGain.connect(analyser);
    
    // Feedback Loop: Delay -> Feedback -> Delay
    delay.connect(feedback);
    feedback.connect(delay);

    // Final connection
    analyser.connect(audioContext.destination);

    sourceRef.current = source;
    bassFilterRef.current = filter;
    delayNodeRef.current = delay;
    feedbackNodeRef.current = feedback;
    delayGainNodeRef.current = delayGain;
    analyserRef.current = analyser;

    const offset = pausedTimeRef.current % audioBuffer.duration;
    source.start(0, offset);
    startTimeRef.current = audioContext.currentTime - offset;
    
    setIsPlaying(true);
    
    source.onended = () => {
       const duration = audioBuffer.duration;
       // Add some buffer for echo tail
       const tail = echoAmount > 0 ? 2 : 0;
       const elapsed = audioContext.currentTime - startTimeRef.current;
       if (elapsed >= duration + tail) {
           setIsPlaying(false);
           pausedTimeRef.current = 0;
       }
    };
    
    visualize();
  };

  const pauseAudio = () => {
    if (sourceRef.current && isPlaying && audioContext) {
      sourceRef.current.stop();
      sourceRef.current.disconnect();
      pausedTimeRef.current = audioContext.currentTime - startTimeRef.current;
      setIsPlaying(false);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }
  };

  const stopAudio = () => {
    if (sourceRef.current) {
        try {
            sourceRef.current.stop();
        } catch (e) { /* ignore */ }
        sourceRef.current.disconnect();
    }
    if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
    }
    setIsPlaying(false);
    pausedTimeRef.current = 0;
  };

  const visualize = () => {
    if (!analyserRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const canvasCtx = canvas.getContext('2d');
    if (!canvasCtx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!isPlaying) return; 
      
      animationFrameRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;

      analyserRef.current.getByteFrequencyData(dataArray);

      // Clear with heavy fade for trail effect
      canvasCtx.fillStyle = 'rgba(5, 5, 8, 0.3)'; 
      canvasCtx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let barHeight;
      let x = 0;

      for (let i = 0; i < bufferLength; i++) {
        barHeight = dataArray[i] / 1.8; // Scale down slightly

        // Premium Neon Gradient
        const gradient = canvasCtx.createLinearGradient(0, canvas.height, 0, canvas.height - barHeight);
        gradient.addColorStop(0, '#6366f1'); // Indigo 500
        gradient.addColorStop(0.5, '#a855f7'); // Purple 500
        gradient.addColorStop(1, '#22d3ee'); // Cyan 400
        
        canvasCtx.fillStyle = gradient;
        
        if (barHeight > 0) {
            canvasCtx.beginPath();
            // Rounded caps
            canvasCtx.roundRect(x, canvas.height - barHeight, barWidth, barHeight, [20, 20, 0, 0]);
            canvasCtx.fill();
            
            // Top reflection/glow dot
            canvasCtx.fillStyle = 'rgba(255,255,255,0.8)';
            canvasCtx.beginPath();
            canvasCtx.arc(x + barWidth/2, canvas.height - barHeight - 2, 1, 0, Math.PI*2);
            canvasCtx.fill();
        }

        x += barWidth + 2;
      }
    };

    draw();
  };

  const handleDownload = async () => {
    if (!audioBuffer) return;
    
    setIsProcessingDownload(true);
    let blobToDownload: Blob | null = null;
    let bufferToEncode = audioBuffer;

    try {
        if (bassBoost > 0 || echoAmount > 0) {
            const echoTail = echoAmount > 0 ? 2 : 0;
            const offlineCtx = new OfflineAudioContext(
                audioBuffer.numberOfChannels,
                (audioBuffer.duration + echoTail) * audioBuffer.sampleRate,
                audioBuffer.sampleRate
            );
            
            const source = offlineCtx.createBufferSource();
            source.buffer = audioBuffer;
            
            const filter = offlineCtx.createBiquadFilter();
            filter.type = 'lowshelf';
            filter.frequency.value = 200;
            filter.gain.value = bassBoost * 1.5;

            // Echo for render
            const delay = offlineCtx.createDelay(1.0);
            delay.delayTime.value = 0.25;
            
            const feedback = offlineCtx.createGain();
            feedback.gain.value = echoAmount * 0.05;

            const delayGain = offlineCtx.createGain();
            delayGain.gain.value = echoAmount > 0 ? echoAmount * 0.08 : 0;

            source.connect(filter);
            
            // Dry path
            filter.connect(offlineCtx.destination);
            
            // Wet path
            filter.connect(delay);
            delay.connect(delayGain);
            delayGain.connect(offlineCtx.destination);
            
            // Feedback
            delay.connect(feedback);
            feedback.connect(delay);

            source.start();
            bufferToEncode = await offlineCtx.startRendering();
        }
        await new Promise(resolve => setTimeout(resolve, 50));
        blobToDownload = audioBufferToMp3(bufferToEncode);

        if (!blobToDownload) return;

        const url = URL.createObjectURL(blobToDownload);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `LYRICAL_STUDIO_render_${Date.now()}.mp3`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

    } catch (e) {
        console.error("Error processing download", e);
        alert("Render failed.");
    } finally {
        setIsProcessingDownload(false);
    }
  };

  if (!audioBuffer) {
    return (
        <div className="h-32 flex flex-col items-center justify-center border border-dashed border-white/10 rounded-xl bg-white/[0.02]">
            <span className="text-slate-500 text-xs uppercase tracking-widest font-bold mb-2">Awaiting Generation</span>
            <div className="w-8 h-0.5 bg-slate-700 rounded-full"></div>
        </div>
    );
  }

  return (
    <div className="glass-panel rounded-xl overflow-hidden shadow-2xl shadow-black/80 relative group animate-fade-in">
      {/* Background Ambience */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent to-indigo-900/10 pointer-events-none"></div>

      <div className="relative z-10 p-5">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80] animate-pulse"></div>
                <div>
                    <h3 className="text-xs font-bold text-slate-200 uppercase tracking-widest">Master Output</h3>
                    <div className="text-[10px] text-slate-500 font-mono">
                        48kHz • 16-BIT • {audioBuffer.duration.toFixed(1)}s
                    </div>
                </div>
            </div>
            
            <button
              onClick={handleDownload}
              disabled={isProcessingDownload}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border border-white/5
                ${isProcessingDownload 
                    ? 'bg-slate-800 text-slate-500' 
                    : 'bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 hover:border-white/20'
                }`}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
              {isProcessingDownload ? 'Rendering...' : 'Export MP3'}
            </button>
          </div>

          <div className="relative w-full h-32 bg-black/60 rounded-lg overflow-hidden border border-white/5 mb-6 shadow-inner">
             {/* Grid Lines */}
             <div className="absolute inset-0 opacity-10" style={{backgroundImage: 'linear-gradient(#333 1px, transparent 1px), linear-gradient(90deg, #333 1px, transparent 1px)', backgroundSize: '20px 20px'}}></div>
             <canvas ref={canvasRef} width={800} height={128} className="w-full h-full relative z-10" />
          </div>

          <div className="flex justify-center items-center gap-8">
            <button 
                onClick={isPlaying ? pauseAudio : playAudio}
                className="group relative w-16 h-16 flex items-center justify-center rounded-full bg-slate-900 border border-white/10 shadow-[0_4px_20px_rgba(0,0,0,0.5)] transition-all hover:scale-105 active:scale-95"
            >
                {/* Glow ring */}
                <div className={`absolute inset-0 rounded-full blur-md opacity-40 transition-colors duration-300 ${isPlaying ? 'bg-cyan-500' : 'bg-indigo-500'}`}></div>
                
                <div className="relative z-10 text-slate-200">
                    {isPlaying ? (
                        <svg className="w-6 h-6 fill-current" viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" /></svg>
                    ) : (
                        <svg className="w-6 h-6 fill-current translate-x-0.5" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" /></svg>
                    )}
                </div>
            </button>
          </div>
      </div>
    </div>
  );
};

export default AudioPlayer;