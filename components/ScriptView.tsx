
import React, { useState, useRef } from 'react';
import { Sparkles, PenTool, Clock, Zap, Loader2, Wand2, Upload, FileText, Palette, CheckCircle2, Mic, AudioLines, FileAudio, AlertCircle, Video } from 'lucide-react';
import { Pace, Scene, ImageStyle } from '../types';
import { generateScript, formatScript, generateVisualsForScenes, processAudioToScript, sliceAudioFromFile } from '../services/geminiService';

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
    } catch (e) { }
};

interface ScriptViewProps {
  onGenerate: (scenes: Scene[]) => void;
  isProcessing: boolean;
  setProcessing: (val: boolean) => void;
  imageStyle: ImageStyle;
  setImageStyle: (style: ImageStyle) => void;
}

const PaceSelector: React.FC<{ pace: Pace; setPace: (p: Pace) => void }> = ({ pace, setPace }) => {
    const options: { id: Pace; label: string; sub: string }[] = [
        { id: 'super_slow', label: 'Super Lento', sub: '~30s/cena' },
        { id: 'slow', label: 'Lento', sub: '~20s/cena' },
        { id: 'normal', label: 'Normal', sub: '~12s/cena' },
        { id: 'dynamic', label: 'Dinâmico', sub: '~6s/cena' },
        { id: 'frenetic', label: 'Frenético', sub: '~3s/cena' },
        { id: 'auto', label: 'Auto (IA)', sub: 'Adaptável' },
    ];

    return (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {options.map((opt) => (
                 <button
                    key={opt.id}
                    onClick={() => setPace(opt.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group
                        ${pace === opt.id 
                            ? 'border-white bg-white text-black' 
                            : 'border-white/10 bg-[#151515] text-gray-400 hover:border-white/30 hover:bg-[#202020]'}
                    `}
                >
                    <div className={`font-bold text-xs ${pace === opt.id ? 'text-black' : 'text-gray-200'}`}>
                        {opt.id === 'auto' && <Sparkles size={10} className="inline mr-1 mb-0.5" />}
                        {opt.label}
                    </div>
                    <div className={`text-[10px] mt-1 font-medium ${pace === opt.id ? 'text-gray-600' : 'text-gray-600'}`}>{opt.sub}</div>
                </button>
            ))}
        </div>
    );
};

const ScriptView: React.FC<ScriptViewProps> = ({ onGenerate, isProcessing, setProcessing, imageStyle, setImageStyle }) => {
    const [mode, setMode] = useState<'ai' | 'manual' | 'audio'>('ai');
    const [topic, setTopic] = useState('');
    const [manualText, setManualText] = useState('');
    const [duration, setDuration] = useState<number>(1);
    const [pace, setPace] = useState<Pace>('normal');
    const [useFixedStyle, setUseFixedStyle] = useState(true);
    const [includeVideoPrompts, setIncludeVideoPrompts] = useState(true);
    const [srtFile, setSrtFile] = useState<{name: string, content: string} | null>(null);
    
    // Audio State
    const [audioFile, setAudioFile] = useState<{name: string, content: string, mimeType: string} | null>(null);
    const [audioSegmentDuration, setAudioSegmentDuration] = useState<number>(8);
    const audioInputRef = useRef<HTMLInputElement>(null);
    
    const fileInputRef = useRef<HTMLInputElement>(null);
  
    const handleGenerate = async () => {
      if (!topic.trim()) return;
      setProcessing(true);
      try {
        const generatedScenes = await generateScript(topic, duration, pace, imageStyle, includeVideoPrompts);
        processScenes(generatedScenes);
        playSuccessSound();
      } catch (e) {
        alert("Failed to generate script. Please check logs or try again.");
        console.error(e);
      } finally {
        setProcessing(false);
      }
    };
  
    const parseSRT = (data: string) => {
        const regex = /(\d+)\n(\d{2}:\d{2}:\d{2},\d{3}) --> (\d{2}:\d{2}:\d{2},\d{3})\n([\s\S]*?)(?=\n\n|\n*$)/g;
        const blocks = [];
        let match;

        const timeToSeconds = (timeStr: string) => {
            const [h, m, s_ms] = timeStr.split(':');
            const [s, ms] = s_ms.split(',');
            return parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;
        };

        while ((match = regex.exec(data)) !== null) {
            const start = timeToSeconds(match[2]);
            const end = timeToSeconds(match[3]);
            blocks.push({
                text: match[4].replace(/\n/g, ' ').trim(),
                duration: end - start
            });
        }
        return blocks;
    };

    const groupSRTBlocks = (blocks: {text: string, duration: number}[], targetDuration: number) => {
        const grouped = [];
        let currentGroup = { text: '', duration: 0 };

        for (const block of blocks) {
            if (currentGroup.duration + block.duration > targetDuration && currentGroup.text !== '') {
                grouped.push({ ...currentGroup });
                currentGroup = { text: block.text, duration: block.duration };
            } else {
                currentGroup.text = currentGroup.text ? `${currentGroup.text} ${block.text}` : block.text;
                currentGroup.duration += block.duration;
            }
        }
        if (currentGroup.text) grouped.push(currentGroup);
        return grouped;
    };

    const handleSrtUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const content = event.target?.result as string;
                setSrtFile({ name: file.name, content });
                const blocks = parseSRT(content);
                setManualText(blocks.map(b => b.text).join(' '));
            };
            reader.readAsText(file);
        }
    };

    const handleAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (event) => {
                const result = event.target?.result as string;
                const mimeType = result.match(/[^:]\w+\/[\w-+\d.]+(?=;|,)/)?.[0] || file.type;
                setAudioFile({ name: file.name, content: result, mimeType });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAudioSubmit = async () => {
        if (!audioFile) return;
        setProcessing(true);
        try {
            // 1. Send Audio to Gemini for Transcription & Segmentation
            const segments = await processAudioToScript(audioFile.content, audioFile.mimeType, audioSegmentDuration);
            
            // 2. Generate Visuals (with or without video prompts)
            const scenesWithVisuals = await generateVisualsForScenes(segments, imageStyle, "Audio Transcript", includeVideoPrompts);
            
            // 3. Slice Audio locally to get blobs for each scene
            const slicedAudioUrls = await sliceAudioFromFile(audioFile.content, segments);

            // 4. Combine everything
            const combinedScenes = scenesWithVisuals.map((s, i) => ({
                ...s,
                manualDuration: segments[i].duration,
                audioUrl: slicedAudioUrls[i] || undefined, // Use the sliced audio!
                audioDuration: segments[i].duration
            }));

            processScenes(combinedScenes);
            playSuccessSound();
        } catch (e) {
            console.error(e);
            alert("Erro ao processar áudio.");
        } finally {
            setProcessing(false);
        }
    };

    const handleManualSubmit = async () => {
      if (!manualText.trim()) return;
      setProcessing(true);
      try {
          if (srtFile) {
              const blocks = parseSRT(srtFile.content);
              
              let targetSecs = 12;
              if (pace === 'frenetic') targetSecs = 4;
              if (pace === 'dynamic') targetSecs = 7;
              if (pace === 'slow') targetSecs = 20;
              if (pace === 'super_slow') targetSecs = 35;

              const grouped = groupSRTBlocks(blocks, targetSecs);
              
              const scenesWithVisuals = await generateVisualsForScenes(grouped.map(g => ({
                  narration: g.text,
                  duration: g.duration
              })), imageStyle, undefined, includeVideoPrompts);

              processScenes(scenesWithVisuals.map(s => ({
                  narration: s.narration,
                  visualPrompt: s.visualPrompt,
                  videoPrompt: s.videoPrompt,
                  manualDuration: s.duration
              })));
              playSuccessSound();
          } else {
              const formattedScenes = await formatScript(manualText, pace, imageStyle, includeVideoPrompts);
              processScenes(formattedScenes);
              playSuccessSound();
          }
      } catch (e) {
          alert("Failed to process script. Please try again.");
          console.error(e);
      } finally {
          setProcessing(false);
      }
    };
  
    const processScenes = (scenes: any[]) => {
        const scenesWithIds = scenes.map((s: any) => ({
          ...s,
          id: crypto.randomUUID(),
          imageUrl: undefined,
          useImageAsRef: true
        }));
        onGenerate(scenesWithIds);
    };
  
    const presets = [1, 3, 5];

    const VideoPromptToggle = () => (
        <div 
            className="mt-4 bg-[#151515] border border-white/10 p-3 rounded-xl flex items-center justify-between group cursor-pointer hover:bg-[#1a1a1a] hover:border-white/20 transition-all" 
            onClick={() => setIncludeVideoPrompts(!includeVideoPrompts)}
        >
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg transition-colors ${includeVideoPrompts ? 'bg-white text-black' : 'bg-[#222] text-gray-500'}`}>
                    <Video size={18} />
                </div>
                <div>
                    <p className="text-xs font-bold text-gray-200">Gerar Prompts de Animação (Veo3)</p>
                    <p className="text-[10px] text-gray-500">Cria instruções detalhadas de movimento e câmera.</p>
                </div>
            </div>
            <div className={`w-10 h-5 rounded-full relative transition-colors ${includeVideoPrompts ? 'bg-white' : 'bg-[#333]'}`}>
                <div className={`absolute top-1 w-3 h-3 rounded-full transition-all ${includeVideoPrompts ? 'right-1 bg-black' : 'left-1 bg-gray-500'}`} />
            </div>
        </div>
    );
  
    return (
      <div className="h-full p-8 overflow-y-auto">
        <div className="max-w-2xl">
          <h2 className="text-2xl font-bold text-white mb-6 font-marker tracking-widest">CRIADOR DE ROTEIRO</h2>
          
          <div className="flex p-1 bg-[#151515] border border-white/10 rounded-xl mb-8 w-fit">
              <button
                  onClick={() => setMode('ai')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'ai' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <Sparkles size={16} />
                  IA Creator
              </button>
              <button
                  onClick={() => setMode('manual')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'manual' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <PenTool size={16} />
                  Manual / SRT
              </button>
              <button
                  onClick={() => setMode('audio')}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all flex items-center gap-2
                  ${mode === 'audio' ? 'bg-white text-black shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
              >
                  <Mic size={16} />
                  Áudio Input
              </button>
          </div>
  
          {mode === 'ai' && (
              <div className="space-y-8 animate-fade-in">
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Tópico do Vídeo</label>
                      <input
                          type="text"
                          value={topic}
                          onChange={(e) => setTopic(e.target.value)}
                          placeholder="Ex: A origem secreta da internet..."
                          className="w-full p-4 bg-[#151515] border border-white/10 rounded-xl focus:ring-1 focus:ring-white focus:border-transparent outline-none transition-all text-white placeholder-gray-600"
                      />
                  </div>
  
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Palette size={16} />
                          Estilo Visual
                      </label>
                      <select 
                          value={imageStyle}
                          onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                          className="w-full p-3 bg-[#151515] border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none text-gray-200"
                      >
                          {Object.values(ImageStyle).map(style => (
                              <option key={style} value={style}>{style}</option>
                          ))}
                      </select>
                      
                      <VideoPromptToggle />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Clock size={16} />
                          Duração
                      </label>
                      <div className="flex flex-wrap items-center gap-3">
                          {presets.map(min => (
                              <button
                                  key={min}
                                  onClick={() => setDuration(min)}
                                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all
                                      ${duration === min 
                                          ? 'bg-white text-black border border-white shadow-sm' 
                                          : 'bg-[#151515] border border-white/10 text-gray-400 hover:bg-[#202020]'}
                                  `}
                              >
                                  {min} min
                              </button>
                          ))}
                          
                          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${!presets.includes(duration) ? 'bg-white border-white' : 'bg-[#151515] border-white/10'}`}>
                              <input 
                                  type="number" 
                                  min="1" 
                                  max="60" 
                                  value={duration} 
                                  onChange={(e) => setDuration(Math.max(1, Math.min(60, Number(e.target.value))))}
                                  className={`w-10 text-sm font-bold outline-none bg-transparent text-center ${!presets.includes(duration) ? 'text-black' : 'text-gray-400'}`}
                              />
                              <span className={`text-[10px] font-bold uppercase select-none ${!presets.includes(duration) ? 'text-black' : 'text-gray-600'}`}>min</span>
                          </div>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Zap size={16} />
                          Ritmo
                      </label>
                      <PaceSelector pace={pace} setPace={setPace} />
                  </div>
  
                  <div className="pt-4">
                      <button
                          onClick={handleGenerate}
                          disabled={isProcessing || !topic}
                          className={`
                              w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold uppercase tracking-widest shadow-lg
                              transition-all transform hover:scale-[1.02] active:scale-95
                              ${isProcessing || !topic ? 'bg-[#222] text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}
                          `}
                      >
                          {isProcessing ? (
                              <>
                                  <Loader2 className="animate-spin" size={20} />
                                  <span>Processando...</span>
                              </>
                          ) : (
                              <>
                                  <Wand2 size={20} />
                                  <span>Gerar Roteiro</span>
                              </>
                          )}
                      </button>
                  </div>
              </div>
          )}
          
          {mode === 'manual' && (
              <div className="space-y-8 animate-fade-in">
                  <div className="flex justify-between items-end">
                      <p className="text-gray-500 text-sm max-w-xs">Cole seu roteiro ou importe um arquivo .srt.</p>
                      
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-[#151515] text-white rounded-lg text-sm font-semibold hover:bg-[#222] transition-colors border border-white/10"
                      >
                        <Upload size={16} />
                        Importar SRT
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        accept=".srt" 
                        className="hidden" 
                        onChange={handleSrtUpload} 
                      />
                  </div>

                  {srtFile && (
                      <div className="flex items-center gap-2 bg-[#0d2e1a] border border-[#165a30] p-3 rounded-lg animate-fade-in">
                          <FileText size={16} className="text-green-400" />
                          <div className="flex-1">
                              <p className="text-xs font-bold text-green-400">Arquivo: {srtFile.name}</p>
                              <p className="text-[10px] text-green-600">Sincronização de tempo mantida.</p>
                          </div>
                          <button onClick={() => {setSrtFile(null); setManualText('');}} className="text-green-400 hover:text-white"><Zap size={14} /></button>
                      </div>
                  )}
  
                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-2 uppercase tracking-wide">Seu Roteiro</label>
                      <textarea
                          value={manualText}
                          onChange={(e) => setManualText(e.target.value)}
                          placeholder="Cole seu texto aqui..."
                          className="w-full h-40 p-4 bg-[#151515] border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none resize-none text-white placeholder-gray-600"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Palette size={16} />
                          Estilo Visual
                      </label>
                      <select 
                          value={imageStyle}
                          onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                          className="w-full p-3 bg-[#151515] border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none text-gray-200"
                      >
                          {Object.values(ImageStyle).map(style => (
                              <option key={style} value={style}>{style}</option>
                          ))}
                      </select>

                      <VideoPromptToggle />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Zap size={16} />
                          Agrupamento de Cenas
                      </label>
                      <PaceSelector pace={pace} setPace={setPace} />
                  </div>
  
                  <div className="pt-4">
                      <button
                          onClick={handleManualSubmit}
                          disabled={isProcessing || !manualText}
                          className={`
                              w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold uppercase tracking-widest shadow-lg
                              transition-all transform hover:scale-[1.02] active:scale-95
                              ${isProcessing || !manualText ? 'bg-[#222] text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}
                          `}
                      >
                          {isProcessing ? (
                              <>
                                  <Loader2 className="animate-spin" size={20} />
                                  <span>Gerando...</span>
                              </>
                          ) : (
                              <>
                                  <Wand2 size={20} />
                                  <span>Converter em Cenas</span>
                              </>
                          )}
                      </button>
                  </div>
              </div>
          )}

          {mode === 'audio' && (
              <div className="space-y-8 animate-fade-in">
                  <div>
                      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 text-center">
                           <div className="w-16 h-16 bg-[#222] rounded-full flex items-center justify-center mx-auto mb-4 text-white">
                               {audioFile ? <FileAudio size={32} /> : <AudioLines size={32} />}
                           </div>
                           <h3 className="text-lg font-bold text-white mb-2">Importar Narração</h3>
                           <p className="text-sm text-gray-500 mb-6 max-w-sm mx-auto">
                               A IA irá transcrever, segmentar e fatiar seu áudio automaticamente.
                           </p>

                           <input 
                               type="file" 
                               ref={audioInputRef} 
                               className="hidden" 
                               accept="audio/*"
                               onChange={handleAudioUpload} 
                           />

                           {audioFile ? (
                               <div className="flex items-center justify-center gap-3 bg-[#1a1a1a] p-3 rounded-xl border border-white/10 inline-flex shadow-sm">
                                   <div className="flex flex-col text-left">
                                        <span className="text-xs font-bold text-white truncate max-w-[200px]">{audioFile.name}</span>
                                        <span className="text-[10px] text-green-400 uppercase font-bold">Pronto</span>
                                   </div>
                                   <button 
                                      onClick={() => setAudioFile(null)}
                                      className="p-1.5 hover:bg-[#333] rounded-full text-gray-400"
                                   >
                                      <CheckCircle2 size={16} className="text-green-400" />
                                   </button>
                               </div>
                           ) : (
                               <button 
                                   onClick={() => audioInputRef.current?.click()}
                                   className="bg-white text-black px-6 py-3 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center gap-2 mx-auto"
                               >
                                   <Upload size={16} /> Selecionar Arquivo
                               </button>
                           )}
                      </div>
                  </div>

                  <div className="bg-[#111] p-6 rounded-xl border border-white/10 shadow-sm">
                       <label className="block text-sm font-bold text-gray-300 mb-2 flex items-center gap-2">
                           <Clock size={16} />
                           Duração por Cena (Alvo)
                       </label>
                       <div className="flex items-center gap-4 mb-2">
                           <input 
                               type="range" 
                               min="4" 
                               max="30" 
                               step="1"
                               value={audioSegmentDuration}
                               onChange={(e) => setAudioSegmentDuration(Number(e.target.value))}
                               className="w-full h-2 bg-[#333] rounded-lg appearance-none cursor-pointer accent-white"
                           />
                           <div className="w-16 text-center font-mono font-bold text-lg text-white bg-[#222] rounded-lg py-1 border border-white/10">
                               {audioSegmentDuration}s
                           </div>
                       </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-400 mb-3 flex items-center gap-2 uppercase tracking-wide">
                          <Palette size={16} />
                          Estilo Visual
                      </label>
                      <select 
                          value={imageStyle}
                          onChange={(e) => setImageStyle(e.target.value as ImageStyle)}
                          className="w-full p-3 bg-[#151515] border border-white/10 rounded-xl focus:ring-1 focus:ring-white outline-none text-gray-200"
                      >
                          {Object.values(ImageStyle).map(style => (
                              <option key={style} value={style}>{style}</option>
                          ))}
                      </select>

                      <VideoPromptToggle />
                  </div>

                  <div className="pt-4">
                      <button
                          onClick={handleAudioSubmit}
                          disabled={isProcessing || !audioFile}
                          className={`
                              w-full flex items-center justify-center gap-3 py-4 px-6 rounded-xl font-bold uppercase tracking-widest shadow-lg
                              transition-all transform hover:scale-[1.02] active:scale-95
                              ${isProcessing || !audioFile ? 'bg-[#222] text-gray-500 cursor-not-allowed' : 'bg-white text-black hover:bg-gray-200'}
                          `}
                      >
                          {isProcessing ? (
                              <>
                                  <Loader2 className="animate-spin" size={20} />
                                  <span>Processando Áudio...</span>
                              </>
                          ) : (
                              <>
                                  <Wand2 size={20} />
                                  <span>Gerar Cenas</span>
                              </>
                          )}
                      </button>
                  </div>
              </div>
          )}
        </div>
      </div>
    );
};

export default ScriptView;
