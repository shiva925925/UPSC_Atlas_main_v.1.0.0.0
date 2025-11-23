import React from 'react';
import { LayoutDashboard, Calendar, User, Sparkles, BookOpen, CheckSquare, X } from 'lucide-react';
import { ViewType } from '../types';

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
      {/* Mobile Overlay is handled in App.tsx, but the Sidebar itself handles its positioning */}
      <div 
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#0f172a] text-gray-300 flex flex-col h-screen border-r border-gray-800 transition-transform duration-300 ease-in-out transform md:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded flex items-center justify-center text-white font-bold">
              UA
            </div>
            <h1 className="text-white font-bold text-lg tracking-tight">UPSC Atlas</h1>
          </div>
          {/* Close button only visible on mobile */}
          <button onClick={onClose} className="md:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-4">
            Planning
          </div>
          {navItems.map((item) => {
            const isActive = currentView === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onChangeView(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
                  isActive
                    ? 'bg-blue-600 text-white'
                    : 'hover:bg-gray-800 hover:text-white'
                }`}
              >
                <item.icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2 mt-8">
            Resources
          </div>
          <button 
            onClick={() => onChangeView(ViewType.RESOURCES)}
            className={`w-full flex items-center space-x-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ${
              currentView === ViewType.RESOURCES
                ? 'bg-blue-600 text-white'
                : 'hover:bg-gray-800 hover:text-white'
            }`}
          >
            <BookOpen size={18} />
            <span>Study Library</span>
          </button>
        </nav>

        <div className="p-4 border-t border-gray-800">
          <p className="text-xs text-gray-500 text-center">UPSC Atlas v1.0</p>
        </div>
      </div>
    </>
  );
};

export default Sidebar;