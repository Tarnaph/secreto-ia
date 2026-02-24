
import React, { useState } from 'react';
import { Tag, Sparkles, Loader2, Type, AlignLeft, Hash, RefreshCw } from 'lucide-react';
import { Scene, VideoMetadata } from '../types';
import { generateMetadata } from '../services/geminiService';

interface MetadataViewProps {
    scenes: Scene[];
}

const MetadataView: React.FC<MetadataViewProps> = ({ scenes }) => {
    const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerate = async () => {
        if (scenes.length === 0) return;
        setIsGenerating(true);
        try {
            const result = await generateMetadata(scenes);
            if (result) setMetadata(result);
        } catch (e) {
            console.error(e);
            alert("Erro ao gerar metadados.");
        } finally {
            setIsGenerating(false);
        }
    };

    if (scenes.length === 0) {
        return (
            <div className="h-full flex items-center justify-center p-8 bg-[#0a0a0a]">
                <div className="text-center text-gray-600 max-w-md">
                    <Tag size={48} className="mx-auto mb-4 opacity-20" />
                    <h3 className="text-lg font-semibold mb-2 text-gray-400">Sem conteúdo para analisar</h3>
                    <p className="text-sm text-gray-600">Gere um roteiro e cenas primeiro para que a IA possa criar títulos e tags otimizados para você.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="h-full p-8 overflow-y-auto bg-[#0a0a0a]">
            <h2 className="text-2xl font-bold text-white mb-6 font-marker tracking-widest">SEO SECRETO</h2>
            
            {!metadata && !isGenerating ? (
                <div className="bg-[#111] border border-white/10 rounded-xl p-8 text-center">
                    <Sparkles className="w-12 h-12 text-white mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-bold text-white mb-2">Otimização de Algoritmo</h3>
                    <p className="text-gray-400 mb-6 max-w-md mx-auto text-sm">
                        Deixe a IA analisar seu roteiro para criar títulos virais e metadados otimizados para o algoritmo.
                    </p>
                    <button 
                        onClick={handleGenerate}
                        className="bg-white text-black px-6 py-3 rounded-lg font-bold uppercase tracking-wide hover:bg-gray-200 transition-colors shadow-lg"
                    >
                        Gerar Metadados
                    </button>
                </div>
            ) : isGenerating ? (
                 <div className="h-64 flex flex-col items-center justify-center space-y-4">
                    <Loader2 size={40} className="animate-spin text-white" />
                    <span className="text-gray-500 font-medium text-xs uppercase tracking-widest">Decodificando Algoritmo...</span>
                 </div>
            ) : (
                <div className="space-y-6 animate-fade-in">
                     <div className="bg-[#111] p-6 rounded-xl border border-white/10 shadow-sm">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                            <Type size={14} /> Título Otimizado
                        </label>
                        <div className="relative group">
                            <input 
                                type="text" 
                                value={metadata?.title} 
                                onChange={(e) => setMetadata(prev => prev ? {...prev, title: e.target.value} : null)}
                                className="w-full text-xl font-bold text-white border-b-2 border-white/10 focus:border-white outline-none py-2 bg-transparent"
                            />
                            <button 
                                onClick={() => navigator.clipboard.writeText(metadata?.title || '')}
                                className="absolute right-2 top-2 p-2 bg-[#222] rounded-md text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity hover:text-white"
                                title="Copiar"
                            >
                                <AlignLeft size={16} />
                            </button>
                        </div>
                     </div>

                     <div className="bg-[#111] p-6 rounded-xl border border-white/10 shadow-sm">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                            <AlignLeft size={14} /> Descrição
                        </label>
                        <textarea 
                            value={metadata?.description} 
                            onChange={(e) => setMetadata(prev => prev ? {...prev, description: e.target.value} : null)}
                            rows={6}
                            className="w-full text-gray-300 bg-[#151515] border border-white/5 rounded-lg p-4 focus:ring-1 focus:ring-white outline-none resize-none"
                        />
                     </div>

                     <div className="bg-[#111] p-6 rounded-xl border border-white/10 shadow-sm">
                        <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-3">
                            <Hash size={14} /> Tags Virais
                        </label>
                        <div className="flex flex-wrap gap-2">
                            {metadata?.hashtags.map((tag, i) => (
                                <span key={i} className="px-3 py-1.5 bg-[#222] text-gray-300 rounded-full text-xs font-medium border border-white/5 hover:border-white/20 transition-all cursor-default">
                                    {tag}
                                </span>
                            ))}
                        </div>
                     </div>

                     <div className="flex justify-end">
                        <button 
                            onClick={handleGenerate}
                            className="flex items-center gap-2 text-gray-500 hover:text-white transition-colors px-4 py-2 text-xs font-bold uppercase"
                        >
                            <RefreshCw size={14} /> Regenerar
                        </button>
                     </div>
                </div>
            )}
        </div>
    );
};

export default MetadataView;
