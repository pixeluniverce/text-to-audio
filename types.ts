export interface VoiceOption {
  id: string;   // The Gemini API ID (e.g., 'Zephyr')
  name: string; // The Display Name (e.g., 'Aarav')
  gender: 'Male' | 'Female';
  style: string;
}

export enum GenerationMode {
  SINGLE = 'SINGLE',
  MULTI = 'MULTI'
}

export interface SpeakerConfig {
  name: string;
  voiceName: string; // This stores the ID (e.g. 'Zephyr')
}

export interface AudioState {
  isPlaying: boolean;
  audioBuffer: AudioBuffer | null;
  currentTime: number;
  duration: number;
}

export interface GenerationResult {
  audioBuffer: AudioBuffer;
  blob: Blob;
}