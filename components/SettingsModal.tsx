import React, { useState, useEffect } from 'react';
import { X, Key, Save, ExternalLink, AlertTriangle } from 'lucide-react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  soraApiKey: string;
  setSoraApiKey: (key: string) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({ isOpen, onClose, soraApiKey, setSoraApiKey }) => {
  const [localKey, setLocalKey] = useState(soraApiKey);

  useEffect(() => {
    setLocalKey(soraApiKey);
  }, [soraApiKey]);

  const handleSave = () => {
    setSoraApiKey(localKey);
    localStorage.setItem('dyuapi_key', localKey);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <Key size={18} className="text-purple-600" />
            Configurações da API
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            <label className="block text-sm font-semibold text-gray-700">
              Dyuapi / Sora 2 API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={localKey}
                onChange={(e) => setLocalKey(e.target.value)}
                placeholder="Cole sua chave sk-..."
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all text-sm"
              />
              <Key size={16} className="absolute left-3 top-3 text-gray-400" />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Necessário para gerar vídeos com o modelo Sora 2.
            </p>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 flex gap-3">
             <ExternalLink className="text-blue-600 flex-shrink-0 mt-0.5" size={16} />
             <div className="text-xs text-blue-800">
                <p className="font-semibold mb-1">Onde conseguir a chave?</p>
                <p>Acesse o painel da <a href="https://dyuapi.com" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-900">Dyuapi.com</a> para gerar sua chave de API.</p>
             </div>
          </div>
          
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3">
             <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={16} />
             <div className="text-xs text-yellow-800">
                <p>A chave é salva apenas no navegador (LocalStorage) do seu dispositivo.</p>
             </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
          <button
            onClick={handleSave}
            className="flex items-center gap-2 bg-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-purple-700 transition-colors shadow-sm active:scale-95 transform"
          >
            <Save size={16} />
            Salvar Configurações
          </button>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;