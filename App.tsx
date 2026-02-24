
import React, { useState, useEffect } from 'react';
import { PanelRightClose, PanelRightOpen, MonitorPlay, Zap } from 'lucide-react';
import Sidebar from './components/Sidebar';
import ScriptView from './components/ScriptView';
import ScenesView from './components/ScenesView';
import MetadataView from './components/MetadataView';
import MusicView from './components/MusicView';
import Player from './components/Player';
import SrtConverterView from './components/SrtConverterView';
import { AppView, Scene, AVAILABLE_VOICES, ImageStyle, SubtitleStyle, ImageModelType, Character } from './types';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<AppView>(AppView.SCRIPT);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [characters, setCharacters] = useState<Character[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [backgroundMusic, setBackgroundMusic] = useState<string | null>(null);
  const [musicVolume, setMusicVolume] = useState<number>(0.2);
  const [selectedVoice, setSelectedVoice] = useState(AVAILABLE_VOICES[0].name);
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16'>('16:9');
  const [imageStyle, setImageStyle] = useState<ImageStyle>(ImageStyle.CINEMATIC);
  const [imageModel, setImageModel] = useState<ImageModelType>('standard');
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStyle>(SubtitleStyle.MODERN);
  const [showSubtitles, setShowSubtitles] = useState(true);
  const [subtitlePosition, setSubtitlePosition] = useState<'bottom' | 'middle' | 'top'>('bottom');

  // Preview Toggle State
  const [showPreview, setShowPreview] = useState(true);

  const handleScriptGenerated = (newScenes: Scene[]) => {
    setScenes(newScenes);
    setCurrentView(AppView.SCENES);
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
      />
      
      <main className="flex-1 flex overflow-hidden">
        <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a0a] border-r border-white/10 relative z-0">
           
           <header className="h-16 border-b border-white/10 flex items-center justify-between px-8 flex-shrink-0 bg-black/50 backdrop-blur-md">
                <div className="flex items-center gap-4">
                   <div className="flex items-center gap-2">
                      <div className="text-white font-marker text-2xl tracking-widest leading-none">
                         ALGORITMO <span className="text-sm font-sans lowercase font-light tracking-normal opacity-80">secreto™</span>
                      </div>
                   </div>
                   
                   <button 
                    onClick={() => setShowPreview(!showPreview)}
                    className={`ml-6 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all
                        ${showPreview ? 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white' : 'bg-white text-black shadow-lg shadow-white/10'}
                    `}
                    title={showPreview ? "Esconder Preview" : "Mostrar Preview"}
                   >
                     {showPreview ? <PanelRightClose size={16} /> : <PanelRightOpen size={16} />}
                     <span>{showPreview ? "Ocultar" : "Preview"}</span>
                   </button>
                </div>

                <div className="flex items-center gap-4">
                    <div className="relative group">
                      <select 
                          value={selectedVoice}
                          onChange={(e) => setSelectedVoice(e.target.value)}
                          className="text-sm bg-[#1a1a1a] border border-white/10 rounded-lg py-1.5 px-3 pr-8 focus:ring-1 focus:ring-white focus:border-white outline-none cursor-pointer min-w-[200px] text-gray-200"
                          title="Selecione a Voz"
                      >
                          <optgroup label="Vozes Masculinas" className="bg-black text-gray-300">
                            {AVAILABLE_VOICES.filter(v => v.gender === 'Male').map(v => (
                                <option key={v.name} value={v.name}>{v.name} - {v.description}</option>
                            ))}
                          </optgroup>
                          <optgroup label="Vozes Femininas" className="bg-black text-gray-300">
                            {AVAILABLE_VOICES.filter(v => v.gender === 'Female').map(v => (
                                <option key={v.name} value={v.name}>{v.name} - {v.description}</option>
                            ))}
                          </optgroup>
                      </select>
                    </div>

                    <select 
                        value={aspectRatio}
                        onChange={(e) => setAspectRatio(e.target.value as any)}
                        className="text-sm bg-[#1a1a1a] border border-white/10 rounded-lg py-1.5 px-3 focus:ring-1 focus:ring-white outline-none cursor-pointer text-gray-200"
                        title="Aspect Ratio"
                    >
                        <option value="16:9">16:9 (Horizontal)</option>
                        <option value="9:16">9:16 (Vertical)</option>
                    </select>
                </div>
           </header>

           <div className="flex-1 overflow-hidden relative">
             {currentView === AppView.SRT_CONVERTER && (
                 <SrtConverterView />
             )}
             {currentView === AppView.SCRIPT && (
               <ScriptView 
                  onGenerate={handleScriptGenerated} 
                  isProcessing={isProcessing} 
                  setProcessing={setIsProcessing} 
                  imageStyle={imageStyle}
                  setImageStyle={setImageStyle}
                />
             )}
             {currentView === AppView.SCENES && (
               <ScenesView 
                  scenes={scenes} 
                  setScenes={setScenes} 
                  characters={characters}
                  setCharacters={setCharacters}
                  selectedVoice={selectedVoice}
                  aspectRatio={aspectRatio}
                  imageStyle={imageStyle}
                  setImageStyle={setImageStyle}
                  imageModel={imageModel}
                  setImageModel={setImageModel}
               />
             )}
             {currentView === AppView.MUSIC && (
                <MusicView 
                    selectedMusic={backgroundMusic} 
                    onSelectMusic={setBackgroundMusic}
                    volume={musicVolume}
                    setVolume={setMusicVolume}
                />
             )}
             {currentView === AppView.METADATA && (
                 <MetadataView scenes={scenes} />
             )}
             {currentView === AppView.MEDIA && (
                 <div className="h-full flex items-center justify-center">
                    <div className="text-center text-gray-600">
                        <Zap size={48} className="mx-auto mb-4 opacity-20" />
                        <p>Biblioteca de mídia em desenvolvimento.</p>
                    </div>
                 </div>
             )}
           </div>
        </div>

        {/* Preview Panel */}
        <div 
            className={`
                bg-black p-6 flex flex-col items-center overflow-y-auto flex-shrink-0 border-l border-white/10 transition-all duration-300 ease-in-out
                ${showPreview ? 'w-[480px] opacity-100' : 'w-0 p-0 opacity-0 border-none overflow-hidden'}
            `}
        >
           {showPreview && (
             <>
               <div className="w-full flex justify-between items-center mb-6 min-w-[432px]">
                  <h3 className="font-bold text-white flex items-center gap-2 tracking-wide">
                    <MonitorPlay size={18} />
                    Preview
                  </h3>
                  <span className="text-[10px] text-gray-500 font-bold bg-white/5 px-2 py-1 rounded border border-white/10 uppercase tracking-widest">Auto Save</span>
               </div>
               
               <Player 
                  scenes={scenes} 
                  backgroundMusicUrl={backgroundMusic} 
                  aspectRatio={aspectRatio}
                  musicVolume={musicVolume}
                  subtitleStyle={subtitleStyle}
                  showSubtitles={showSubtitles}
                  setShowSubtitles={setShowSubtitles}
                  setSubtitleStyle={setSubtitleStyle}
                  subtitlePosition={subtitlePosition}
                  setSubtitlePosition={setSubtitlePosition}
                />

               {scenes.length > 0 && (
                   <div className="w-full mt-8 p-5 bg-[#111] rounded-xl border border-white/5 shadow-sm min-w-[432px]">
                       <h4 className="text-xs font-bold text-gray-400 mb-4 uppercase tracking-widest border-b border-white/5 pb-2">Status do Projeto</h4>
                       <div className="space-y-3 text-xs text-gray-400 font-medium">
                           <div className="flex justify-between">
                               <span>Cenas Total</span>
                               <span className="text-white">{scenes.length}</span>
                           </div>
                           <div className="flex justify-between">
                               <span>Estilo Visual</span>
                               <span className="text-white">{imageStyle}</span>
                           </div>
                           <div className="flex justify-between">
                               <span>Modelo de Imagem</span>
                               <span className={imageModel === 'pro' ? 'text-yellow-500 font-bold' : 'text-white'}>{imageModel === 'pro' ? 'Pro 3.0' : 'Standard'}</span>
                           </div>
                           <div className="flex justify-between">
                               <span>Locução</span>
                               <span className="text-white">{scenes.filter(s => s.audioUrl).length}/{scenes.length}</span>
                           </div>
                           <div className="flex justify-between">
                               <span>Imagens</span>
                               <span className="text-white">{scenes.filter(s => s.imageUrl).length}/{scenes.length}</span>
                           </div>
                       </div>
                   </div>
               )}
             </>
           )}
        </div>
      </main>
    </div>
  );
};

export default App;
