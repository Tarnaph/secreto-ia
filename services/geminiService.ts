
import { GoogleGenAI, Type, Modality } from "@google/genai";
import { Scene, VideoMetadata, Pace, ImageStyle, ImageModelType, Character, NarrativeTone, MusicAnalysis } from "../types";

// Audio Utilities
export function pcmToWav(pcmData: Int16Array, sampleRate: number = 24000): Blob {
    const numChannels = 1;
    const byteRate = sampleRate * numChannels * 2;
    const blockAlign = numChannels * 2;
    const dataSize = pcmData.byteLength;
    const buffer = new ArrayBuffer(44 + dataSize);
    const view = new DataView(buffer);
    const writeString = (view: DataView, offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    writeString(view, 0, 'RIFF');
    view.setUint32(4, 36 + dataSize, true);
    writeString(view, 8, 'WAVE');
    writeString(view, 12, 'fmt ');
    view.setUint32(16, 16, true); 
    view.setUint16(20, 1, true); 
    view.setUint16(22, numChannels, true); 
    view.setUint32(24, sampleRate, true); 
    view.setUint32(28, byteRate, true); 
    view.setUint16(32, blockAlign, true); 
    view.setUint16(34, 16, true); 
    writeString(view, 36, 'data');
    view.setUint32(40, dataSize, true);
    const pcmBytes = new Uint8Array(pcmData.buffer);
    const dataBytes = new Uint8Array(buffer, 44);
    dataBytes.set(pcmBytes);
    return new Blob([buffer], { type: 'audio/wav' });
}

function base64ToPCM(base64: string): Int16Array {
    const binaryString = atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new Int16Array(bytes.buffer);
}

let ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

async function retryOperation<T>(operation: () => Promise<T>, maxRetries = 3, initialDelay = 1000): Promise<T> {
    let delay = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
        try {
            ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
            return await operation();
        } catch (error: any) {
            if (i === maxRetries - 1) throw error;
            console.warn(`Retry attempt ${i+1} due to error: ${error.message}`);
            const isRateLimit = error.message?.includes('429') || error.status === 429;
            const waitTime = isRateLimit ? delay * 2 : delay; 
            await new Promise(resolve => setTimeout(resolve, waitTime));
            delay *= 1.5; 
        }
    }
    throw new Error("Operation failed");
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function processInBatches<T, R>(
  items: T[], 
  batchSize: number, 
  processor: (batch: T[], startIndex: number) => Promise<R[]>
): Promise<R[]> {
  const batches = [];
  for (let i = 0; i < items.length; i += batchSize) {
    batches.push({ batch: items.slice(i, i + batchSize), index: i });
  }
  const CONCURRENCY_LIMIT = 3; 
  const activePromises: Promise<void>[] = [];
  const resultMap = new Map<number, R[]>();
  for (const { batch, index } of batches) {
      const operation = async () => {
          try {
              const res = await processor(batch, index);
              resultMap.set(index, res);
          } catch (e) {
              resultMap.set(index, batch.map((item: any) => ({ ...item, visualPrompt: item.narration } as any)));
          }
      };
      const p = operation().then(() => {
          activePromises.splice(activePromises.indexOf(p), 1);
      });
      activePromises.push(p);
      if (activePromises.length >= CONCURRENCY_LIMIT) await Promise.race(activePromises);
      await delay(200); 
  }
  await Promise.all(activePromises);
  const results: R[] = [];
  for (const { index } of batches) {
      if (resultMap.has(index)) results.push(...resultMap.get(index)!);
  }
  return results;
}

const UNIVERSAL_PROMPT_SYSTEM = `
VOCÊ É UM DIRETOR DE FOTOGRAFIA E DIRETOR DE MOVIMENTO DE ELITE.
Sua tarefa é expandir narrações em prompts técnicos.

REGRA MANDATÓRIA (CRÍTICO):
O "visualPrompt" DEVE começar obrigatoriamente com a descrição do [ESTILO VISUAL] fornecido. 
Não omita o estilo no início de nenhuma cena.

ESTRATÉGIA ANTI-LAZINESS:
- visualPrompt: Inicie com o estilo, depois descreva a cena, lente, iluminação e atmosfera.
- videoPrompt: Descreva o movimento de câmera e ação física.
`;

export const STYLE_DEFINITIONS: Record<string, string> = {
    [ImageStyle.PAINTED_ANIME]: "high quality painted anime style, vibrant colors, detailed brushwork, makoto shinkai style background, 4k resolution",
    [ImageStyle.CASUAL_PHOTO]: "casual smartphone photography, natural lighting, candid moment, social media aesthetic, sharp focus, iphone photo, raw style",
    [ImageStyle.CINEMATIC]: "epic cinematic movie still, 35mm lens, 8k resolution, professional color grading, realistic textures, volumetric lighting, Arri Alexa, masterwork, sharp focus",
    [ImageStyle.DIGITAL_PAINTING]: "digital art, highly detailed, sharp focus, trending on artstation, concept art, smooth, sharp focus, illustration, 8k",
    [ImageStyle.CONCEPT_ART]: "concept art, digital painting, mystery, cinematic, fantasy, intricate details, 8k, trending on artstation",
    [ImageStyle.DISNEY_3D]: "3D Disney Pixar style, high quality render, cute, expressive, 8k, unreal engine 5, octane render",
    [ImageStyle.DISNEY_2D]: "classic 2D Disney animation style, hand drawn, cel shaded, vibrant colors, expressive characters, 1990s disney aesthetic",
    [ImageStyle.PAINTERLY]: "painterly style, visible brushstrokes, oil painting texture, artistic, impressionist, masterpiece",
    [ImageStyle.OIL_PAINTING]: "masterpiece oil painting, Baroque religious art style, heavy brushstrokes, dramatic chiaroscuro, rich textures, deep shadows, warm highlights, 4k",
    [ImageStyle.PROFESSIONAL_PHOTO]: "professional studio photography, softbox lighting, 85mm lens, sharp focus, high detail, 8k, bokeh",
    [ImageStyle.ANIME]: "anime style, japanese animation, cel shaded, vibrant, high quality, 4k, detailed background",
    [ImageStyle.CUTE_ANIME]: "cute anime style, chibi, pastel colors, soft lighting, kawaii, high quality, detailed",
    [ImageStyle.FANTASY_LANDSCAPE]: "fantasy landscape, magic, ethereal, dreamy, intricate details, 8k, cinematic lighting, matte painting",
    [ImageStyle.STUDIO_GHIBLI]: "Studio Ghibli style, anime, hayao miyazaki, vibrant colors, hand painted background, detailed, whimsical",
    [ImageStyle.VINTAGE_COMIC]: "vintage comic book style, halftone pattern, bold lines, retro colors, 1950s comic aesthetic, pop art",
    [ImageStyle.PIXEL_ART]: "pixel art, 16-bit, retro game aesthetic, detailed, vibrant colors, isometric",
    [ImageStyle.CLAYMATION]: "claymation style, plasticine texture, stop motion aesthetic, aardman style, handmade look, soft lighting",
    [ImageStyle.CURSED_PHOTO]: "cursed image, low quality, unnerving atmosphere, flash photography, liminal space, disturbing, grainy, noise, vhs aesthetic",
    [ImageStyle.DOCUMENTARY_MILITARY_BR]: "Brazilian military documentary footage, 16mm film grain, 1970s aesthetic, realistic, historical, journalism style",
    [ImageStyle.MILITARY_RETRO_BR]: "Brazilian retro military aesthetic, vintage poster style, green and yellow tones, patriotic, propaganda style, rounded shapes, worn paper texture",
    [ImageStyle.VINTAGE_BW]: "vintage black and white photography, film grain, scratches, sepia tone, 1920s aesthetic, historical, leica camera",
    [ImageStyle.WOODEN_DIORAMA]: "carved wood texture, 3d wooden diorama, depth of field, tilt shift, miniature, intricate details, handmade",
    [ImageStyle.CRAYON_SCIENCE]: "crayon drawing, scientific illustration, child's drawing style, colorful, textured paper, diagrams, cute",
    [ImageStyle.MEDIEVAL_ENGRAVING]: "medieval engraving style, woodcut, etching, crosshatching, black and white, historical, detailed, ink on paper",
    [ImageStyle.WILDLIFE_DOCUMENTARY]: "wildlife documentary photography, telephoto lens, national geographic style, sharp focus on subject, blurred background, natural lighting",
    [ImageStyle.ATMOSPHERIC_DECAY]: "hyper-realistic historical reconstruction, worn-out textures, dirty and gritty details, atmospheric haze, volumetric lighting, cinematic composition, shot on 35mm lens, sharp focus, depth of field, photorealistic, 8k quality",
    [ImageStyle.BIBLICAL_EPIC]: "epic biblical scene, central character spotlight, dramatic golden hour lighting, deep cinematic shadows, ancient stone architecture, airborne dust particles, grand scale, hyper-realistic digital painting, biblical movie poster aesthetic, high contrast, intense emotional focus, 8k resolution, photorealistic, no text",
    [ImageStyle.NOIR_DARK_PSYCHOLOGY]: "noir dark psychology aesthetic, desaturated color grading, dark blue tones, lead gray, deep blacks, high contrast, extreme close-ups of eyes, silhouettes, predatory nature imagery, antique pendulum clocks, water drops in slow motion, emotionless faces, shop mannequins, psychological horror atmosphere, cinematic lighting, 8k resolution, haunting, photorealistic",
    [ImageStyle.CYBER_ORGANIC_NEON]: "Cinematic hyper-realistic shot, hybrid human-android character with exposed robotic limbs, Cyberpunk aesthetic, dramatic cyan and magenta neon rim light, volumetric fog, wet pavement reflections. Atmosphere: Dense urban mist, high-contrast shadows. Ultra-detailed 8k",
    [ImageStyle.RELIGIOUS_ETCHING]: "Religious illustration in the style of 19th-century engraved etching, black and white, extremely detailed linework and cross-hatching, strong contrast, sacred Christian symbolism, dramatic chiaroscuro, high-resolution, no color",
    [ImageStyle.FINE_ART_RELIGIOUS_SPLASH]: "Hyper-realistic photography in fine art dark style, dramatic portrait of a religious figure in a somber ancient stone and mist environment, cinematic lighting with single candle rays creating a golden halo, asymmetric composition, shallow depth of field. MASKED COLOR SPLASH: Scene is mostly desaturated cold blue/gray tones with deep gritty textures, except for ONE SINGLE ULTRA-VIBRANT COLOR ELEMENT (like a glowing blood-red item) that pops intensely, extreme contrast, deep shadows, 8k, professional studio quality, subtle smoke effects, style of Gregory Crewdson",
    [ImageStyle.SPIRITUAL_CODE_THUMBNAIL]: "Cinematic digital artwork in hyper-realistic fantasy style, dramatic dark spiritual theme, high-impact composition, extremely detailed textures, volumetric god rays, rim lighting, high contrast shadows, mystical dark fantasy atmosphere, 8k resolution. VIBRANT MASKED COLOR: Intense glowing mystical portals in purple and gold, divine light emanating with ethereal glow, bold highlights, sharp focus, masterwork quality, cinematic 16:9 aspect ratio, style of Gregory Crewdson, NO TEXT OR LOGOS",
    [ImageStyle.SACRED_TAROT_LINEART]: "Intricate lineart digital tarot card artwork, warm sepia and gold color palette, ethereal spiritual aesthetic, sacred geometry patterns, radiant sunburst effects, detailed ink line work, ornate borders with mystical symbols, high contrast chiaroscuro, volumetric divine rays, gold leaf accents, fine art illustration style, 8k resolution, cinematic 16:9 composition, NO TEXT OR LETTERS",
    [ImageStyle.DARK_FANTASY_JUNJI]: "Dark fantasy ink illustration in the style of Junji Ito, black and white, extreme contrast, horror, highly detailed line art, macabre, unsettling atmosphere, crosshatching, grotesque elements, psychological terror, 8k resolution",
    [ImageStyle.RISOGRAPH_PUNK]: "Risograph punk art style, vibrant neon pink and strong green flat colors, grainy print texture, visible halftone dots, collage style with cut-out faces, central character screaming, surrounded by explosive shapes, punk show poster aesthetic, slight color layer misalignment, cheap printing imperfections, aggressive, raw, underground atmosphere, high contrast, 8k resolution, no text"
};

const TECH_BASE = "hyper-realistic, 8k, cinematic lighting, masterwork, intricate textures, sharp focus, high detail, photorealistic";

export const generateVisualsForScenes = async (
    scenes: { narration: string, duration?: number }[], 
    style: ImageStyle = ImageStyle.CINEMATIC,
    context?: string,
    includeVideoPrompts: boolean = true
) => {
    const styleDescription = STYLE_DEFINITIONS[style] || style;

    return processInBatches(scenes, 10, async (batch, startIndex) => {
        const prompt = `
        ${UNIVERSAL_PROMPT_SYSTEM}

        CONTEXTO DO PROJETO: ${context || "Vídeo de alta qualidade"}.
        ESTILO VISUAL MANDATÓRIO: "${style}".
        DESCRIÇÃO TÉCNICA DO ESTILO: "${styleDescription}".
        
        Gere prompts detalhados para estas cenas (do ${startIndex + 1} ao ${startIndex + batch.length}):
        ${batch.map((s, i) => `[Cena ${startIndex + i + 1}]: "${s.narration}"`).join('\n')}
        
        IMPORTANTE: O "visualPrompt" DEVE INICIAR COM A DESCRIÇÃO TÉCNICA DO ESTILO.
        IMPORTANTE (MANDATÓRIO): NÃO INCLUA nenhum texto, palavra, logo ou marca d'água na imagem. A imagem deve ser puramente visual.
        Para o estilo "${ImageStyle.FINE_ART_RELIGIOUS_SPLASH}", "${ImageStyle.SPIRITUAL_CODE_THUMBNAIL}", "${ImageStyle.SACRED_TAROT_LINEART}" ou "${ImageStyle.DARK_FANTASY_JUNJI}", certifique-se de escolher elementos visuais que representem a narração respeitando o estilo técnico de cores e linhas.
        Retorne APENAS um array JSON.
        `;

        return retryOperation(async () => {
            const response = await ai.models.generateContent({
                model: 'gemini-3-pro-preview', 
                contents: prompt,
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.ARRAY,
                        items: { 
                            type: Type.OBJECT,
                            properties: {
                                visualPrompt: { type: Type.STRING },
                                videoPrompt: { type: Type.STRING }
                            },
                            required: ["visualPrompt", "videoPrompt"]
                        }
                    }
                }
            });
            const prompts = JSON.parse(response.text || "[]");
            
            // GARANTIA VIA CÓDIGO: Se a IA não incluiu o estilo no início, o sistema força a inclusão aqui.
            return batch.map((s, i) => {
                let vPrompt = prompts[i]?.visualPrompt || s.narration;
                const lowerStyle = styleDescription.toLowerCase().substring(0, 30);
                if (!vPrompt.toLowerCase().includes(lowerStyle)) {
                    vPrompt = `${styleDescription}, ${vPrompt}`;
                }
                
                return { 
                    ...s, 
                    narration: s.narration.substring(0, 499),
                    visualPrompt: vPrompt,
                    videoPrompt: prompts[i]?.videoPrompt || ""
                };
            });
        });
    });
};

export const generateScript = async (
    topic: string, 
    durationMinutes: number, 
    pace: Pace = 'normal', 
    style: ImageStyle = ImageStyle.CINEMATIC,
    includeVideoPrompts: boolean = true
) => {
  let scenesPerMinute = pace === 'frenetic' ? 18 : pace === 'dynamic' ? 12 : 6;
  const estimatedScenes = Math.max(2, Math.ceil(durationMinutes * scenesPerMinute));
  
  const narrations: { narration: string }[] = await retryOperation(async () => {
    const response = await ai.models.generateContent({
        model: 'gemini-3-pro-preview',
        contents: `Crie um roteiro de ${estimatedScenes} cenas sobre ${topic}. Estilo: ${style}. Retorne JSON array com "narration". IMPORTANTE: Cada "narration" deve ter no máximo 499 caracteres.`,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: { narration: { type: Type.STRING, description: "Texto da narração. MÁXIMO 499 caracteres." } },
                    required: ["narration"]
                }
            }
        }
    });
    return JSON.parse(response.text || "[]");
  });

  return await generateVisualsForScenes(narrations, style, `Roteiro sobre ${topic}`, includeVideoPrompts);
};

export const formatScript = async (
    text: string, 
    pace: Pace = 'normal', 
    style: ImageStyle = ImageStyle.CINEMATIC,
    includeVideoPrompts: boolean = true
) => {
    const narrations: { narration: string }[] = await retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Divida o texto em cenas curtas e descritivas: "${text}". Retorne JSON array com "narration". IMPORTANTE: Cada "narration" deve ter no máximo 499 caracteres. REGRA DE OURO: NUNCA RESUMA O TEXTO QUE TE MANDEI. Mantenha o texto original intacto, apenas divida-o em partes menores.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: { narration: { type: Type.STRING, description: "Texto da narração. MÁXIMO 499 caracteres. NÃO RESUMA O TEXTO ORIGINAL." } },
                        required: ["narration"]
                    }
                }
            }
        });
        return JSON.parse(response.text || "[]");
    });
    return await generateVisualsForScenes(narrations, style, `Baseado no texto: ${text.substring(0, 100)}`, includeVideoPrompts);
};

export const analyzeScriptForMusic = async (scriptText: string): Promise<MusicAnalysis> => {
    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Analyze script for music identity: "${scriptText.substring(0, 2000)}". JSON output.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        mood: { type: Type.STRING },
                        bpm: { type: Type.STRING },
                        instruments: { type: Type.ARRAY, items: { type: Type.STRING } },
                        reasoning: { type: Type.STRING },
                        suggestedTag: { type: Type.STRING }
                    },
                    required: ["mood", "bpm", "instruments", "reasoning", "suggestedTag"]
                }
            }
        });
        return JSON.parse(response.text || "{}");
    });
};

export const processAudioToScript = async (
    audioBase64: string, 
    mimeType: string,
    segmentDuration: number
): Promise<{narration: string, duration: number, startTime?: number, endTime?: number}[]> => {
    const rawBase64 = audioBase64.includes(',') ? audioBase64.split(',')[1] : audioBase64;
    const binaryString = atob(rawBase64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) bytes[i] = binaryString.charCodeAt(i);

    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new AudioContextClass();
    const audioBuffer = await ctx.decodeAudioData(bytes.buffer);
    const totalDuration = audioBuffer.duration;

    console.log(`Audio decodificado: ${totalDuration.toFixed(2)}s. Gerando blocos de ${segmentDuration}s.`);

    const CHUNK_DURATION_SEC = 120;
    const chunks = [];
    for (let time = 0; time < totalDuration; time += CHUNK_DURATION_SEC) {
        const end = Math.min(time + CHUNK_DURATION_SEC, totalDuration);
        const frameCount = Math.floor((end - time) * audioBuffer.sampleRate);
        const chunkBuffer = ctx.createBuffer(1, frameCount, audioBuffer.sampleRate);
        const channelData = audioBuffer.getChannelData(0);
        const newChannelData = chunkBuffer.getChannelData(0);
        const startOffset = Math.floor(time * audioBuffer.sampleRate);
        for (let i = 0; i < frameCount; i++) {
            if (startOffset + i < channelData.length) newChannelData[i] = channelData[startOffset + i];
        }
        chunks.push({ start: time, end, buffer: chunkBuffer });
    }

    const processChunk = async (chunk: any) => {
        const channelData = chunk.buffer.getChannelData(0);
        const pcmData = new Int16Array(channelData.length);
        for (let i = 0; i < channelData.length; i++) {
            const s = Math.max(-1, Math.min(1, channelData[i]));
            pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
        }
        const wavBlob = pcmToWav(pcmData, chunk.buffer.sampleRate);
        const b64 = await new Promise<string>(r => {
            const f = new FileReader();
            f.onloadend = () => r((f.result as string).split(',')[1]);
            f.readAsDataURL(wavBlob);
        });

        return retryOperation(async () => {
            const res = await ai.models.generateContent({
                model: 'gemini-3-pro-preview',
                contents: { parts: [{ inlineData: { mimeType: 'audio/wav', data: b64 } }, { text: "Transcribe audio to segments. JSON array 'segments' with 'text', 'start', 'end'. Each 'text' must be under 499 characters." }] },
                config: {
                    responseMimeType: "application/json",
                    responseSchema: {
                        type: Type.OBJECT,
                        properties: {
                            segments: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: { 
                                        text: { type: Type.STRING, description: "Transcrição do áudio. MÁXIMO 499 caracteres." }, 
                                        start: { type: Type.NUMBER }, 
                                        end: { type: Type.NUMBER } 
                                    },
                                    required: ["text", "start", "end"]
                                }
                            }
                        }
                    }
                }
            });
            const json = JSON.parse(res.text || '{"segments":[]}');
            return json.segments.map((s: any) => ({ ...s, start: s.start + chunk.start, end: s.end + chunk.start }));
        });
    };

    const allSegments = [];
    for (let i = 0; i < chunks.length; i += 3) {
        const batch = chunks.slice(i, i + 3);
        const results = await Promise.all(batch.map(c => processChunk(c)));
        results.forEach(r => allSegments.push(...r));
        await delay(500);
    }
    allSegments.sort((a, b) => a.start - b.start);

    // GARANTIA DE QUANTIDADE: Loop matemático exato baseado na duração total
    const finalScenes = [];
    const expectedSceneCount = Math.ceil(totalDuration / segmentDuration);
    
    for (let i = 0; i < expectedSceneCount; i++) {
        const blockStart = i * segmentDuration;
        const blockEnd = Math.min(blockStart + segmentDuration, totalDuration);
        
        const overlapping = allSegments.filter(s => s.start < blockEnd && s.end > blockStart);
        let text = overlapping.map(s => s.text).join(' ').trim();
        if (text.length > 499) text = text.substring(0, 496) + "...";
        
        finalScenes.push({
            narration: text || "[Ambiente / Instrumental]",
            startTime: blockStart,
            endTime: blockEnd,
            duration: blockEnd - blockStart
        });
    }

    ctx.close();
    return finalScenes;
};

export const sliceAudioFromFile = async (audioUrl: string, segments: { startTime?: number, endTime?: number, duration: number }[]): Promise<string[]> => {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    try {
        const res = await fetch(audioUrl);
        const buf = await ctx.decodeAudioData(await res.arrayBuffer());
        const blobs = [];
        let acc = 0;
        for (const s of segments) {
            let start = s.startTime ?? acc;
            let end = s.endTime ?? (acc + s.duration);
            const frameCount = Math.floor((end - start) * buf.sampleRate);
            if (frameCount > 0 && start < buf.length) {
                const newBuf = ctx.createBuffer(1, frameCount, buf.sampleRate);
                const data = buf.getChannelData(0);
                const newData = newBuf.getChannelData(0);
                const startOff = Math.floor(start * buf.sampleRate);
                for (let i = 0; i < frameCount; i++) if (startOff + i < data.length) newData[i] = data[startOff + i];
                const pcm = new Int16Array(frameCount);
                for (let i = 0; i < frameCount; i++) {
                    const v = Math.max(-1, Math.min(1, newData[i]));
                    pcm[i] = v < 0 ? v * 0x8000 : v * 0x7FFF;
                }
                blobs.push(URL.createObjectURL(pcmToWav(pcm, buf.sampleRate)));
            } else blobs.push("");
            acc = end;
        }
        return blobs;
    } catch (e) { return segments.map(() => ""); } finally { ctx.close(); }
};

export const generateImage = async (prompt: string, aspectRatio: '16:9' | '9:16', style: ImageStyle, modelType: ImageModelType = 'standard', characters?: Character[]) => {
    const styleDescription = STYLE_DEFINITIONS[style] || `${TECH_BASE}, Style: ${style}`;
    
    // GARANTIA FINAL: Estilo sempre prefixado antes do envio ao modelo de imagem
    let finalPromptToIA = prompt;
    const lowerStyle = styleDescription.toLowerCase().substring(0, 30);
    if (!prompt.toLowerCase().includes(lowerStyle)) {
        finalPromptToIA = `${styleDescription}, ${prompt}`;
    }
    
    const parts: any[] = [];
    if (characters && characters.length > 0) {
        let charRef = "CHARACTER REFERENCE (CONSISTENCY MANDATORY):\n";
        characters.forEach((char, index) => {
             const matches = char.imageData.match(/^data:(.+);base64,(.+)$/);
             if (matches) {
                 parts.push({ inlineData: { mimeType: matches[1], data: matches[2] } });
                 charRef += `- Character named "${char.name}" is shown in [Img ${index + 1}].\n`;
             }
        });
        finalPromptToIA = `${charRef}\n\nFINAL VISUAL PROMPT (NO TEXT ALLOWED):\n${finalPromptToIA}`;
    }
    parts.push({ text: finalPromptToIA });

    const modelName = modelType === 'pro' ? 'gemini-3-pro-image-preview' : 'gemini-2.5-flash-image';
    return retryOperation(async () => {
        const currentAi = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const config: any = { imageConfig: { aspectRatio } };
        if (modelType === 'pro') config.imageConfig.imageSize = '1K';
        const response = await currentAi.models.generateContent({ model: modelName, contents: { parts }, config });
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
        }
        throw new Error("No image generated");
    }, 3, 4000);
};

export const generateSpeech = async (text: string, voiceName: string) => {
    const safeText = text.substring(0, 499);
    return retryOperation(async () => {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-preview-tts',
            contents: { parts: [{ text: safeText }] },
            config: {
                responseModalities: [Modality.AUDIO],
                speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName } } }
            }
        });
        const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
        if (!base64Audio) throw new Error("No audio generated");
        const pcmData = base64ToPCM(base64Audio);
        return { url: URL.createObjectURL(pcmToWav(pcmData, 24000)), duration: pcmData.length / 24000 };
    });
};

export const rewriteNarrations = async (scenes: Scene[], tone: NarrativeTone) => {
    return retryOperation(async () => {
        const res = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Rewrite narrations to tone ${tone}: ${scenes.map(s => `[${s.id}] ${s.narration}`).join('\n')}. JSON array "id", "newText". Each "newText" MUST NOT exceed 499 characters.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.ARRAY,
                    items: { 
                        type: Type.OBJECT, 
                        properties: { 
                            id: { type: Type.STRING }, 
                            newText: { type: Type.STRING, description: "Texto reescrito. MÁXIMO 499 caracteres." } 
                        }, 
                        required: ["id", "newText"] 
                    }
                }
            }
        });
        return JSON.parse(res.text || "[]").map((item: any) => ({
            ...item,
            newText: item.newText?.substring(0, 499)
        }));
    });
};

export const generateMetadata = async (scenes: Scene[]) => {
    return retryOperation(async () => {
        const res = await ai.models.generateContent({
            model: 'gemini-3-pro-preview',
            contents: `Generate SEO metadata: ${scenes.map(s => s.narration).join(' ')}. JSON output "title", "description", "hashtags".`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } },
                    required: ["title", "description", "hashtags"]
                }
            }
        });
        return JSON.parse(res.text || "null");
    });
};
