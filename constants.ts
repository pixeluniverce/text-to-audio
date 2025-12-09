
import { VoiceOption } from './types';

export const VOICES: VoiceOption[] = [
  { id: 'Zephyr', name: 'Diya', gender: 'Female', style: 'Bright' },
  { id: 'Puck', name: 'Aarav', gender: 'Male', style: 'Upbeat' },
  { id: 'Charon', name: 'Vihaan', gender: 'Male', style: 'Informative' },
  { id: 'Kore', name: 'Ananya', gender: 'Female', style: 'Firm' },
  { id: 'Fenrir', name: 'Arjun', gender: 'Male', style: 'Excitable' },
  { id: 'Leda', name: 'Ishani', gender: 'Female', style: 'Youthful' },
  { id: 'Orus', name: 'Rohan', gender: 'Male', style: 'Firm' },
  { id: 'Aoede', name: 'Meera', gender: 'Female', style: 'Breezy' },
  { id: 'Callirrhoe', name: 'Saanvi', gender: 'Female', style: 'Easy-going' },
  { id: 'Autonoe', name: 'Zara', gender: 'Female', style: 'Bright' },
  { id: 'Enceladus', name: 'Kabir', gender: 'Male', style: 'Breathy' },
  { id: 'Iapetus', name: 'Aditya', gender: 'Male', style: 'Clear' },
  { id: 'Umbriel', name: 'Dev', gender: 'Male', style: 'Easy-going' },
  { id: 'Algieba', name: 'Vikram', gender: 'Male', style: 'Smooth' },
  { id: 'Despina', name: 'Priya', gender: 'Female', style: 'Smooth' },
  { id: 'Erinome', name: 'Nisha', gender: 'Female', style: 'Clear' },
  { id: 'Algenib', name: 'Raj', gender: 'Male', style: 'Gravelly' },
  { id: 'Rasalgethi', name: 'Kavya', gender: 'Female', style: 'Informative' },
  { id: 'Laomedeia', name: 'Riya', gender: 'Female', style: 'Upbeat' },
  { id: 'Achernar', name: 'Sameer', gender: 'Male', style: 'Soft' },
  { id: 'Alnilam', name: 'Manav', gender: 'Male', style: 'Firm' },
  { id: 'Schedar', name: 'Kunal', gender: 'Male', style: 'Even' },
  { id: 'Gacrux', name: 'Lakshmi', gender: 'Female', style: 'Mature' },
  { id: 'Pulcherrima', name: 'Tanvi', gender: 'Female', style: 'Forward' },
  { id: 'Achird', name: 'Sanya', gender: 'Female', style: 'Friendly' },
  { id: 'Zubenelgenubi', name: 'Varun', gender: 'Male', style: 'Casual' },
  { id: 'Vindemiatrix', name: 'Neha', gender: 'Female', style: 'Gentle' },
  { id: 'Sadachbia', name: 'Aisha', gender: 'Female', style: 'Lively' },
  { id: 'Sadaltager', name: 'Pooja', gender: 'Female', style: 'Knowledgeable' },
  { id: 'Sulafat', name: 'Sneha', gender: 'Female', style: 'Warm' },
];

export const STYLES = [
  { label: 'Natural / None', value: '' },
  { label: 'Wedding Anchor (Celebratory)', value: 'Speak in a warm, welcoming, inviting, and celebratory tone suitable for a wedding host. Ensure the delivery is completely natural, emotional, and human-like, avoiding any artificial or robotic intonation:' },
  { label: 'Indian Farmer (Rustic)', value: 'Speak with a rustic, earthy, and humble Indian accent typical of a farmer:' },
  { label: 'Indian Village Elder (Wise)', value: 'Speak in the wise, weathered, and traditional tone of an Indian village elder:' },
  { label: 'Indian Cultural (Devotional)', value: 'Speak in a respectful, warm, and traditional Indian cultural tone:' },
  { label: 'Indian Urban (Modern)', value: 'Speak in a clear, modern, and professional Indian English accent:' },
  { label: 'Indian Market (Lively)', value: 'Speak in the fast-paced, energetic, and loud tone of an Indian market seller:' },
  { label: 'Advertising (Persuasive)', value: 'Speak in a persuasive, confident, and professional advertising voice designed to sell:' },
  { label: 'Radio DJ (High Energy)', value: 'Speak in an energetic, fast-paced, and engaging Radio DJ voice:' },
  { label: 'News Anchor (Formal)', value: 'Speak with the formal, clear, and authoritative tone of a News Anchor:' },
  { label: 'Storyteller (Captivating)', value: 'Speak in a slow, captivating, and dramatic storytelling tone:' },
  { label: 'Whisper (Mysterious)', value: 'Speak in a quiet, mysterious whisper:' },
  { label: 'Excited (Hype)', value: 'Speak with extreme excitement and hype:' },
  { label: 'Calm (Meditation)', value: 'Speak in a very slow, soothing, and calm meditation voice:' },
];

export const SPEED_OPTIONS = [
  { 
    id: 'slow', 
    label: 'Slow', 
    instruction: 'Speak slowly and clearly. Enunciate every word with deliberate pauses.',
    description: 'Adds gravitas, emphasizes key points.'
  },
  { 
    id: 'normal', 
    label: 'Normal', 
    instruction: '',
    description: 'Standard conversational pace.'
  },
  { 
    id: 'medium', 
    label: 'Medium', 
    instruction: 'Speak at a slightly brisk, upbeat pace.',
    description: 'Energetic but clear.'
  },
  { 
    id: 'fast', 
    label: 'Fast', 
    instruction: 'Speak quickly and energetically.',
    description: 'High energy.'
  },
  { 
    id: 'fastest', 
    label: 'Fastest', 
    instruction: 'Speak very fast, rushing through the text.',
    description: 'Urgency and speed.'
  },
  { 
    id: 'hyper', 
    label: 'Hyper', 
    instruction: 'Speak at an extremely fast, breathless pace.',
    description: 'Maximum velocity.'
  }
];

export const SAMPLE_SINGLE_PROMPT = `Say cheerfully: Namaste! Welcome to our studio. How can I help you today?`;

export const SAMPLE_MULTI_PROMPT = `Aarav: The cricket match yesterday was incredible!
Diya: I know! That last over was so intense.`;
