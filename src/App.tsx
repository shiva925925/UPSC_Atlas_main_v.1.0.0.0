import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Profile from './components/Profile';
import GeminiAdvisor from './components/GeminiAdvisor';
import ResourcesView from './components/ResourcesView';
import TasksView from './components/TasksView';
import LoginView from './components/LoginView';
import { ViewType } from './types';
import { Bell, Search, HelpCircle, Menu } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch user profile
  const userProfile = useLiveQuery(() => db.userProfile.get('current'));

  // Session Tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      // Increment total usage by 1 minute every 60 seconds
      await db.userProfile.where('id').equals('current').modify(user => {
        user.totalAppUsageMinutes = (user.totalAppUsageMinutes || 0) + 1;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Auth Guard
  if (!isAuthenticated) {
    return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  }

  const renderContent = () => {
    switch (currentView) {
      case ViewType.DASHBOARD:
        return <Dashboard />;
      case ViewType.TASKS:
        return <TasksView />;
      case ViewType.CALENDAR:
        return <CalendarView />;
      case ViewType.PROFILE:
        return <Profile />;
      case ViewType.AI_ADVISOR:
        return <GeminiAdvisor />;
      case ViewType.RESOURCES:
        return <ResourcesView />;
      default:
        return <Dashboard />;
    }
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };

  return (
    <div className="flex min-h-screen bg-[#f4f5f7]">
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-50 md:hidden animate-fade-in"
          onClick={() => setIsMobileMenuOpen(false)}
        ></div>
      )}

      <Sidebar
        currentView={currentView}
        onChangeView={handleViewChange}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Wrapper - Adjust margin for desktop */}
      <div className="flex-1 flex flex-col ml-0 md:ml-64 min-w-0 transition-all duration-300">
        {/* Top Navigation Bar */}
        <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <button
              className="md:hidden text-gray-500 hover:text-gray-700"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu size={24} />
            </button>
            <div className="relative hidden md:block">
              <Search className="absolute left-2.5 top-1.5 text-gray-400" size={16} />
              <input
                type="text"
                placeholder="Search"
                className="pl-9 pr-4 py-1.5 bg-gray-100 border border-transparent focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-200 rounded-md text-sm text-gray-700 w-64 transition-all outline-none"
              />
            </div>
          </div>

          <div className="flex items-center space-x-2 md:space-x-4">
            <button className="text-gray-500 hover:text-gray-700 transition-colors hidden sm:block">
              <HelpCircle size={20} />
            </button>
            <button className="text-gray-500 hover:text-gray-700 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <div
              className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden cursor-pointer border border-gray-300"
              onClick={() => setCurrentView(ViewType.PROFILE)}
            >
              {userProfile && <img src={userProfile.avatarUrl} alt="User" className="h-full w-full object-cover" />}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;