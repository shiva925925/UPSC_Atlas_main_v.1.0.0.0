import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { MOCK_TASKS, MOCK_TIME_LOGS, SUBJECT_COLORS } from '../constants';
import { TaskStatus, Subject } from '../types';
import { CheckCircle2, Clock, Target, TrendingUp } from 'lucide-react';

const Dashboard: React.FC = () => {
  // Calculate Stats
  const completedTasks = MOCK_TASKS.filter(t => t.status === TaskStatus.DONE).length;
  const totalTasks = MOCK_TASKS.length;
  const completionRate = Math.round((completedTasks / totalTasks) * 100);
  
  const totalHours = Math.round(MOCK_TIME_LOGS.reduce((acc, log) => acc + log.durationMinutes, 0) / 60);
  
  // Data for Subject Distribution (Pie Chart)
  const subjectData = Object.values(Subject).map(subject => {
    const minutes = MOCK_TIME_LOGS
      .filter(log => log.subject === subject)
      .reduce((acc, log) => acc + log.durationMinutes, 0);
    return { name: subject, value: minutes };
  }).filter(d => d.value > 0);

  // Data for Activity (Bar Chart - Mocked for visual)
  const activityData = [
    { name: 'Mon', hours: 4 },
    { name: 'Tue', hours: 6 },
    { name: 'Wed', hours: 5.5 },
    { name: 'Thu', hours: 8 },
    { name: 'Fri', hours: 7 },
    { name: 'Sat', hours: 9 },
    { name: 'Sun', hours: 3 },
  ];

  return (
    <div className="p-4 md:p-8 space-y-8 animate-fade-in">
      <header className="mb-6 md:mb-8">
        <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
        <p className="text-gray-500">Overview of your preparation progress.</p>
      </header>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Tasks Completed</h3>
            <CheckCircle2 className="text-green-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{completedTasks}/{totalTasks}</div>
          <p className="text-xs text-green-600 mt-2 font-medium">{completionRate}% Completion Rate</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Hours Studied</h3>
            <Clock className="text-blue-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">{totalHours}h</div>
          <p className="text-xs text-gray-500 mt-2">Last 7 Days</p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Current Streak</h3>
            <TrendingUp className="text-orange-500" size={20} />
          </div>
          <div className="text-3xl font-bold text-gray-800">14 Days</div>
          <p className="text-xs text-orange-600 mt-2 font-medium">Keep it up!</p>
        </div>

         <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500">Focus Subject</h3>
            <Target className="text-purple-500" size={20} />
          </div>
          <div className="text-xl font-bold text-gray-800 truncate">Polity</div>
          <p className="text-xs text-gray-500 mt-2">Most time logged</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Subject Breakdown */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Subject Distribution (Time)</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={subjectData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {subjectData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={SUBJECT_COLORS[entry.name as Subject] || '#ccc'} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend layout="vertical" verticalAlign="middle" align="right" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Daily Study Hours</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip cursor={{fill: '#f4f5f7'}} />
                <Bar dataKey="hours" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;