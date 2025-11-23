import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Filter, Link as LinkIcon, FileText } from 'lucide-react';
import { CalendarFilter, Task, TimeLog, Achievement, Subject, ResourceType } from '../types';
import { MOCK_TASKS, MOCK_TIME_LOGS, MOCK_ACHIEVEMENTS, MOCK_RESOURCES, SUBJECT_COLORS } from '../constants';

// Helper to get days in month
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const CalendarView: React.FC = () => {
  const [filter, setFilter] = useState<CalendarFilter>(CalendarFilter.ALL);
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  
  const monthNames = ["January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate calendar grid
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  // Helper to format date key YYYY-MM-DD
  const getDateKey = (day: number) => {
    const m = (month + 1).toString().padStart(2, '0');
    const d = day.toString().padStart(2, '0');
    return `${year}-${m}-${d}`;
  };

  // Render content for a specific day
  const renderDayContent = (day: number) => {
    const dateKey = getDateKey(day);
    const dayTasks = MOCK_TASKS.filter(t => t.date === dateKey);
    const dayLogs = MOCK_TIME_LOGS.filter(l => l.date === dateKey);
    const dayAchievements = MOCK_ACHIEVEMENTS.filter(a => a.date === dateKey);
    const dayResources = MOCK_RESOURCES.filter(r => r.date === dateKey);

    return (
      <div className="mt-1 space-y-1 overflow-y-auto max-h-[80px] custom-scrollbar">
        {/* Achievements */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.ACHIEVEMENTS) && dayAchievements.map(ach => (
          <div key={ach.id} className="text-[10px] px-1 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200 truncate flex items-center gap-1" title={ach.title}>
            <span>{ach.badge}</span> {ach.title}
          </div>
        ))}

        {/* Resources */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.RESOURCES) && dayResources.map(res => (
          <div key={res.id} className="text-[10px] px-1 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 truncate flex items-center gap-1" title={`Resource: ${res.title}`}>
            {res.type === ResourceType.LINK ? <LinkIcon size={8} /> : <FileText size={8} />}
            {res.title}
          </div>
        ))}

        {/* Tasks */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TASKS) && dayTasks.map(task => (
          <div 
            key={task.id} 
            className={`text-[10px] px-1 py-0.5 rounded border truncate ${task.status === 'DONE' ? 'bg-green-50 text-green-700 border-green-200 line-through' : 'bg-blue-50 text-blue-700 border-blue-200'}`}
            title={task.title}
          >
            {task.title}
          </div>
        ))}

        {/* Time Logs */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TIME_LOGS) && dayLogs.map(log => (
          <div 
            key={log.id} 
            className="text-[10px] px-1 py-0.5 rounded bg-purple-50 text-purple-700 border border-purple-200 truncate flex items-center"
            title={`${log.durationMinutes}m - ${log.description}`}
            style={{borderLeftColor: SUBJECT_COLORS[log.subject], borderLeftWidth: '3px'}}
          >
            {log.durationMinutes}m {log.subject}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 h-full flex flex-col">
      <header className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Preparation Calendar</h2>
          <p className="text-gray-500">Track your daily study habits and milestones.</p>
        </div>

        <div className="flex items-center space-x-4 bg-white p-2 rounded-lg shadow-sm border border-gray-200 self-start md:self-auto">
          <div className="flex items-center space-x-2">
            <button onClick={handlePrevMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <ChevronLeft size={20} />
            </button>
            <span className="font-semibold text-gray-800 w-32 text-center select-none">
              {monthNames[month]} {year}
            </span>
            <button onClick={handleNextMonth} className="p-1 hover:bg-gray-100 rounded text-gray-600">
              <ChevronRight size={20} />
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-300 mx-2"></div>

          <div className="flex items-center space-x-2 relative">
            <Filter size={16} className="text-gray-500" />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value as CalendarFilter)}
              className="text-sm font-medium text-gray-700 bg-transparent focus:outline-none cursor-pointer max-w-[100px]"
            >
              {Object.values(CalendarFilter).map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* Calendar Grid */}
      <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {day}
            </div>
          ))}
        </div>
        
        {/* Days Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr overflow-y-auto">
          {days.map((day, index) => {
            if (day === null) {
              return <div key={`empty-${index}`} className="bg-gray-50/50 border-b border-r border-gray-100 min-h-[80px] md:min-h-[120px]"></div>;
            }
            const isToday = day === new Date().getDate() && month === new Date().getMonth() && year === new Date().getFullYear();
            
            return (
              <div key={day} className={`border-b border-r border-gray-100 p-1 md:p-2 min-h-[80px] md:min-h-[120px] transition-colors hover:bg-gray-50 ${isToday ? 'bg-blue-50/30' : ''}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${isToday ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
                    {day}
                  </span>
                </div>
                {renderDayContent(day)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default CalendarView;