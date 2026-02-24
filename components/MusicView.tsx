import React, { useState, useRef, useEffect } from 'react';
import { Music, Volume2, CheckCircle, Pause, Play, Sparkles, Upload, Bot, Disc, Download, AlertCircle, Loader2, RefreshCw, Radio, Clock, Mic2, BarChart3, FileAudio } from 'lucide-react';
import { STOCK_MUSIC, MusicAnalysis } from '../types';
import { analyzeScriptForMusic } from '../services/geminiService';

interface MusicViewProps {
    selectedMusic: string | null;
    onSelectMusic: (url: string | null) => void;
    volume: number;
    setVolume: (vol: number) => void;
}

const MusicView: React.FC<MusicViewProps> = ({ selectedMusic, onSelectMusic, volume, setVolume }) => {
    const [activeTab, setActiveTab] = useState<'ai' | 'library'>('ai');
    
    // AI Input State
    const [scriptInput, setScriptInput] = useState('');
    const [targetDuration, setTargetDuration] = useState<{m: number, s: number}>({ m: 1, s: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Analysis & Generation State
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<MusicAnalysis | null>(null);
    const [generatedTrackId, setGeneratedTrackId] = useState<string | null>(null);

    // Audio Playback
    const [playingPreview, setPlayingPreview] = useState<string | null>(null);
    const [isBuffering, setIsBuffering] = useState(false);
    const [playbackError, setPlaybackError] = useState<string | null>(null);
    const audioRef = useRef<HTMLAudioElement | null>(null);
  
    // Helpers
    const generatedTrack = generatedTrackId ? STOCK_MUSIC.find(t => t.id === generatedTrackId) : null;

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume;
        }
    }, [volume]);

    const togglePreview = async (url: string) => {
      setPlaybackError(null);
      const audio = audioRef.current;
      
      if (!audio) return;

      try {
          if (playingPreview === url && !audio.paused) {
              audio.pause();
              setPlayingPreview(null);
              setIsBuffering(false);
          } else {
              audio.pause();
              setPlayingPreview(url);
              setIsBuffering(true);
              
              audio.src = url;
              audio.volume = volume;
              audio.load();
              
              const playPromise = audio.play();
              if (playPromise !== undefined) {
                  playPromise
                    .then(() => setIsBuffering(false))
                    .catch(error => {
                        console.error("Playback failed (Promise):", error);
                        setPlaybackError("Erro ao reproduzir. Link indisponível.");
                        setPlayingPreview(null);
                        setIsBuffering(false);
                    });
              }
          }
      } catch (error) {
          console.error("System Error:", error);
          setPlaybackError("Erro no sistema de áudio.");
          setPlayingPreview(null);
          setIsBuffering(false);
      }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (ev) => {
                setScriptInput(ev.target?.result as string);
            };
            reader.readAsText(file);
        }
    };

    const handleAnalyze = async () => {
        if (!scriptInput.trim()) {
            alert("Por favor, insira um roteiro ou texto para analisar.");
            return;
        }
        setIsAnalyzing(true);
        setAnalysisResult(null);
        setGeneratedTrackId(null);
        setPlaybackError(null);
        setPlayingPreview(null);
        if (audioRef.current) audioRef.current.pause();
        
        try {
            // 1. Analyze Script
            const analysis = await analyzeScriptForMusic(scriptInput);
            setAnalysisResult(analysis);
            
            // 2. Select Track (Simulating Generation)
            // Add a small delay to simulate processing time
            await new Promise(resolve => setTimeout(resolve, 1500));
            
            const matchingTracks = STOCK_MUSIC.filter(t => t.tags.includes(analysis.suggestedTag));
            const match = matchingTracks.length > 0 
                ? matchingTracks[Math.floor(Math.random() * matchingTracks.length)] 
                : STOCK_MUSIC[0];
                
            setGeneratedTrackId(match.id);

        } catch (e) {
            console.error(e);
            setPlaybackError("Erro na análise da IA.");
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleRegenerateTrack = () => {
        if (!analysisResult) return;
        setPlayingPreview(null);
        if (audioRef.current) audioRef.current.pause();

        // Pick a different track randomly
        const randomTrack = STOCK_MUSIC[Math.floor(Math.random() * STOCK_MUSIC.length)];
        setGeneratedTrackId(randomTrack.id);
    };

    const handleDownload = (url: string) => {
        window.open(url, '_blank');
    };

    return (
      <div className="h-full bg-[#0a0a0a] flex flex-col font-sans overflow-hidden">
        {/* Hidden Audio Element */}
        <audio 
            ref={audioRef} 
            className="hidden" 
            onEnded={() => setPlayingPreview(null)}
            onWaiting={() => setIsBuffering(true)}
            onPlaying={() => setIsBuffering(false)}
            onError={(e) => {
                const target = e.target as HTMLAudioElement;
                console.error("Audio Error:", target.error?.code, target.error?.message);
                setPlayingPreview(null);
                setIsBuffering(false);
                setPlaybackError("Erro no carregamento do áudio.");
            }}
        />

        <div className="flex-1 overflow-y-auto p-8 max-w-5xl mx-auto w-full">
            <h1 className="text-2xl font-black text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                <Music className="text-purple-500" /> Trilha Sonora
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-8">
                <button 
                    onClick={() => setActiveTab('ai')}
                    className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 border
                        ${activeTab === 'ai' 
                            ? 'bg-white text-black border-white' 
                            : 'bg-[#151515] text-gray-400 border-white/10 hover:border-white/30'}
                    `}
                >
                    <Sparkles size={14} /> AI Composer (Lira)
                </button>
                <button 
                    onClick={() => setActiveTab('library')}
                    className={`px-6 py-2.5 rounded-full font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 border
                        ${activeTab === 'library' 
                            ? 'bg-white text-black border-white' 
                            : 'bg-[#151515] text-gray-400 border-white/10 hover:border-white/30'}
                    `}
                >
                    <Radio size={14} /> Biblioteca
                </button>
            </div>

            {playbackError && (
                <div className="mb-6 bg-red-900/20 border border-red-500/30 p-4 rounded-xl flex items-center gap-3 text-red-200 text-sm animate-fade-in">
                    <AlertCircle size={18} />
                    {playbackError}
                </div>
            )}

            {/* AI COMPOSER VIEW */}
            {activeTab === 'ai' && (
                <div className="animate-fade-in">
                    {!analysisResult ? (
                        <div className="bg-[#111] border border-white/10 rounded-3xl p-8 max-w-3xl mx-auto shadow-2xl">
                            <div className="flex justify-between items-center mb-6">
                                <div className="flex items-center gap-3">
                                    <Bot className="text-purple-500" size={24} />
                                    <h2 className="text-lg font-bold text-white tracking-wide">Composition Engine</h2>
                                </div>
                                <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="flex items-center gap-2 px-4 py-2 bg-[#222] hover:bg-[#333] text-gray-300 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors border border-white/5"
                                >
                                    <Upload size={14} /> Upload SRT/TXT
                                </button>
                                <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
                            </div>

                            <textarea
                                value={scriptInput}
                                onChange={(e) => setScriptInput(e.target.value)}
                                placeholder="Cole seu roteiro ou descrição da cena aqui..."
                                className="w-full h-48 bg-[#1a1a1a] border border-white/5 rounded-2xl p-6 text-sm text-gray-200 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none resize-none leading-relaxed transition-all placeholder-gray-600 mb-6"
                            />

                            <div className="flex items-center gap-6 pt-6 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Duração Alvo</span>
                                    <div className="flex items-center gap-2 bg-[#1a1a1a] border border-white/10 rounded-lg p-1">
                                        <div className="flex items-center bg-[#222] rounded px-2 py-1">
                                            <input 
                                                type="number" 
                                                value={targetDuration.m} 
                                                onChange={(e) => setTargetDuration({...targetDuration, m: Number(e.target.value)})}
                                                className="w-8 bg-transparent text-center text-white text-sm font-bold outline-none" 
                                            />
                                            <span className="text-[10px] text-gray-500 font-bold">m</span>
                                        </div>
                                        <div className="flex items-center bg-[#222] rounded px-2 py-1">
                                            <input 
                                                type="number" 
                                                value={targetDuration.s} 
                                                onChange={(e) => setTargetDuration({...targetDuration, s: Number(e.target.value)})}
                                                className="w-8 bg-transparent text-center text-white text-sm font-bold outline-none" 
                                            />
                                            <span className="text-[10px] text-gray-500 font-bold">s</span>
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={handleAnalyze}
                                    disabled={isAnalyzing}
                                    className={`flex-1 py-4 rounded-xl font-black text-sm uppercase tracking-[0.15em] flex items-center justify-center gap-3 transition-all shadow-lg
                                        ${isAnalyzing 
                                            ? 'bg-[#222] text-gray-500 cursor-not-allowed' 
                                            : 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-[1.01] hover:shadow-purple-900/30'}
                                    `}
                                >
                                    {isAnalyzing ? (
                                        <><Loader2 className="animate-spin" size={18} /> Analisando Contexto...</>
                                    ) : (
                                        <><Sparkles size={18} /> Analisar & Gerar</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-fade-in">
                            {/* Dashboard Analysis */}
                            <div className="bg-[#111] border border-white/10 rounded-3xl p-8 flex flex-col gap-6">
                                <div className="flex justify-between items-center">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">Sentiment Analysis</span>
                                    <button onClick={() => setAnalysisResult(null)} className="text-[10px] text-gray-500 hover:text-white underline uppercase font-bold cursor-pointer">Novo Roteiro</button>
                                </div>
                                
                                <div>
                                    <div className="text-[10px] font-bold text-gray-600 uppercase tracking-widest mb-1">Detected Vibe</div>
                                    <div className="text-3xl font-black text-white">{analysisResult.mood}</div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">BPM</div>
                                        <div className="text-xl font-mono font-bold text-white">{analysisResult.bpm}</div>
                                    </div>
                                    <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                                        <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-1">Style Tag</div>
                                        <div className="text-sm font-bold text-gray-300 bg-[#222] inline-block px-2 py-0.5 rounded border border-white/5">#{analysisResult.suggestedTag}</div>
                                    </div>
                                </div>

                                <div>
                                    <div className="text-[9px] font-bold text-gray-600 uppercase tracking-widest mb-2">Instruments</div>
                                    <div className="flex flex-wrap gap-2">
                                        {analysisResult.instruments.map((inst, i) => (
                                            <span key={i} className="text-[10px] font-bold text-purple-300 bg-purple-900/20 px-3 py-1.5 rounded-lg border border-purple-500/20 uppercase tracking-wide">
                                                {inst}
                                            </span>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[#1a1a1a] p-4 rounded-xl border border-white/5">
                                    <div className="text-[9px] font-bold text-gray-500 uppercase tracking-widest mb-2">AI Reasoning</div>
                                    <p className="text-xs text-gray-400 italic leading-relaxed">"{analysisResult.reasoning}"</p>
                                </div>
                            </div>

                            {/* Result Player */}
                            <div className="bg-gradient-to-br from-[#151515] to-black border border-purple-500/30 rounded-3xl p-8 flex flex-col items-center text-center relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-purple-600 to-transparent opacity-50"></div>
                                
                                {generatedTrack && (
                                    <>
                                        <div className={`w-32 h-32 rounded-full border border-purple-500/30 flex items-center justify-center mb-6 relative
                                            ${playingPreview === generatedTrack.url ? 'animate-[spin_4s_linear_infinite]' : ''}
                                        `}>
                                            <div className="absolute inset-0 bg-purple-900/20 rounded-full blur-xl"></div>
                                            <div className="w-28 h-28 bg-[#111] rounded-full flex items-center justify-center relative z-10 border border-white/5">
                                                <Disc size={40} className={`text-purple-500 ${playingPreview === generatedTrack.url ? 'opacity-100' : 'opacity-50'}`} />
                                            </div>
                                            {playingPreview === generatedTrack.url && (
                                                <div className="absolute inset-0 rounded-full border-2 border-purple-500 border-t-transparent animate-spin"></div>
                                            )}
                                        </div>

                                        <h3 className="text-xl font-bold text-white mb-1">{generatedTrack.name}</h3>
                                        <p className="text-[10px] font-bold text-purple-400 uppercase tracking-[0.2em] mb-8">Neural Audio Preview</p>

                                        <div className="w-full space-y-3">
                                            <button 
                                                onClick={() => togglePreview(generatedTrack.url)}
                                                className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-3 transition-all
                                                    ${playingPreview === generatedTrack.url 
                                                        ? 'bg-white text-black hover:bg-gray-200' 
                                                        : 'bg-[#9333ea] text-white hover:bg-[#a855f7] shadow-lg shadow-purple-900/30'}
                                                `}
                                            >
                                                {playingPreview === generatedTrack.url 
                                                    ? <><Pause size={16} fill="currentColor"/> PAUSE PREVIEW</> 
                                                    : <><Play size={16} fill="currentColor"/> PLAY PREVIEW</>
                                                }
                                            </button>

                                            <div className="grid grid-cols-2 gap-3">
                                                <button 
                                                    onClick={() => onSelectMusic(generatedTrack.url)}
                                                    className={`py-3 rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 border transition-all
                                                        ${selectedMusic === generatedTrack.url 
                                                            ? 'bg-green-500/20 text-green-400 border-green-500/50' 
                                                            : 'bg-[#222] text-gray-300 border-white/10 hover:bg-[#333]'}
                                                    `}
                                                >
                                                    {selectedMusic === generatedTrack.url ? <CheckCircle size={14}/> : <FileAudio size={14}/>}
                                                    {selectedMusic === generatedTrack.url ? 'Applied' : 'Apply to Video'}
                                                </button>

                                                <button 
                                                    onClick={() => handleDownload(generatedTrack.url)}
                                                    className="py-3 bg-[#222] text-gray-300 border border-white/10 hover:bg-[#333] rounded-xl font-bold text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 transition-all"
                                                >
                                                    <Download size={14} /> Download
                                                </button>
                                            </div>

                                            <button 
                                                onClick={handleRegenerateTrack}
                                                className="w-full py-2 text-[10px] font-bold text-gray-500 hover:text-white uppercase tracking-wider flex items-center justify-center gap-2 transition-colors mt-2"
                                            >
                                                <RefreshCw size={12} /> Generate Variation
                                            </button>
                                        </div>

                                        {/* Fake Visualizer */}
                                        <div className="flex items-end justify-center gap-1 h-8 mt-6 w-full px-8 opacity-50">
                                            {[...Array(20)].map((_, i) => (
                                                <div 
                                                    key={i} 
                                                    className="w-1 bg-purple-500 rounded-t-sm transition-all duration-100"
                                                    style={{ 
                                                        height: playingPreview === generatedTrack.url ? `${Math.random() * 100}%` : '10%',
                                                        opacity: playingPreview === generatedTrack.url ? 1 : 0.3
                                                    }}
                                                ></div>
                                            ))}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* LIBRARY VIEW */}
            {activeTab === 'library' && (
                <div className="grid grid-cols-1 gap-3 animate-fade-in max-w-4xl mx-auto">
                    <div 
                        onClick={() => onSelectMusic(null)}
                        className={`p-4 rounded-xl border cursor-pointer flex items-center justify-between transition-all group
                        ${selectedMusic === null ? 'border-white bg-[#222]' : 'border-white/5 hover:border-white/20 bg-[#111]'}
                    `}>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-[#0a0a0a] flex items-center justify-center text-gray-500 group-hover:text-white transition-colors">
                                <Volume2 size={20} />
                            </div>
                            <span className="font-bold text-gray-300 text-sm uppercase tracking-wide">No Background Music</span>
                        </div>
                        {selectedMusic === null && <CheckCircle size={24} className="text-white" />}
                    </div>

                    {STOCK_MUSIC.map((track) => (
                        <div 
                            key={track.id}
                            className={`p-4 rounded-xl border flex items-center justify-between transition-all group
                            ${selectedMusic === track.url ? 'border-purple-500 bg-[#1a1a1a]' : 'border-white/5 hover:border-white/20 bg-[#111]'}
                        `}>
                            <div className="flex items-center gap-5">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); togglePreview(track.url); }}
                                    className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-lg
                                        ${playingPreview === track.url 
                                            ? 'bg-purple-600 text-white scale-110' 
                                            : 'bg-white text-black hover:bg-gray-200'}
                                    `}
                                >
                                    {playingPreview === track.url && isBuffering ? (
                                        <Loader2 size={18} className="animate-spin"/>
                                    ) : playingPreview === track.url ? (
                                        <Pause size={18} fill="currentColor"/>
                                    ) : (
                                        <Play size={18} fill="currentColor" className="ml-1"/>
                                    )}
                                </button>
                                <div>
                                    <h4 className={`font-bold text-sm uppercase tracking-wide ${selectedMusic === track.url ? 'text-purple-400' : 'text-white'}`}>{track.name}</h4>
                                    <div className="flex gap-2 mt-2">
                                        {track.tags.slice(0, 3).map(tag => (
                                            <span key={tag} className="text-[9px] font-bold text-gray-500 uppercase tracking-wider bg-[#1a1a1a] px-2 py-0.5 rounded border border-white/5">#{tag}</span>
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center gap-3">
                                 <button 
                                    onClick={(e) => { e.stopPropagation(); handleDownload(track.url); }}
                                    className="w-10 h-10 rounded-full bg-[#1a1a1a] text-gray-500 hover:text-white hover:bg-[#333] border border-white/5 flex items-center justify-center transition-colors"
                                    title="Download Track"
                                >
                                    <Download size={16} />
                                </button>
                                <button 
                                    onClick={() => onSelectMusic(track.url)}
                                    className={`px-5 py-2.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all
                                    ${selectedMusic === track.url 
                                        ? 'bg-white text-black' 
                                        : 'bg-[#1a1a1a] text-gray-400 hover:text-white hover:bg-[#222] border border-white/10'}
                                    `}
                                >
                                    {selectedMusic === track.url ? 'Selected' : 'Use Track'}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Bottom Volume Bar */}
        <div className="bg-[#050505] border-t border-white/10 p-6 flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-4 text-gray-400">
                <Music size={20} />
                <span className="text-xs font-bold uppercase tracking-widest">Master Volume</span>
            </div>
            <div className="flex items-center gap-4 flex-1 max-w-md mx-8">
                <Volume2 size={18} className="text-gray-500" />
                <input 
                    type="range" 
                    min="0" 
                    max="1" 
                    step="0.05" 
                    value={volume} 
                    onChange={(e) => setVolume(parseFloat(e.target.value))}
                    className="w-full h-1.5 bg-[#222] rounded-lg appearance-none cursor-pointer accent-purple-500"
                />
                <span className="text-xs font-mono font-bold text-gray-500 w-10 text-right">{Math.round(volume * 100)}%</span>
            </div>
        </div>
      </div>
    );
};

export default MusicView;