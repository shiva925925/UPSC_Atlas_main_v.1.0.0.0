import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import CalendarView from './components/CalendarView';
import Profile from './components/Profile';
import GeminiAdvisor from './components/GeminiAdvisor';
import ResourcesView from './components/ResourcesView';
import TasksView from './components/TasksView';
import { ViewType } from './types';
import { Bell, Search, HelpCircle, Menu } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './db';

import BackgroundGradient from './components/ui/BackgroundGradient';
import GlassCard from './components/ui/GlassCard';

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(true);
  const [currentView, setCurrentView] = useState<ViewType>(ViewType.DASHBOARD);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Fetch user profile
  const userProfile = useLiveQuery(() => db.userProfile.get('Schamala'));

  // Session Tracking
  useEffect(() => {
    if (!isAuthenticated) return;

    const interval = setInterval(async () => {
      // Increment total usage by 1 minute every 60 seconds
      await db.userProfile.where('id').equals('Schamala').modify(user => {
        user.totalAppUsageMinutes = (user.totalAppUsageMinutes || 0) + 1;
      });
    }, 60000);

    return () => clearInterval(interval);
  }, [isAuthenticated]);

  // Auth Guard - Commented out for now (will re-enable when multi-user support is ready)
  // if (!isAuthenticated) {
  //   return <LoginView onLogin={() => setIsAuthenticated(true)} />;
  // }

  // Navigation State
  const [initialSelectedTaskId, setInitialSelectedTaskId] = useState<string | null>(null);

  const handleNavigateToTask = (taskId: string) => {
    setInitialSelectedTaskId(taskId);
    setCurrentView(ViewType.TASKS);
  };

  const renderContent = () => {
    switch (currentView) {
      case ViewType.DASHBOARD:
        return <Dashboard />;
      case ViewType.TASKS:
        return <TasksView initialSelectedTaskId={initialSelectedTaskId} onTaskSelected={() => setInitialSelectedTaskId(null)} />;
      case ViewType.CALENDAR:
        return <CalendarView />;
      case ViewType.PROFILE:
        return <Profile />;
      case ViewType.AI_ADVISOR:
        return <GeminiAdvisor />;
      case ViewType.RESOURCES:
        return <ResourcesView onNavigateToTask={handleNavigateToTask} />;
      default:
        return <Dashboard />;
    }
  };

  const handleViewChange = (view: ViewType) => {
    setCurrentView(view);
    setIsMobileMenuOpen(false); // Close mobile menu on navigation
  };



  return (
    <div className="flex h-screen overflow-hidden relative bg-white/50">
      <BackgroundGradient />

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


        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {renderContent()}
        </main>
      </div>
    </div>
  );
};

export default App;