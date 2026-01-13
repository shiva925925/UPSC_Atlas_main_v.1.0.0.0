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
          className={`border-b border-r border-card-border p-2 cursor-pointer transition-colors hover:bg-white/5 relative ${selectedDate === dateString ? 'bg-blue-500/10' : ''}`}
        >
          <div className="flex flex-col items-start w-full gap-1">
            <span className={`text-sm font-medium w-6 h-6 flex items-center justify-center rounded-full ${dateString === todayString ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/40' : 'text-text-main'}`}>
              {i}
            </span>
            {dayMeta?.heading && (
              <p className="text-[10px] font-bold text-blue-500 dark:text-blue-400 w-full break-words leading-tight mt-0.5">
                {dayMeta.heading}
              </p>
            )}
          </div>

          <div className="mt-1 flex flex-wrap gap-1 min-h-[1.5rem]">
            {dayTasks.slice(0, 3).map(task => (
              <div key={task.id} className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: CATEGORY_COLORS[SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL].hex }} title={task.title}></div>
            ))}
            {dayTasks.length > 3 && <span className="text-[9px] text-text-muted">+{dayTasks.length - 3}</span>}
            {dayLogs.length > 0 && <div className="w-2 h-2 rounded-full bg-text-muted/40" title={`${dayLogs.length} logs`}></div>}
          </div>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-7 auto-rows-fr border-l border-t border-card-border">
        {emptyDays.map((_, i) => <div key={`empty-${i}`} className="min-h-[50px] bg-text-main/5 border-b border-r border-card-border"></div>)}
        {days}
      </div>
    );
  };

  const renderSelectedDateDetails = () => {
    if (!selectedDate) return <p className="text-text-muted text-center mt-10">Select a date to view details.</p>;

    const dateTasks = tasks.filter(t => t.date === selectedDate);
    const dateLogs = allLogs.filter(l => l.date === selectedDate);
    const dayMeta = dayMetadataList.find(m => m.id === selectedDate);

    return (
      <div className="space-y-6">
        <div className="border-b border-card-border pb-4">
          <h3 className="text-lg font-bold text-text-main mb-2">
            {new Date(selectedDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </h3>

          {/* Day Heading Input */}
          <div>
            <label className="text-[10px] font-bold text-text-muted uppercase">Day Focus / Heading</label>
            <input
              type="text"
              placeholder="e.g. History Revision..."
              value={dayMeta?.heading || ''}
              onChange={(e) => handleUpdateHeading(selectedDate, e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 placeholder-blue-300/50"
            />
          </div>
        </div>

        {/* Tasks */}
        {(filter === CalendarFilter.ALL || filter === CalendarFilter.TASKS) && (
          <div>
            <h4 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Tasks</h4>
            {dateTasks.length === 0 ? <p className="text-xs text-text-muted italic">No tasks for this day.</p> : (
              <div className="space-y-2">
                {dateTasks.map(task => {
                  const subjectCategory = SUBJECT_HIERARCHY[task.subject] || SubjectCategory.GENERAL;
                  const colors = CATEGORY_COLORS[subjectCategory] || CATEGORY_COLORS[SubjectCategory.GENERAL];
                  return (
                    <div key={task.id} className="bg-card-bg/30 border border-card-border p-3 rounded-md shadow-sm">
                      <div className="flex justify-between items-start gap-2">
                        <h5 className="text-sm font-medium text-text-main leading-tight">{task.title}</h5>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full shrink-0 ${colors.background} ${colors.text}`}>{task.subject}</span>
                      </div>
                      <p className="text-xs text-text-muted mt-2 capitalize">{task.status.replace('_', ' ')}</p>
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
            <h4 className="text-xs font-bold text-text-muted mb-2 uppercase tracking-wider">Time Logs</h4>
            {dateLogs.length === 0 ? <p className="text-xs text-text-muted italic">No time logged.</p> : (
              <div className="space-y-2">
                {dateLogs.map(log => (
                  <div key={log.id} className="flex items-center justify-between text-sm bg-text-main/5 p-2 px-3 rounded border border-card-border/30">
                    <span className="text-text-main">{log.description}</span>
                    <span className="font-bold text-blue-600 dark:text-blue-400">{log.durationMinutes}m</span>
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
    <div className="flex h-full animate-fade-in gap-6 p-4 md:p-8 overflow-y-auto bg-app-bg transition-colors duration-300">
      {/* Calendar Grid */}
      <GlassCard variant="blur" className="flex-1 h-fit flex flex-col border-card-border">
        <div className="flex justify-between items-center mb-4 p-4 pb-0">
          <div className="flex items-center gap-2">
            <select
              value={currentDate.getMonth()}
              onChange={handleJumpToMonth}
              className="bg-transparent text-xl font-bold text-text-main outline-none cursor-pointer hover:bg-white/5 rounded px-1 transition-colors appearance-none"
            >
              {Array.from({ length: 12 }, (_, i) => (
                <option key={i} value={i} className="dark:bg-[#121212]">
                  {new Date(0, i).toLocaleString('default', { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              value={currentDate.getFullYear()}
              onChange={handleJumpToYear}
              className="bg-transparent text-xl font-bold text-text-main outline-none cursor-pointer hover:bg-white/5 rounded px-1 transition-colors appearance-none"
            >
              {Array.from({ length: 11 }, (_, i) => {
                const year = new Date().getFullYear() - 5 + i;
                return (
                  <option key={year} value={year} className="dark:bg-[#121212]">{year}</option>
                );
              })}
            </select>
          </div>

          <div className="flex gap-2">
            <button onClick={handlePrevMonth} className="p-1.5 hover:bg-white/10 text-text-main rounded-full transition-colors"><ChevronLeft size={18} /></button>
            <button onClick={handleNextMonth} className="p-1.5 hover:bg-white/10 text-text-main rounded-full transition-colors"><ChevronRight size={18} /></button>
          </div>
        </div>

        <div className="grid grid-cols-7 bg-text-main/5 border-b border-card-border">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="p-2 text-center text-[10px] font-black text-text-muted uppercase tracking-widest">
              {day}
            </div>
          ))}
        </div>
        <div>
          {renderCalendarGrid()}
        </div>
      </GlassCard>

      {/* Sidebar Details */}
      <GlassCard variant="opaque" className="w-[40%] border-card-border p-6 overflow-y-auto">
        <div className="mb-6">
          <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-2">Filter View</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(CalendarFilter).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1.5 rounded-full border transition-all ${filter === f ? 'bg-blue-600 text-white border-blue-600 shadow-lg shadow-blue-500/30' : 'bg-white/5 text-text-muted border-card-border hover:bg-white/10 hover:text-text-main'}`}
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