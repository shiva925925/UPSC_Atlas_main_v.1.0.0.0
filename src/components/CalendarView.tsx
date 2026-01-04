import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { Subject, SubjectCategory, CalendarFilter } from '../types';
import { SUBJECT_HIERARCHY, CATEGORY_COLORS } from '../constants';
import { ChevronLeft, ChevronRight, Filter } from 'lucide-react';
import GlassCard from './ui/GlassCard';

const CalendarView: React.FC = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(new Date().toISOString().split('T')[0]);
  const [filter, setFilter] = useState<CalendarFilter>(CalendarFilter.ALL);

  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const resources = useLiveQuery(() => db.resources.toArray()) || [];
  const dayMetadataList = useLiveQuery(() => db.dayMetadata.toArray()) || [];

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

  const handleUpdateHeading = async (date: string, newHeading: string) => {
    await db.dayMetadata.put({
      id: date,
      userId: 'Schamala',
      heading: newHeading
    });
  };

  const renderCalendarGrid = () => {
    const days = [];
    const emptyDays = Array(firstDay).fill(null);

    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);

      // FIX: Use local time components to construct YYYY-MM-DD
      // This prevents timezone shifts caused by toISOString() (which uses UTC)
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const dateString = `${year}-${month}-${day}`;

      const dayTasks = tasks.filter(t => t.date === dateString);
      const dayLogs = allLogs.filter(l => l.date === dateString);
      const dayMeta = dayMetadataList.find(m => m.id === dateString);

      // Get "Today" string locally for comparison
      const now = new Date();
      const todayString = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

      days.push(
        <div
          key={i}
          onClick={() => setSelectedDate(dateString)}
          className={`border-b border-r border-white/10 p-2 cursor-pointer transition-colors hover:bg-white/20 relative ${selectedDate === dateString ? 'bg-blue-50/50' : ''}`}
        >
          <div className="flex flex-col items-start w-full gap-1">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${dateString === todayString ? 'bg-blue-600 text-white' : 'text-gray-700'}`}>
              {i}
            </span>
            {dayMeta?.heading && (
              <p className="text-xs font-medium text-blue-900 w-full break-words leading-tight mt-0.5">
                {dayMeta.heading}
              </p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-1 min-h-[1.5rem]">
            {dayTasks.slice(0, 3).map(task => (
              <div key={task.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL].hex }} title={task.title}></div>
            ))}
            {dayTasks.length > 3 && <span className="text-[10px] text-gray-400">+{dayTasks.length - 3}</span>}
            {dayLogs.length > 0 && <div className="w-2 h-2 rounded-full bg-gray-400" title={`${dayLogs.length} logs`}></div>}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-white/10">
        {emptyDays.map((_, i) => <div key={`empty-${i}`} className="min-h-[50px] bg-white/5 border-b border-r border-white/10"></div>)}
        {days}
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return <p className="text-gray-500 text-center mt-10">Select a date to view details.</p>;

    const dateTasks = tasks.filter(t => t.date === selectedDate);
    const dateLogs = allLogs.filter(l => l.date === selectedDate);
    const dayMeta = dayMetadataList.find(m => m.id === selectedDate);

    return (
      <div className="space-y-6">
        <div className="border-b border-gray-200 pb-4">
          <h3 className="text-lg font-bold text-gray-800 mb-2">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          {/* Day Heading Input */}
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Day Focus / Heading</label>
            <input
              type="text"
              placeholder="e.g. History Revision..."
              value={dayMeta?.heading || ''}
              onChange={(e) => handleUpdateHeading(selectedDate, e.target.value)}
              className="w-full mt-1 px-2 py-1.5 text-sm font-semibold text-blue-800 bg-blue-50/50 border border-blue-100 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder-blue-300"
            />
          </div>
        </div>

        {/* Tasks */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TASKS) && (
          <div>
            <h4 className="text-sm font-bold text-gray-600 mb-2 uppercase tracking-wider">Tasks</h4>
            {dateTasks.length === 0 ? <p className="text-xs text-gray-400 italic">No tasks for this day.</p> : (
              <div className="space-y-2">
                {dateTasks.map(task => {
                  const subjectCategory = SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL;
                  const colors = CATEGORY_COLORS[subjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];
                  return (
                    <div key={task.id} className="bg-white border border-gray-200 p-3 rounded-md shadow-sm">
                      <div className="flex justify-between items-start">
                        <h5 className="text-sm font-medium text-gray-800">{task.title}</h5>
                        <span className={`text-[10px] px-2 py-0.5 rounded ${colors.background} ${colors.text}`}>{task.subject}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{task.status.replace('_', ' ')}</p>
                    </div>
                  );
                })}
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

  const handleJumpToMonth = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newMonth = parseInt(e.target.value);
    setCurrentDate(new Date(currentDate.getFullYear(), newMonth, 1));
  };

  const handleJumpToYear = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newYear = parseInt(e.target.value);
    setCurrentDate(new Date(newYear, currentDate.getMonth(), 1));
  };

  return (
    <div className="flex h-full animate-fade-in gap-6 p-4 md:p-8 overflow-y-auto">
      {/* Calendar Grid - Takes remaining space (~60%) but fits content vertically */}
      <GlassCard variant="blur" className="flex-1 h-fit flex flex-col border-white/20">
        <div className="flex justify-between items-center mb-4 p-4 pb-0">
          <div className="flex items-center gap-2">
            {/* Month Select */}
            <select
              value={currentDate.getMonth()}
              onChange={handleJumpToMonth}
              className="bg-transparent text-xl font-bold text-gray-800 outline-none cursor-pointer hover:bg-black/5 rounded px-1 transition-colors appearance-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i}>
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            {/* Year Select (Range: Current - 5 to Current + 5) */}
            <select
              value={currentDate.getFullYear()}
              onChange={handleJumpToYear}
              className="bg-transparent text-xl font-bold text-gray-800 outline-none cursor-pointer hover:bg-black/5 rounded px-1 transition-colors appearance-none"
            >
              {Array.from({ length: 11 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <option key={year} value={year}>{year}</option>
                );
              })}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/20 rounded-full transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 bg-white/5 border-b border-white/10">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-xs font-bold text-gray-600 uppercase">
              {day}
            </div>
          ))}
        </div>
        <div>
          {renderCalendarGrid()}
        </div>
      </GlassCard>

      {/* Sidebar Details - Increased width to ~40% */}
      <GlassCard variant="opaque" className="w-[40%] border-l border-white/20 p-6 overflow-y-auto">
        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Filter View</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(CalendarFilter).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${filter === f ? 'bg-blue-600 text-white border-blue-600' : 'bg-white/10 text-gray-600 border-white/20 hover:bg-white/30'}`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>
        {renderSelectedDateDetails()}
      </GlassCard>
    </div>
  );
};

export default CalendarView;