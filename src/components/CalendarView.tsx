import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SUBJECT_COLORS, MOCK_ACHIEVEMENTS } from '../constants';
import { CalendarFilter } from '../types';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<CalendarFilter>(CalendarFilter.ALL);

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const resources = useLiveQuery(() => db.resources.toArray()) || [];

  const allLogs = tasks.flatMap(t => t.logs || []);

  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(currentDate);
  const firstDay = getFirstDayOfMonth(currentDate);

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const renderCalendarGrid = () => {
    const days = [];
    const emptyDays = Array(firstDay).fill(null);

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
      const dateString = date.toISOString().split('T')[0];

      const dayTasks = tasks.filter(t => t.date === dateString);
      const dayLogs = allLogs.filter(l => l.date === dateString);

      days.push(
        <div
          key={i}
          onClick={() => setSelectedDate(dateString)}
          className={`min-h-[80px] border-b border-r border-gray-100 p-2 cursor-pointer transition-colors hover:bg-gray-50 relative ${selectedDate === dateString ? 'bg-blue-50/50' : ''}`}
        >
          <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${dateString === new Date().toISOString().split('T')[0] ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
            {i}
          </span>

          <div className="mt-2 flex flex-wrap gap-1">
            {dayTasks.slice(0, 3).map(task => (
              <div key={task.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[task.subject] }} title={task.title}></div>
            ))}
            {dayTasks.length > 3 && <span className="text-[10px] text-gray-400">+{dayTasks.length - 3}</span>}
            {dayLogs.length > 0 && <div className="w-2 h-2 rounded-full bg-gray-400" title={`${dayLogs.length} logs`}></div>}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-gray-200">
        {emptyDays.map((_, i) => <div key={`empty-${i}`} className="min-h-[80px] bg-gray-50/30 border-b border-r border-gray-100"></div>)}
        {days}
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return <p className="text-gray-500 text-center mt-10">Select a date to view details.</p>;

    const dateTasks = tasks.filter(t => t.date === selectedDate);
    const dateLogs = allLogs.filter(l => l.date === selectedDate);
    const dateResources = resources.filter(r => r.date === selectedDate);
    const dateAchievements = MOCK_ACHIEVEMENTS.filter(a => a.date === selectedDate);

    return (
      <div className="space-y-6">
        <h3 className="text-lg font-bold text-gray-800 border-b border-gray-200 pb-2">
          {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
        </h3>

        {/* Tasks */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TASKS) && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">Tasks</h4>
            {dateTasks.length === 0 ? <p className="text-xs text-gray-400 italic">No tasks for this day.</p> : (
              <div className="space-y-2">
                {dateTasks.map(task => (
                  <div key={task.id} className="bg-white border border-gray-200 p-3 rounded-md shadow-sm">
                    <div className="flex justify-between items-start">
                      <h5 className="text-sm font-medium text-gray-800">{task.title}</h5>
                      <span className="text-[10px] px-2 py-0.5 rounded text-white" style={{ backgroundColor: SUBJECT_COLORS[task.subject] }}>{task.subject}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{task.status.replace('_', ' ')}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Time Logs */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TIME_LOGS) && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">Time Logs</h4>
            {dateLogs.length === 0 ? <p className="text-xs text-gray-400 italic">No time logged.</p> : (
              <div className="space-y-2">
                {dateLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm bg-gray-50 p-2 rounded">
                    <span className="text-gray-700">{log.description}</span>
                    <span className="font-bold text-blue-600">{log.durationMinutes}m</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full animate-fade-in bg-white">
      {/* Calendar Grid */}
      <div className="flex-1 p-6 overflow-y-auto flex flex-col">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800">
            {currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
          </h2>
          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronLeft size={20} /></button>
            <button onClick={handleNextMonth} className="p-2 hover:bg-gray-100 rounded-full"><ChevronRight size={20} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 bg-gray-50 border-b border-gray-200">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-3 text-center text-xs font-bold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto">
          {renderCalendarGrid()}
        </div>
      </div>

      {/* Sidebar Details */}
      <div className="w-80 border-l border-gray-200 bg-white p-6 overflow-y-auto">
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Filter View</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(CalendarFilter).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {renderSelectedDateDetails()}
      </div>
    </div>
  );
};

export default CalendarView;