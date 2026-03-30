
import React, { useState, useEffect, useRef } from 'react';
import { PanelRightClose, PanelRightOpen, MonitorPlay, Zap, Download, Upload } from 'lucide-react';
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

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);

  const handleScriptGenerated = (newScenes: Scene[]) => {
    setScenes(newScenes);
    setCurrentView(AppView.SCENES);
  };

  const handleExportProject = async () => {
    try {
      setIsExporting(true);
      const JSZip = (window as any).JSZip;
      if (!JSZip) {
        alert("A biblioteca JSZip ainda não foi carregada. Tente novamente em alguns segundos.");
        return;
      }
      const zip = new JSZip();
      
      const projectData = {
        scenes: JSON.parse(JSON.stringify(scenes)),
        characters: JSON.parse(JSON.stringify(characters)),
        backgroundMusic,
        musicVolume,
        selectedVoice,
        aspectRatio,
        imageStyle,
        imageModel,
        subtitleStyle,
        showSubtitles,
        subtitlePosition
      };

      // Process scenes
      let srtContent = '';
      let imgPromptsContent = '';
      let veoPromptsContent = '';
      let currentSrtTime = 0; // seconds

      const formatSrtTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        const ms = Math.floor((seconds % 1) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };

      for (let i = 0; i < projectData.scenes.length; i++) {
        const scene = projectData.scenes[i];
        
        // Handle audio
        if (scene.audioUrl) {
          if (scene.audioUrl.startsWith('blob:')) {
            const res = await fetch(scene.audioUrl);
            const blob = await res.blob();
            const filename = `audio_${i + 1}.wav`;
            zip.file(filename, blob);
            scene.audioUrl = `local://${filename}`;
          }
        }
        
        // Handle image
        if (scene.imageUrl) {
          if (scene.imageUrl.startsWith('blob:')) {
            const res = await fetch(scene.imageUrl);
            const blob = await res.blob();
            const filename = `image_${i + 1}.png`;
            zip.file(filename, blob);
            scene.imageUrl = `local://${filename}`;
          } else if (scene.imageUrl.startsWith('data:')) {
            const res = await fetch(scene.imageUrl);
            const blob = await res.blob();
            const filename = `image_${i + 1}.png`;
            zip.file(filename, blob);
            scene.imageUrl = `local://${filename}`;
          }
        }

        // Build SRT
        const duration = scene.audioDuration || scene.manualDuration || 5;
        const startTimeStr = formatSrtTime(currentSrtTime);
        const endTimeStr = formatSrtTime(currentSrtTime + duration);
        
        srtContent += `${i + 1}\n${startTimeStr} --> ${endTimeStr}\n${scene.narration}\n\n`;
        
        // Add 30 seconds between scenes
        currentSrtTime += duration + 30;

        // Build Image Prompts
        imgPromptsContent += `[Cena ${i + 1}]\n${scene.visualPrompt}\n\n`;

        // Build Veo Prompts
        if (scene.videoPrompt) {
            veoPromptsContent += `[Cena ${i + 1}]\n${scene.videoPrompt}\n\n`;
        }
      }

      // Process characters
      for (let i = 0; i < projectData.characters.length; i++) {
        const char = projectData.characters[i];
        if (char.imageData) {
          if (char.imageData.startsWith('data:') || char.imageData.startsWith('blob:')) {
            const res = await fetch(char.imageData);
            const blob = await res.blob();
            const filename = `char_${char.id}.png`;
            zip.file(filename, blob);
            char.imageData = `local://${filename}`;
          }
        }
      }

      zip.file("project.json", JSON.stringify(projectData, null, 2));
      zip.file("legendas.srt", srtContent);
      zip.file("prompts_imagem.txt", imgPromptsContent);
      if (veoPromptsContent) {
          zip.file("prompts_veo.txt", veoPromptsContent);
      }
      
      const zipBlob = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'algoritmo-secreto-project.zip';
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed", error);
      alert("Erro ao exportar projeto.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportProject = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const JSZip = (window as any).JSZip;
      if (!JSZip) {
        alert("A biblioteca JSZip ainda não foi carregada. Tente novamente em alguns segundos.");
        return;
      }
      
      const zip = await JSZip.loadAsync(file);
      const projectJsonFile = zip.file("project.json");
      if (!projectJsonFile) throw new Error("project.json not found in zip");
      
      const projectJsonStr = await projectJsonFile.async("string");
      const projectData = JSON.parse(projectJsonStr);
      
      // Restore scenes
      if (projectData.scenes) {
        for (const scene of projectData.scenes) {
          if (scene.audioUrl && scene.audioUrl.startsWith('local://')) {
            const filename = scene.audioUrl.replace('local://', '');
            const fileData = zip.file(filename);
            if (fileData) {
              const blob = await fileData.async("blob");
              scene.audioUrl = URL.createObjectURL(blob);
            }
          }
          if (scene.imageUrl && scene.imageUrl.startsWith('local://')) {
            const filename = scene.imageUrl.replace('local://', '');
            const fileData = zip.file(filename);
            if (fileData) {
              const blob = await fileData.async("blob");
              scene.imageUrl = URL.createObjectURL(blob);
            }
          }
        }
        setScenes(projectData.scenes);
      }
      
      // Restore characters
      if (projectData.characters) {
        for (const char of projectData.characters) {
          if (char.imageData && char.imageData.startsWith('local://')) {
            const filename = char.imageData.replace('local://', '');
            const fileData = zip.file(filename);
            if (fileData) {
              const base64 = await fileData.async("base64");
              char.imageData = `data:image/png;base64,${base64}`;
            }
          }
        }
        setCharacters(projectData.characters);
      }
      
      if (projectData.backgroundMusic !== undefined) setBackgroundMusic(projectData.backgroundMusic);
      if (projectData.musicVolume !== undefined) setMusicVolume(projectData.musicVolume);
      if (projectData.selectedVoice) setSelectedVoice(projectData.selectedVoice);
      if (projectData.aspectRatio) setAspectRatio(projectData.aspectRatio);
      if (projectData.imageStyle) setImageStyle(projectData.imageStyle);
      if (projectData.imageModel) setImageModel(projectData.imageModel);
      if (projectData.subtitleStyle) setSubtitleStyle(projectData.subtitleStyle);
      if (projectData.showSubtitles !== undefined) setShowSubtitles(projectData.showSubtitles);
      if (projectData.subtitlePosition) setSubtitlePosition(projectData.subtitlePosition);
      
      setCurrentView(AppView.SCENES);
    } catch (error) {
      console.error("Failed to import project", error);
      alert("Erro ao importar projeto. Arquivo inválido ou corrompido.");
    } finally {
      setIsImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex h-screen bg-black text-white font-sans overflow-hidden">
      {(isExporting || isImporting) && (
        <div className="absolute inset-0 z-50 bg-black/80 flex items-center justify-center backdrop-blur-sm">
           <div className="flex flex-col items-center gap-4">
              <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
              <p className="text-white font-medium tracking-widest uppercase text-sm">
                {isExporting ? 'Exportando Projeto...' : 'Importando Projeto...'}
              </p>
           </div>
        </div>
      )}
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
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                      title="Importar Projeto"
                    >
                      <Upload size={14} />
                      <span className="hidden sm:inline">Importar</span>
                    </button>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleImportProject} 
                      accept=".zip" 
                      className="hidden" 
                    />
                    <button 
                      onClick={handleExportProject}
                      className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white border border-white/10"
                      title="Exportar Projeto"
                    >
                      <Download size={14} />
                      <span className="hidden sm:inline">Exportar</span>
                    </button>

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
