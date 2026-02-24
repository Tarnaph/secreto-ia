
import React from 'react';
import { FileText, Film, Music, Tag, Settings, Video, Captions, Zap } from 'lucide-react';
import { AppView } from '../types';

interface SidebarProps {
  currentView: AppView;
  onChangeView: (view: AppView) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView }) => {
    const navItems = [
      { id: AppView.SRT_CONVERTER, icon: Captions, label: 'SRT Tool' },
      { id: AppView.SCRIPT, icon: FileText, label: 'Roteiro' },
      { id: AppView.SCENES, icon: Film, label: 'Cenas' },
      { id: AppView.MUSIC, icon: Music, label: 'Música' },
      { id: AppView.METADATA, icon: Tag, label: 'SEO' },
    ];
  
    return (
      <div className="w-20 bg-black h-screen flex flex-col items-center py-6 border-r border-white/10 z-10 flex-shrink-0">
        <div className="mb-8 text-white">
           <div className="w-10 h-10 border-2 border-white rounded-lg flex items-center justify-center">
                <span className="font-marker text-xl">A</span>
           </div>
        </div>
  
        <nav className="flex flex-col w-full gap-3 overflow-y-auto scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onChangeView(item.id)}
              className={`flex flex-col items-center justify-center w-full py-4 transition-all relative group
                ${currentView === item.id ? 'text-white' : 'text-gray-600 hover:text-gray-300'}`}
            >
              <item.icon size={22} strokeWidth={currentView === item.id ? 2.5 : 2} />
              <span className="text-[9px] mt-1.5 font-bold uppercase tracking-widest text-center px-1 opacity-80">{item.label}</span>
              
              {currentView === item.id && (
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-8 bg-white rounded-r-full shadow-[0_0_10px_rgba(255,255,255,0.5)]" />
              )}
            </button>
          ))}
        </nav>
      </div>
    );
};

export default Sidebar;
