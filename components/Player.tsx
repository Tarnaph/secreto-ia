
import React, { useState, useEffect, useRef } from 'react';
import { Pause, Play, Type, Download, SkipBack, SkipForward, Loader2, Image as ImageIcon } from 'lucide-react';
import { Scene, SubtitleStyle } from '../types';

interface PlayerProps {
    scenes: Scene[];
    backgroundMusicUrl: string | null;
    aspectRatio: '16:9' | '9:16';
    musicVolume: number;
    subtitleStyle: SubtitleStyle;
    showSubtitles: boolean;
    setShowSubtitles: (show: boolean) => void;
    setSubtitleStyle: (style: SubtitleStyle) => void;
    subtitlePosition: 'bottom' | 'middle' | 'top';
    setSubtitlePosition: (position: 'bottom' | 'middle' | 'top') => void;
}

const Player: React.FC<PlayerProps> = ({ 
    scenes, 
    backgroundMusicUrl, 
    aspectRatio, 
    musicVolume, 
    subtitleStyle, 
    showSubtitles, 
    setShowSubtitles,
    setSubtitleStyle,
    subtitlePosition,
    setSubtitlePosition
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const musicRef = useRef<HTMLAudioElement | null>(null);
  const currentScene = scenes[currentSceneIndex];

  useEffect(() => {
    if (isPlaying) {
        audioRef.current?.play().catch(() => setIsPlaying(false));
        if (backgroundMusicUrl && musicRef.current) {
            musicRef.current.volume = musicVolume;
            musicRef.current.play().catch(() => {});
        }
    } else {
        audioRef.current?.pause();
        musicRef.current?.pause();
    }
  }, [isPlaying, currentSceneIndex]);

  const handleEnded = () => {
    if (currentSceneIndex < scenes.length - 1) {
        setCurrentSceneIndex(prev => prev + 1);
    } else {
        setIsPlaying(false);
        setCurrentSceneIndex(0);
    }
  };

  const aspectRatioClass = aspectRatio === '16:9' ? 'aspect-video' : 'aspect-[9/16] h-[500px]';

  const getSubtitlePositionClasses = () => {
      switch(subtitlePosition) {
          case 'top': return "top-10";
          case 'middle': return "top-1/2 -translate-y-1/2";
          case 'bottom': default: return "bottom-10";
      }
  };

  const getSubtitleStyleClasses = () => {
      switch(subtitleStyle) {
          case SubtitleStyle.CLASSIC:
              return "inline-block text-xl font-bold text-yellow-400 drop-shadow-[2px_2px_0_rgba(0,0,0,1)] px-2 stroke-black";
          case SubtitleStyle.MINIMAL:
              return "inline-block text-lg font-medium text-white/90 drop-shadow-sm bg-black/40 px-4 py-1 rounded-full backdrop-blur-sm";
          case SubtitleStyle.KARAOKE:
              return "inline-block text-2xl font-extrabold text-white drop-shadow-md";
          case SubtitleStyle.MODERN:
          default:
              return "inline-block text-lg font-bold text-white px-6 py-2 bg-black/70 backdrop-blur-md rounded-xl";
      }
  };

  return (
    <div className="flex flex-col w-full max-w-2xl mx-auto sticky top-6">
      <div className={`relative bg-black rounded-2xl overflow-hidden shadow-2xl border border-white/10 ${aspectRatioClass} flex items-center justify-center group`}>
        {currentScene?.imageUrl ? (
            <img src={currentScene.imageUrl} className="w-full h-full object-cover animate-fade-in" />
        ) : (
          <div className="text-gray-800 flex flex-col items-center animate-pulse gap-2">
            <ImageIcon size={40} />
            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-700">Preview</span>
          </div>
        )}

        {showSubtitles && currentScene?.narration && (
            <div className={`absolute left-8 right-8 text-center animate-fade-in z-10 ${getSubtitlePositionClasses()}`}>
                <p className={getSubtitleStyleClasses()}>
                    {currentScene.narration}
                </p>
            </div>
        )}

        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
           <button onClick={() => setIsPlaying(!isPlaying)} className="bg-white/10 backdrop-blur-xl hover:bg-white/20 p-5 rounded-full text-white transition-all transform hover:scale-110 border border-white/20">
             {isPlaying ? <Pause size={32} fill="currentColor" /> : <Play size={32} fill="currentColor" className="ml-1"/>}
           </button>
        </div>
      </div>

      <audio ref={audioRef} src={currentScene?.audioUrl} onEnded={handleEnded} className="hidden"/>
      <audio ref={musicRef} src={backgroundMusicUrl || undefined} loop className="hidden"/>

      <div className="mt-4 bg-[#111] p-4 rounded-xl shadow-sm border border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => setCurrentSceneIndex(Math.max(0, currentSceneIndex - 1))} className="text-gray-500 hover:text-white transition-colors"><SkipBack size={20} /></button>
                <button onClick={() => setIsPlaying(!isPlaying)} className="w-10 h-10 bg-white text-black rounded-full flex items-center justify-center shadow-lg hover:bg-gray-200">{isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-1"/>}</button>
                <button onClick={() => setCurrentSceneIndex(Math.min(scenes.length - 1, currentSceneIndex + 1))} className="text-gray-500 hover:text-white transition-colors"><SkipForward size={20} /></button>
            </div>
            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Cena <span className="text-white">{currentSceneIndex + 1}</span> / {scenes.length}</div>
            <button onClick={() => setShowSubtitles(!showSubtitles)} className={`p-2 rounded-lg transition-colors ${showSubtitles ? 'text-white bg-white/10' : 'text-gray-600 hover:text-gray-400'}`}><Type size={18} /></button>
      </div>
    </div>
  );
};

export default Player;
