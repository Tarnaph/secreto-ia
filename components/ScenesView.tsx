
import React, { useState, useRef, useEffect } from 'react';
import { Loader2, Edit3, Sparkles, Play, Pause, Mic, Clock, AlertCircle, Image as ImageIcon, Crown, User, X, Copy, Check, Plus, Trash2, Pencil, FileAudio, Download, FileText, RefreshCcw, Archive, Video } from 'lucide-react';
import { Scene, ImageStyle, NarrativeTone, ImageModelType, Character } from '../types';
import { generateImage, generateSpeech, rewriteNarrations } from '../services/geminiService';

interface ScenesViewProps {
    scenes: Scene[];
    setScenes: React.Dispatch<React.SetStateAction<Scene[]>>;
    characters: Character[];
    setCharacters: React.Dispatch<React.SetStateAction<Character[]>>;
    selectedVoice: string;
    aspectRatio: '16:9' | '9:16';
    imageStyle: ImageStyle;
    setImageStyle: (style: ImageStyle) => void;
    imageModel: ImageModelType;
    setImageModel: (model: ImageModelType) => void;
}

const playSuccessSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); // C6
        
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);

        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);

        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
        console.warn("Audio Context not allowed without user gesture first.");
    }
};

const PromptControl: React.FC<{ label: string; value: string; onChange: (val: string) => void }> = ({ label, value, onChange }) => {
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        navigator.clipboard.writeText(value);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };
    return (
        <div className="group/prompt">
            <div className="flex items-center justify-between mb-1">
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wider">{label}</label>
                <button onClick={handleCopy} className={`p-1 rounded transition-colors flex items-center gap-1 text-[10px] uppercase font-bold ${copied ? 'text-green-400' : 'text-gray-500 hover:text-white'}`}>
                    {copied ? <Check size={10} /> : <Copy size={10} />}
                    {copied && <span>Copiado</span>}
                </button>
            </div>
            <textarea
                className="w-full text-xs text-gray-300 border border-white/5 hover:border-white/20 focus:border-white focus:bg-[#0a0a0a] focus:ring-1 focus:ring-white rounded-lg p-2 resize-y bg-[#151515] transition-all min-h-[60px]"
                rows={3}
                value={value}
                onChange={(e) => onChange(e.target.value)}
            />
        </div>
    );
};

const ScenesView: React.FC<ScenesViewProps> = ({ scenes, setScenes, characters, setCharacters, selectedVoice, aspectRatio, imageStyle, setImageStyle, imageModel, setImageModel }) => {
    const [isBulkGenerating, setIsBulkGenerating] = useState(false);
    const [isZipping, setIsZipping] = useState(false);
    
    // Audio Playback State
    const [activeSceneId, setActiveSceneId] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const currentAudioRef = useRef<HTMLAudioElement | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cleanup audio on unmount
    useEffect(() => {
        return () => {
            if (currentAudioRef.current) {
                currentAudioRef.current.pause();
                currentAudioRef.current = null;
            }
        };
    }, []);

    const toggleAudio = (sceneId: string, audioUrl: string) => {
        if (activeSceneId === sceneId) {
            if (currentAudioRef.current) {
                if (isPlaying) {
                    currentAudioRef.current.pause();
                    setIsPlaying(false);
                } else {
                    currentAudioRef.current.play().catch(console.error);
                    setIsPlaying(true);
                }
            }
            return;
        }
        
        if (currentAudioRef.current) {
            currentAudioRef.current.pause();
            currentAudioRef.current.currentTime = 0;
        }

        const audio = new Audio(audioUrl);
        currentAudioRef.current = audio;
        setActiveSceneId(sceneId);
        setIsPlaying(true);

        audio.play().catch(err => {
            console.error("Error playing audio:", err);
            setIsPlaying(false);
        });

        audio.onended = () => {
            setIsPlaying(false);
        };
    };

    const updateScene = (id: string, updates: Partial<Scene>) => {
      setScenes(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    };

    const handleCharacterUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const imageData = event.target?.result as string;
                setCharacters([...characters, { id: crypto.randomUUID(), name: `Personagem ${characters.length + 1}`, imageData }]);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDownloadPromptsTxt = (type: 'visual' | 'video' = 'visual') => {
        if (scenes.length === 0) return;
        const content = scenes
            .map(s => type === 'video' ? s.videoPrompt : s.visualPrompt)
            .filter(t => t && t.trim().length > 0)
            .join('\n\n');
        
        if (!content) {
            alert(`Nenhum prompt de ${type === 'video' ? 'vídeo' : 'imagem'} encontrado.`);
            return;
        }

        const blob = new Blob([content], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${type === 'video' ? 'animacao_veo' : 'imagem_midjourney'}_prompts_${Date.now()}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleDownloadImagesZip = async () => {
        const imagesToDownload = scenes.filter(s => s.imageUrl);
        if (imagesToDownload.length === 0) {
            alert("Nenhuma imagem gerada para baixar.");
            return;
        }

        setIsZipping(true);
        try {
            // @ts-ignore
            if (!window.JSZip) {
                alert("Erro: Biblioteca JSZip não carregada.");
                return;
            }
            // @ts-ignore
            const zip = new window.JSZip();
            const folder = zip.folder("imagens_geradas");

            scenes.forEach((scene, index) => {
                if (scene.imageUrl) {
                    const base64Data = scene.imageUrl.split(',')[1];
                    if (base64Data) {
                        const fileName = `cena_${(index + 1).toString().padStart(3, '0')}.png`;
                        folder.file(fileName, base64Data, { base64: true });
                    }
                }
            });

            const content = await zip.generateAsync({ type: "blob" });
            const url = URL.createObjectURL(content);
            const a = document.createElement('a');
            a.href = url;
            a.download = `imagens_algoritmo_${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error("Erro ao gerar ZIP:", error);
            alert("Ocorreu um erro ao compactar as imagens.");
        } finally {
            setIsZipping(false);
        }
    };

    const handleGenerateImage = async (scene: Scene) => {
      if (scene.isGeneratingImage) return;
      updateScene(scene.id, { isGeneratingImage: true, error: undefined });
      try {
          const imageUrl = await generateImage(scene.visualPrompt, aspectRatio, imageStyle, imageModel, characters);
          updateScene(scene.id, { imageUrl, isGeneratingImage: false });
      } catch (e: any) {
          updateScene(scene.id, { isGeneratingImage: false, error: e?.message || "Erro ao gerar imagem" });
      }
    };

    const handleGenerateAudio = async (scene: Scene) => {
      if (scene.isGeneratingAudio) return;
      updateScene(scene.id, { isGeneratingAudio: true, error: undefined });
      try {
          const { url, duration } = await generateSpeech(scene.narration, selectedVoice);
          updateScene(scene.id, { audioUrl: url, audioDuration: duration, isGeneratingAudio: false });
      } catch (e: any) {
          updateScene(scene.id, { isGeneratingAudio: false, error: e?.message || "Erro ao gerar áudio" });
      }
    };

    const handleGenerateAllImagesSequentially = async () => {
        setIsBulkGenerating(true);
        for (const scene of scenes) {
            if (!scene.imageUrl) {
                await handleGenerateImage(scene);
            }
        }
        setIsBulkGenerating(false);
        playSuccessSound();
    };

    const handleMagicGenerate = async () => {
        setIsBulkGenerating(true);
        const tasks: (() => Promise<void>)[] = [];
        scenes.forEach(scene => {
            if (!scene.audioUrl) tasks.push(() => handleGenerateAudio(scene));
            if (!scene.imageUrl) tasks.push(() => handleGenerateImage(scene));
        });
        for (let i = 0; i < tasks.length; i += 3) {
            await Promise.all(tasks.slice(i, i + 3).map(t => t()));
        }
        setIsBulkGenerating(false);
        playSuccessSound(); // Dispara o som ao terminar todas as tarefas
    };

    return (
      <div className="h-full flex flex-col bg-[#0a0a0a]">
          <div className="px-8 py-4 border-b border-white/10 bg-[#0a0a0a] sticky top-0 z-10 space-y-4 shadow-sm">
              <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold text-white font-marker tracking-widest">CENAS</h2>
                  <div className="flex gap-2">
                      <button 
                        onClick={handleDownloadImagesZip} 
                        disabled={isZipping}
                        className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151515] border border-white/10 text-gray-300 font-medium text-xs hover:bg-[#202020] hover:text-white transition-all disabled:opacity-50"
                      >
                        {isZipping ? <Loader2 size={14} className="animate-spin" /> : <Archive size={14}/>}
                        <span>{isZipping ? 'Compactando...' : 'ZIP'}</span>
                      </button>

                      <div className="flex gap-1 border border-white/10 rounded-full p-0.5 bg-[#151515]">
                        <button 
                            onClick={() => handleDownloadPromptsTxt('visual')} 
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#0a0a0a] shadow-sm text-gray-200 font-bold text-[10px] hover:text-white uppercase"
                        >
                            <FileText size={12}/>
                            <span>Img</span>
                        </button>
                        <button 
                            onClick={() => handleDownloadPromptsTxt('video')} 
                            className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-transparent text-gray-500 font-bold text-[10px] hover:bg-[#0a0a0a] hover:text-white transition-all uppercase"
                        >
                            <Video size={12}/>
                            <span>Veo</span>
                        </button>
                      </div>

                      <button onClick={handleGenerateAllImagesSequentially} disabled={isBulkGenerating} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${isBulkGenerating ? 'bg-[#333] text-gray-500' : 'bg-white text-black hover:bg-gray-200'}`}>
                          {isBulkGenerating ? <Loader2 size={14} className="animate-spin"/> : <ImageIcon size={14} />}
                          <span>Gerar Imagens</span>
                      </button>

                      <button onClick={handleMagicGenerate} disabled={isBulkGenerating} className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-bold text-xs uppercase tracking-wider shadow-lg transition-all ${isBulkGenerating ? 'bg-[#333] text-gray-500' : 'bg-white text-black hover:bg-gray-200'}`}>
                          {isBulkGenerating ? <Loader2 size={14} className="animate-spin"/> : <Sparkles size={14} />}
                          <span>Gerar Tudo</span>
                      </button>
                  </div>
              </div>
              <div className="flex flex-wrap items-center gap-4 text-sm">
                  <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-bold text-[10px] uppercase">Estilo:</span>
                      <select value={imageStyle} onChange={(e) => setImageStyle(e.target.value as ImageStyle)} className="bg-[#151515] border border-white/5 rounded-lg py-1.5 px-3 text-gray-300 outline-none text-xs">
                          {Object.values(ImageStyle).map(style => <option key={style} value={style}>{style}</option>)}
                      </select>
                  </div>
                  <div className="flex items-center gap-2">
                      <span className="text-gray-500 font-bold text-[10px] uppercase">Modelo:</span>
                      <div className="bg-[#151515] rounded-lg p-1 flex border border-white/5">
                        <button onClick={() => setImageModel('standard')} className={`px-3 py-1 text-[10px] rounded-md font-bold uppercase ${imageModel === 'standard' ? 'bg-white text-black shadow' : 'text-gray-500'}`}>Standard</button>
                        <button onClick={() => setImageModel('pro')} className={`px-3 py-1 text-[10px] rounded-md font-bold uppercase flex items-center gap-1 ${imageModel === 'pro' ? 'bg-[#333] text-white shadow' : 'text-gray-500'}`}><Crown size={10} /> Pro</button>
                      </div>
                  </div>
                  <div className="flex items-center gap-2 border-l border-white/10 pl-4">
                      <span className="text-gray-500 font-bold text-[10px] uppercase">Ref:</span>
                      <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleCharacterUpload} />
                      <button onClick={() => fileInputRef.current?.click()} className="p-1.5 bg-[#151515] hover:bg-[#222] rounded-full text-gray-400 border border-white/5"><Plus size={14}/></button>
                      <div className="flex -space-x-2">
                          {characters.map(char => <img key={char.id} src={char.imageData} className="w-6 h-6 rounded-full border border-[#0a0a0a] object-cover opacity-80" title={char.name} />)}
                      </div>
                  </div>
              </div>
          </div>
  
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
              {scenes.map((scene, index) => (
                  <div key={scene.id} className={`bg-[#121212] rounded-xl border p-4 flex gap-6 group hover:border-white/20 transition-all ${scene.error ? 'border-red-900/50 bg-red-900/10' : 'border-white/5'}`}>
                      <div className="text-xs font-bold text-gray-600 w-6 pt-2 font-mono">{(index + 1).toString().padStart(2, '0')}</div>
                        <div className="flex-1 space-y-4">
                            <div className="relative">
                                <textarea 
                                    className={`w-full text-sm font-medium bg-transparent border-none focus:ring-0 p-0 resize-none placeholder-gray-700 ${scene.narration.length > 499 ? 'text-red-500' : 'text-gray-200'}`} 
                                    rows={2} 
                                    value={scene.narration} 
                                    onChange={(e) => updateScene(scene.id, { narration: e.target.value })} 
                                    placeholder="Texto da narração..."
                                />
                                <div className={`absolute -bottom-4 right-0 text-[9px] font-bold uppercase tracking-widest ${scene.narration.length > 499 ? 'text-red-500 animate-pulse' : 'text-gray-600'}`}>
                                    {scene.narration.length}/499
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {scene.audioUrl ? (
                                <button 
                                    onClick={() => toggleAudio(scene.id, scene.audioUrl!)} 
                                    className={`flex items-center gap-2 text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg transition-colors border
                                        ${activeSceneId === scene.id 
                                            ? (isPlaying ? 'bg-white text-black border-white' : 'bg-green-900/20 text-green-400 border-green-900/30')
                                            : 'bg-[#1a1a1a] text-gray-400 border-white/5 hover:text-white'}
                                    `}
                                >
                                    {activeSceneId === scene.id && isPlaying ? <Pause size={10} fill="currentColor" /> : <Play size={10} fill="currentColor" className="ml-1"/>}
                                    {activeSceneId === scene.id ? (isPlaying ? 'Pausar' : 'Tocando') : 'Ouvir'}
                                </button>
                              ) : (
                                <button onClick={() => handleGenerateAudio(scene)} className="text-[10px] font-bold uppercase px-3 py-1.5 rounded-lg bg-[#1a1a1a] text-gray-500 hover:bg-[#222] hover:text-white border border-white/5">
                                    {scene.isGeneratingAudio ? <Loader2 size={10} className="animate-spin"/> : <Mic size={10} />} 
                                    Gerar Voz
                                </button>
                              )}
                          </div>
                          <PromptControl 
                             label="Imagem (Midjourney)" 
                             value={scene.visualPrompt} 
                             onChange={(val) => updateScene(scene.id, { visualPrompt: val })} 
                          />
                          {scene.videoPrompt && (
                              <PromptControl 
                                label="Animação (Veo3)" 
                                value={scene.videoPrompt} 
                                onChange={(val) => updateScene(scene.id, { videoPrompt: val })} 
                             />
                          )}
                      </div>
                      <div className="w-64 flex-shrink-0">
                          <div className="relative aspect-video bg-[#050505] rounded-xl overflow-hidden border border-white/5 group/image shadow-lg">
                              {scene.imageUrl ? <img src={scene.imageUrl} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" /> : <div className="w-full h-full flex flex-col items-center justify-center text-gray-700 gap-2">{scene.isGeneratingImage ? <Loader2 className="animate-spin text-white" size={24} /> : <ImageIcon size={32} />} <span className="text-[9px] font-bold uppercase tracking-widest opacity-50">{scene.isGeneratingImage ? 'Gerando...' : 'Vazio'}</span></div>}
                              {!scene.imageUrl && !scene.isGeneratingImage && <button onClick={() => handleGenerateImage(scene)} className="absolute inset-0 bg-white/5 opacity-0 hover:opacity-100 flex items-center justify-center transition-opacity"><Plus size={24} className="text-gray-400"/></button>}
                              {scene.imageUrl && <button onClick={() => handleGenerateImage(scene)} className="absolute bottom-2 right-2 p-2 bg-black/80 backdrop-blur rounded-lg shadow-sm text-gray-400 opacity-0 group-hover/image:opacity-100 hover:text-white transition-all"><RefreshCcw size={14}/></button>}
                          </div>
                          {scene.error && <div className="mt-2 text-[9px] text-red-500 font-bold flex items-center gap-1 uppercase tracking-wide"><AlertCircle size={10} /> {scene.error}</div>}
                      </div>
                  </div>
              ))}
          </div>
      </div>
    );
};

export default ScenesView;
