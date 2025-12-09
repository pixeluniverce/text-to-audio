import { GoogleGenAI, Modality, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { pcmToAudioBuffer, audioBufferToWav } from '../utils/audioUtils';
import { SpeakerConfig } from '../types';

// Using the preview TTS model
const MODEL_NAME = 'gemini-2.5-flash-preview-tts';
const TRANSCRIPT_MODEL = 'gemini-2.5-flash-lite';

export class GeminiService {
  private ai: GoogleGenAI;
  private audioContext: AudioContext;

  constructor() {
    const apiKey = process.env.API_KEY;
    if (!apiKey) {
      throw new Error("API Key not found");
    }
    this.ai = new GoogleGenAI({ apiKey });
    
    // Initialize AudioContext lazily or check for browser support
    this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({
      sampleRate: 24000, // Match Gemini output
    });
  }

  async generateTranscript(topic: string): Promise<string> {
    const response = await this.ai.models.generateContent({
      model: TRANSCRIPT_MODEL,
      contents: `Generate a short, engaging transcript for a text-to-speech demo. 
      Topic: ${topic}. 
      Output ONLY the transcript text. 
      If it is a conversation, use "Speaker1: ..." and "Speaker2: ..." format. 
      Keep it under 100 words.`,
    });
    return response.text || '';
  }

  async generateSingleSpeakerAudio(
    text: string, 
    voiceName: string, // This is the Gemini ID (e.g. 'Zephyr')
    stylePrompt: string = '',
    speedInstruction: string = ''
  ): Promise<{ buffer: AudioBuffer, blob: Blob }> {
    
    // Fix: Put speed instruction FIRST. Style prompts often end in a colon (e.g., "Speak like a DJ:"),
    // so appending speed after the colon makes it part of the text to be spoken.
    const instructions = [speedInstruction, stylePrompt].filter(Boolean).join(" ");
    
    const fullText = instructions 
      ? `${instructions}\n"${text}"` 
      : text;

    try {
        const response = await this.ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [{ text: fullText }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    voiceConfig: {
                        prebuiltVoiceConfig: { voiceName: voiceName },
                    },
                },
                // Add safety settings to prevent blocks
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
            console.error("Gemini Response:", response);
            if (response.promptFeedback?.blockReason) {
                 throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
            }
            throw new Error("No audio data returned from Gemini. Please try a different prompt or voice.");
        }

        const buffer = await pcmToAudioBuffer(base64Audio, this.audioContext);
        const blob = audioBufferToWav(buffer);
        return { buffer, blob };

    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        throw new Error(error.message || "Failed to generate audio.");
    }
  }

  async generateMultiSpeakerAudio(
    text: string, 
    speakers: SpeakerConfig[],
    stylePrompt: string = '',
    speedInstruction: string = ''
  ): Promise<{ buffer: AudioBuffer, blob: Blob }> {
    
    // Construct speaker config for the API using ID
    const speakerVoiceConfigs = speakers.map(s => ({
      speaker: s.name,
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName: s.voiceName } 
      }
    }));

    // Fix: Put speed instruction FIRST
    const instructions = [speedInstruction, stylePrompt].filter(Boolean).join(" ");

    // For multi-speaker, we add the style instruction at the top
    const prompt = instructions 
        ? `${instructions}\n\n${text}` 
        : text;

    try {
        const response = await this.ai.models.generateContent({
            model: MODEL_NAME,
            contents: {
                parts: [{ text: prompt }]
            },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: {
                    multiSpeakerVoiceConfig: {
                        speakerVoiceConfigs: speakerVoiceConfigs
                    }
                },
                safetySettings: [
                    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
                    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
                ]
            },
        });

        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

        if (!base64Audio) {
             console.error("Gemini Response:", response);
             if (response.promptFeedback?.blockReason) {
                 throw new Error(`Content blocked: ${response.promptFeedback.blockReason}`);
            }
            throw new Error("No audio data returned from Gemini.");
        }

        const buffer = await pcmToAudioBuffer(base64Audio, this.audioContext);
        const blob = audioBufferToWav(buffer);
        return { buffer, blob };
    } catch (error: any) {
        console.error("Gemini Generation Error:", error);
        throw new Error(error.message || "Failed to generate audio.");
    }
  }

  // Helper to resume context if suspended (browser policy)
  async resumeContext() {
    if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  getAudioContext() {
    return this.audioContext;
  }
}