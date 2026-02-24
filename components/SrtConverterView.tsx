
import React, { useState } from 'react';
import { Captions, Download, FileText, Copy, Check, Play, Settings2, Scissors, Timer } from 'lucide-react';

const playSuccessSound = () => {
    try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const oscillator = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();
        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(523.25, audioCtx.currentTime); 
        oscillator.frequency.exponentialRampToValueAtTime(1046.50, audioCtx.currentTime + 0.1); 
        gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.6);
        oscillator.connect(gainNode);
        gainNode.connect(audioCtx.destination);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.6);
    } catch (e) { }
};

const SrtConverterView: React.FC = () => {
    const [inputText, setInputText] = useState('');
    const [generatedSrt, setGeneratedSrt] = useState('');
    const [secondsPerSegment, setSecondsPerSegment] = useState(15);
    const [intervalSeconds, setIntervalSeconds] = useState(5);
    const [copied, setCopied] = useState(false);

    const formatSrtTime = (totalSeconds: number) => {
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = Math.floor(totalSeconds % 60);
        const ms = 0;

        return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
    };

    const convertToSrt = () => {
        if (!inputText.trim()) return;

        // Divide o texto em sentenças, mas também garante que nenhuma sentença individual passe de 499 caracteres
        const rawSentences = inputText.trim().match(/[^.!?]+[.!?]+/g) || [inputText.trim()];
        const sentences: string[] = [];
        
        rawSentences.forEach(s => {
            let text = s.trim();
            while (text.length > 499) {
                // Tenta cortar no último espaço antes de 499
                let splitIdx = text.lastIndexOf(' ', 499);
                if (splitIdx === -1) splitIdx = 499; // Força corte se não houver espaço
                sentences.push(text.substring(0, splitIdx).trim());
                text = text.substring(splitIdx).trim();
            }
            if (text) sentences.push(text);
        });
        
        const wordsPerSecond = 2.5; 
        const targetWordsPerSegment = secondsPerSegment * wordsPerSecond;
        
        const segments: string[] = [];
        let currentSegment = "";
        let currentWordCount = 0;

        sentences.forEach((sentence) => {
            const trimmedSentence = sentence.trim();
            const sentenceWordCount = trimmedSentence.split(/\s+/).length;
            const sentenceLength = trimmedSentence.length;
            const currentLength = currentSegment.length;
            
            // Verifica se adicionar esta sentença excederia o limite de palavras OU o limite de caracteres (499)
            // Consideramos +1 para o espaço entre sentenças
            const wouldExceedWords = currentWordCount + sentenceWordCount > targetWordsPerSegment;
            const wouldExceedChars = (currentLength + (currentLength > 0 ? 1 : 0) + sentenceLength) > 499;

            if ((wouldExceedWords || wouldExceedChars) && currentSegment !== "") {
                segments.push(currentSegment.trim());
                currentSegment = trimmedSentence;
                currentWordCount = sentenceWordCount;
            } else {
                currentSegment += (currentSegment === "" ? "" : " ") + trimmedSentence;
                currentWordCount += sentenceWordCount;
            }
        });

        if (currentSegment.trim()) {
            segments.push(currentSegment.trim());
        }

        let srtContent = '';
        let currentTime = 0;

        segments.forEach((text, index) => {
            const startTime = currentTime;
            const endTime = currentTime + secondsPerSegment;

            srtContent += `${index + 1}\n`;
            srtContent += `${formatSrtTime(startTime)} --> ${formatSrtTime(endTime)}\n`;
            srtContent += `${text}\n\n`;

            currentTime = endTime + intervalSeconds;
        });

        setGeneratedSrt(srtContent.trim());
        playSuccessSound();
    };

    const handleCopy = () => {
        navigator.clipboard.writeText(generatedSrt);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleDownload = () => {
        const blob = new Blob([generatedSrt], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'legenda.srt';
        a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <div className="h-full p-8 overflow-y-auto bg-[#0a0a0a]">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center gap-3 mb-8">
                    <div className="p-3 bg-[#151515] border border-white/10 text-white rounded-2xl">
                        <Captions size={24} />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white font-marker tracking-widest">CONVERSOR SRT</h2>
                        <p className="text-sm text-gray-500">Divisão inteligente por sentenças e tempos inteiros.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                    <div className="space-y-4">
                        <div className="bg-[#111] p-6 rounded-2xl border border-white/10 shadow-sm space-y-4">
                            <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                <FileText size={14} /> Texto de Entrada
                            </label>
                            <textarea
                                value={inputText}
                                onChange={(e) => setInputText(e.target.value)}
                                placeholder="Cole seu roteiro aqui..."
                                className="w-full h-64 p-4 bg-[#151515] border border-white/5 rounded-xl focus:ring-1 focus:ring-white outline-none resize-none text-sm leading-relaxed text-gray-300 placeholder-gray-600"
                            />
                            
                            <div className="flex flex-col gap-4 pt-2">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                            <Settings2 size={10} /> Duração Bloco (s)
                                        </label>
                                        <input 
                                            type="number"
                                            min="1"
                                            max="60"
                                            value={secondsPerSegment}
                                            onChange={(e) => setSecondsPerSegment(Number(e.target.value))}
                                            className="w-full p-2 bg-[#151515] border-none rounded-lg text-sm font-bold text-white focus:ring-1 focus:ring-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[9px] font-bold text-gray-500 uppercase mb-1 flex items-center gap-1">
                                            <Timer size={10} /> Intervalo/Pausa (s)
                                        </label>
                                        <input 
                                            type="number"
                                            min="0"
                                            max="60"
                                            value={intervalSeconds}
                                            onChange={(e) => setIntervalSeconds(Number(e.target.value))}
                                            className="w-full p-2 bg-[#151515] border-none rounded-lg text-sm font-bold text-gray-300 focus:ring-1 focus:ring-white"
                                        />
                                    </div>
                                </div>
                                <button
                                    onClick={convertToSrt}
                                    className="w-full bg-white text-black px-4 py-2.5 rounded-xl font-bold text-sm hover:bg-gray-200 transition-all flex items-center justify-center gap-2 uppercase tracking-wide"
                                >
                                    <Play size={16} fill="currentColor" /> Converter
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="bg-[#050505] p-6 rounded-2xl shadow-xl h-full flex flex-col border border-white/10">
                            <div className="flex items-center justify-between mb-4">
                                <label className="flex items-center gap-2 text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                    Output SRT (Formatado)
                                </label>
                                <div className="flex gap-2">
                                    <button 
                                        onClick={handleCopy}
                                        disabled={!generatedSrt}
                                        className="p-2 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
                                        title="Copiar"
                                    >
                                        {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                    </button>
                                    <button 
                                        onClick={handleDownload}
                                        disabled={!generatedSrt}
                                        className="p-2 text-gray-500 hover:text-white transition-colors disabled:opacity-30"
                                        title="Baixar"
                                    >
                                        <Download size={16} />
                                    </button>
                                </div>
                            </div>
                            
                            <div className="flex-1 bg-[#111] rounded-xl p-4 overflow-y-auto font-mono text-xs text-green-400 border border-white/5 scrollbar-hide">
                                {generatedSrt ? (
                                    <pre className="whitespace-pre-wrap">{generatedSrt}</pre>
                                ) : (
                                    <div className="h-full flex flex-col items-center justify-center text-gray-700 italic">
                                        <Captions size={32} className="mb-2 opacity-20" />
                                        <span>Aguardando conversão...</span>
                                    </div>
                                )}
                            </div>

                            {generatedSrt && (
                                <div className="mt-4 pt-4 border-t border-white/5 flex justify-between items-center">
                                    <span className="text-[10px] text-gray-600 font-medium">Pausa: {intervalSeconds}s</span>
                                    <button 
                                        onClick={handleDownload}
                                        className="text-xs bg-white text-black px-4 py-1.5 rounded-full font-bold hover:bg-gray-200 transition-colors flex items-center gap-1 shadow-md uppercase tracking-wide"
                                    >
                                        <Download size={12} /> Salvar SRT
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="mt-12 bg-[#111] rounded-2xl border border-dashed border-white/10 p-6 flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full bg-[#151515] text-white flex flex-shrink-0 items-center justify-center border border-white/5">
                        <Scissors size={20} />
                    </div>
                    <div>
                        <h4 className="text-sm font-bold text-white mb-1 uppercase tracking-wide">Intervalos de Silêncio</h4>
                        <p className="text-xs text-gray-500 leading-relaxed">
                            O sistema insere automaticamente pausas entre as legendas com base na configuração. 
                            Ideal para vídeos que precisam de "respiro" entre cenas.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SrtConverterView;
