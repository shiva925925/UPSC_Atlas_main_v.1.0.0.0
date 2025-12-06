import React from 'react';
import { LayoutDashboard, Calendar, User, Sparkles, BookOpen, CheckSquare, X } from 'lucide-react';
import { ViewType } from '../types';
import GlassCard from './ui/GlassCard';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose }) => {
  const navItems = [
    { id: ViewType.DASHBOARD, label: 'Dashboard', icon: LayoutDashboard },
    { id: ViewType.TASKS, label: 'Tasks', icon: CheckSquare },
    { id: ViewType.CALENDAR, label: 'Calendar', icon: Calendar },
    { id: ViewType.AI_ADVISOR, label: 'AI Coach', icon: Sparkles },
    { id: ViewType.PROFILE, label: 'Profile', icon: User },
  ];

  return (
    <>
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col h-screen transition-transform duration-300 ease-in-out transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <GlassCard
          variant="blur"
          className="h-full rounded-none border-r border-white/20 flex flex-col"
          initial={{ x: 0, opacity: 1 }} // Override entry animation for sidebar
          animate={{ x: 0, opacity: 1 }}
        >
          <div className="p-6 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                UA
              </div>
              <h1 className="text-gray-800 font-bold text-lg tracking-tight">UPSC Atlas</h1>
            </div>
            {/* Close button only visible on mobile */}
            <button onClick={onClose} className="md:hidden text-gray-500 hover:text-gray-800">
              <X size={24} />
            </button>
          </div>

          <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-4">
              Planning
            </div>
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isActive
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                      : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
                    }`}
                >
                  <item.icon size={18} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 px-2 mt-8">
              Resources
            </div>
            <button
              onClick={() => onChangeView(ViewType.RESOURCES)}
              className={`w-full flex items-center space-x-3 px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${currentView === ViewType.RESOURCES
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                  : 'text-gray-600 hover:bg-white/40 hover:text-gray-900'
                }`}
            >
              <BookOpen size={18} />
              <span>Study Library</span>
            </button>
          </nav>

          <div className="p-4 border-t border-gray-200/50">
            <p className="text-xs text-gray-500 text-center">UPSC Atlas v1.0</p>
          </div>
        </GlassCard>
      </div>
    </>
  );
};

export default Sidebar;