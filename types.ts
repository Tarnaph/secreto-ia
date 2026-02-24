
export interface Scene {
  id: string;
  narration: string;
  visualPrompt: string; // Descrição da imagem estática
  videoPrompt: string; // Descrição do movimento/animação para o Veo3
  imageUrl?: string;
  audioUrl?: string;
  audioDuration?: number;
  manualDuration?: number; // User defined duration in seconds
  useImageAsRef?: boolean; // Se deve usar a imagem gerada como referência
  isGeneratingImage?: boolean;
  isGeneratingAudio?: boolean;
  error?: string;
}

export interface VideoMetadata {
  title: string;
  description: string;
  hashtags: string[];
}

export interface Character {
  id: string;
  name: string;
  imageData: string; // Base64 string
}

export enum AppView {
  SCRIPT = 'SCRIPT',
  SCENES = 'SCENES',
  METADATA = 'METADATA',
  MUSIC = 'MUSIC',
  MEDIA = 'MEDIA',
  SRT_CONVERTER = 'SRT_CONVERTER'
}

export enum ImageStyle {
  PAINTED_ANIME = 'Painted Anime',
  CASUAL_PHOTO = 'Casual Photo',
  CINEMATIC = 'Cinematic',
  DIGITAL_PAINTING = 'Digital Painting',
  CONCEPT_ART = 'Concept Art',
  DISNEY_3D = '3D Disney Character',
  DISNEY_2D = '2D Disney Character',
  PAINTERLY = 'Painterly',
  OIL_PAINTING = 'Oil Painting',
  PROFESSIONAL_PHOTO = 'Professional Photo',
  ANIME = 'Anime',
  CUTE_ANIME = 'Cute Anime',
  FANTASY_LANDSCAPE = 'Fantasy Landscape',
  STUDIO_GHIBLI = 'Studio Ghibli',
  VINTAGE_COMIC = 'Vintage Comic',
  PIXEL_ART = 'Pixel Art',
  CLAYMATION = 'Claymation',
  CURSED_PHOTO = 'Cursed Photo',
  DOCUMENTARY_MILITARY_BR = 'Documental Militar BR',
  MILITARY_RETRO_BR = 'Militar Retrô Brasileiro',
  VINTAGE_BW = 'Vintage B&W',
  WOODEN_DIORAMA = '3D Wooden Diorama',
  CRAYON_SCIENCE = 'Crayon Science Visual',
  MEDIEVAL_ENGRAVING = 'Gravura Medieval Vibrante',
  WILDLIFE_DOCUMENTARY = 'Documentário de Vida Selvagem',
  ATMOSPHERIC_DECAY = 'Hyper-Realistic Atmospheric Decay',
  BIBLICAL_EPIC = 'Cena Bíblica Épica',
  NOIR_DARK_PSYCHOLOGY = 'Noir Dark Psychology',
  CYBER_ORGANIC_NEON = 'Cyber-Organic Neon',
  RELIGIOUS_ETCHING = 'Gravura Religiosa Século XIX',
  FINE_ART_RELIGIOUS_SPLASH = 'Fine Art Religious Splash',
  SPIRITUAL_CODE_THUMBNAIL = 'Código Espiritual Thumbnail',
  SACRED_TAROT_LINEART = 'Sacred Tarot Lineart',
  DARK_FANTASY_JUNJI = 'Dark fantasy ink illustration in the style of Junji, preto e branco, muito contraste, terror,'
}

export type ImageModelType = 'standard' | 'pro';

export enum SubtitleStyle {
  MODERN = 'Modern',
  KARAOKE = 'Karaoke',
  CLASSIC = 'Classic',
  MINIMAL = 'Minimal'
}

export enum NarrativeTone {
  NEUTRAL = 'Neutro',
  PROFESSIONAL = 'Profissional',
  HUMOROUS = 'Engraçado',
  ENTHUSIASTIC = 'Entusiasmado',
  DRAMATIC = 'Dramático',
  EDUCATIONAL = 'Educativo'
}

export type Pace = 'super_slow' | 'slow' | 'normal' | 'dynamic' | 'frenetic' | 'auto';

export interface VoiceOption {
  name: string;
  gender: 'Male' | 'Female';
  description: string;
}

export const AVAILABLE_VOICES: VoiceOption[] = [
  // Masculinas
  { name: 'Puck', gender: 'Male', description: 'Suave e Natural (Narrativa Geral)' },
  { name: 'Charon', gender: 'Male', description: 'Grave e Profundo (Documentários)' },
  { name: 'Fenrir', gender: 'Male', description: 'Intenso e Energético (Promo)' },
  { name: 'Orus', gender: 'Male', description: 'Confiante e Seguro (Notícias/Fatos)' },
  { name: 'Iapetus', gender: 'Male', description: 'Jovem e Conversacional (Vlogs)' },
  { name: 'Alnilam', gender: 'Male', description: 'Calmo e Reflexivo (Meditação)' },
  
  // Femininas
  { name: 'Kore', gender: 'Female', description: 'Calma e Relaxante (Meditação/Explicação)' },
  { name: 'Aoede', gender: 'Female', description: 'Elegante e Formal (Corporativo)' },
  { name: 'Zephyr', gender: 'Female', description: 'Amigável e Empática (Histórias)' },
  { name: 'Leda', gender: 'Female', description: 'Sofisticada e Artística (Lifestyle)' },
  { name: 'Callirrhoe', gender: 'Female', description: 'Doce e Envolvente (Infantil/Edu)' },
  { name: 'Erinome', gender: 'Female', description: 'Profunda e Séria (Drama)' },
];

export interface MusicTrack {
  id: string;
  name: string;
  url: string;
  tags: string[];
  description: string;
}

export interface MusicAnalysis {
  mood: string;
  bpm: string;
  instruments: string[];
  reasoning: string;
  suggestedTag: string;
}

export const STOCK_MUSIC: MusicTrack[] = [
  { 
    id: 'noir_suspense', 
    name: 'Noir Investigation', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-15.mp3',
    tags: ['noir', 'dark', 'suspense', 'investigation', 'slow'],
    description: 'Deep bass, mysterious atmosphere, minimal pulses.'
  },
  { 
    id: 'dark_ambient', 
    name: 'Abyssal Psychology',
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
    tags: ['dark', 'psychology', 'ambient', 'horror', 'creepy'],
    description: 'Unsettling drones, minimal piano, psychological horror.'
  },
  { 
    id: 'cinematic_epic', 
    name: 'Epic Rise', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    tags: ['epic', 'cinematic', 'inspiring', 'orchestral'],
    description: 'Orchestral build-up, grand emotions.'
  },
  { 
    id: 'chill_lofi', 
    name: 'Midnight Study', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    tags: ['lofi', 'chill', 'relaxing', 'study'],
    description: 'Relaxed beats, soft electronic loops.'
  },
  { 
    id: 'upbeat_pop', 
    name: 'Summer Vibes', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    tags: ['happy', 'upbeat', 'pop', 'energy'],
    description: 'Energetic, positive, marketing ready.'
  },
  { 
    id: 'sad_piano', 
    name: 'Melancholy Memories', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    tags: ['sad', 'emotional', 'piano', 'drama'],
    description: 'Slow solo piano, emotional, reflective.'
  },
  { 
    id: 'tech_modern', 
    name: 'Future Tech', 
    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    tags: ['tech', 'corporate', 'modern', 'clean'],
    description: 'Clean synthesizer, driving rhythm, innovation.'
  }
];
