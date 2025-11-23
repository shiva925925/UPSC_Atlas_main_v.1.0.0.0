import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { SUBJECT_COLORS } from '../constants';
import { Clock, BookOpen, Target, CheckSquare } from 'lucide-react';

const Dashboard: React.FC = () => {
  const tasks = useLiveQuery(() => db.tasks.toArray()) || [];
  const userProfile = useLiveQuery(() => db.userProfile.get('Schamala'));

  // Calculate aggregate stats from nested logs
  const allLogs = tasks.flatMap(t => t.logs || []);
  const totalMinutes = allLogs.reduce((acc, log) => acc + log.durationMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60);

  const completedTasks = tasks.filter(t => t.status === 'DONE').length;
  const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length;

  return (
    <div className="p-6 animate-fade-in">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Welcome back, {userProfile?.name || 'Aspirant'}!</h1>
        <p className="text-gray-600 mt-2">You've studied for <span className="font-bold text-blue-600">{totalHours} hours</span> total. Keep pushing!</p>
      </header>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
            <Clock size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Total Study Time</p>
            <h3 className="text-2xl font-bold text-gray-800">{totalHours}h</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 text-green-600 rounded-lg">
            <CheckSquare size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Tasks Completed</p>
            <h3 className="text-2xl font-bold text-gray-800">{completedTasks}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 text-yellow-600 rounded-lg">
            <BookOpen size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">In Progress</p>
            <h3 className="text-2xl font-bold text-gray-800">{inProgressTasks}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-lg">
            <Target size={24} />
          </div>
          <div>
            <p className="text-sm text-gray-500">Target Year</p>
            <h3 className="text-2xl font-bold text-gray-800">{userProfile?.targetYear || 2025}</h3>
          </div>
        </div>
      </div>

      {/* Recent Activity & Charts Placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Subject Distribution</h3>
          <div className="h-64 flex items-end justify-around gap-2">
            {/* Simple visual placeholder for chart */}
            {Object.entries(SUBJECT_COLORS).map(([subject, color]) => {
              const subjectLogs = allLogs.filter(l => l.subject === subject);
              const subjectMinutes = subjectLogs.reduce((acc, l) => acc + l.durationMinutes, 0);
              const height = totalMinutes > 0 ? (subjectMinutes / totalMinutes) * 100 : 0;

              if (height === 0) return null;

              return (
                <div key={subject} className="flex flex-col items-center gap-2 w-full">
                  <div
                    className="w-full max-w-[40px] rounded-t-md transition-all duration-500"
                    style={{ height: `${height}%`, backgroundColor: color, minHeight: '4px' }}
                  ></div>
                  <span className="text-[10px] text-gray-500 truncate w-full text-center">{subject.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Recent Logs</h3>
          <div className="space-y-4">
            {allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(log => (
              <div key={log.id} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: SUBJECT_COLORS[log.subject] }}></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{log.description}</p>
                  <p className="text-xs text-gray-500">{log.date} • {log.durationMinutes}m</p>
                </div>
              </div>
            ))}
            {allLogs.length === 0 && <p className="text-sm text-gray-400">No study time logged yet.</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;