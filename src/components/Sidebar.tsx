import { LayoutDashboard, Calendar, User, Sparkles, BookOpen, CheckSquare, X, ChevronLeft, ChevronRight } from 'lucide-react';
import { ViewType } from '../types';
import GlassCard from './ui/GlassCard';

interface SidebarProps {
  currentView: ViewType;
  onChangeView: (view: ViewType) => void;
  isOpen: boolean;
  onClose: () => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isOpen, onClose, isCollapsed, onToggleCollapse }) => {
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
        className={`fixed inset-y-0 left-0 z-50 flex flex-col h-screen transition-all duration-310 ease-in-out transform md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'
          } ${isCollapsed ? 'w-20' : 'w-64'}`}
      >
        <GlassCard
          variant="blur"
          className="h-full rounded-none border-r border-card-border flex flex-col transition-colors duration-300"
          initial={{ x: 0, opacity: 1 }} // Override entry animation for sidebar
          animate={{ x: 0, opacity: 1 }}
        >
          <div className={`p-4 flex items-center ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
            <div className="flex items-center space-x-3 overflow-hidden">
              <div className="w-8 h-8 bg-blue-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/30">
                UA
              </div>
              {!isCollapsed && <h1 className="text-text-main font-bold text-lg tracking-tight truncate">UPSC Atlas</h1>}
            </div>
            {/* Close button only visible on mobile */}
            {!isCollapsed && (
              <button onClick={onClose} className="md:hidden text-text-muted hover:text-text-main">
                <X size={24} />
              </button>
            )}
          </div>

          <button
            onClick={onToggleCollapse}
            className="hidden md:flex absolute -right-3 top-20 w-6 h-6 bg-blue-600 rounded-full items-center justify-center text-white shadow-lg z-50 hover:scale-110 transition-transform"
          >
            {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>

          <nav className="flex-1 px-3 space-y-1 overflow-y-auto custom-scrollbar">
            {!isCollapsed && (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-2 mt-4">
                Planning
              </div>
            )}
            {navItems.map((item) => {
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onChangeView(item.id)}
                  className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isCollapsed ? 'justify-center border border-transparent' : 'space-x-3'} ${isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                    : 'text-text-muted hover:bg-white/10 hover:text-text-main'
                    } ${isCollapsed && isActive ? 'border-blue-400' : ''}`}
                  title={isCollapsed ? item.label : ''}
                >
                  <item.icon size={18} className="flex-shrink-0" />
                  {!isCollapsed && <span>{item.label}</span>}
                </button>
              );
            })}

            {!isCollapsed && (
              <div className="text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2 px-2 mt-8">
                Resources
              </div>
            )}
            <button
              onClick={() => onChangeView(ViewType.RESOURCES)}
              className={`w-full flex items-center px-3 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${isCollapsed ? 'justify-center border border-transparent' : 'space-x-3'} ${currentView === ViewType.RESOURCES
                ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20'
                : 'text-text-muted hover:bg-white/10 hover:text-text-main'
                } ${isCollapsed && currentView === ViewType.RESOURCES ? 'border-blue-400' : ''}`}
              title={isCollapsed ? 'Study Library' : ''}
            >
              <BookOpen size={18} className="flex-shrink-0" />
              {!isCollapsed && <span>Study Library</span>}
            </button>
          </nav>

          <div className="p-4 border-t border-card-border">
            <p className="text-[10px] text-text-muted text-center font-medium">UPSC Atlas v1.0</p>
          </div>
        </GlassCard>
      </div>
    </>
  );
};

export default Sidebar;